import pytest
from datetime import datetime
from eth_utils import keccak
from ape import Contract

@pytest.fixture(scope='session')
def rocketStorage():
    return Contract('0x1d8f8f00cfa6758d7bE78336684788Fb0ee0Fa46')

@pytest.fixture(scope='session')
def rocketNodeManager(rocketStorage):
    return Contract(rocketStorage.getAddress(keccak('contract.addressrocketNodeManager'.encode())))

@pytest.fixture(scope='session')
def freshNode(accounts, rocketNodeManager):
    rocketNodeManager.registerNode('testZone', sender=accounts[0])
    return accounts[0]

@pytest.fixture(scope='session')
def freshETHOwner(accounts):
    return accounts[1]

@pytest.fixture(scope='session')
def freshRPLOwner(accounts, rocketStorage):
    owner = accounts[2]
    # buy some RPL
    Weth = Contract('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2')
    Weth.deposit(value='5 ETH', sender=owner)
    Rpl = Contract(rocketStorage.getAddress(keccak('contract.addressrocketTokenRPL'.encode())))
    uniswapRouter = Contract('0xE592427A0AEce92De3Edee1F18E0157C05861564')
    Weth.approve(uniswapRouter.address, '5 ETH', sender=owner)
    uniswapRouter.exactInputSingle((
        Weth.address,
        Rpl.address,
        3000,
        owner.address,
        int(datetime.now().timestamp()) + 1800,
        '5 ETH',
        0,
        0), sender=owner)
    assert Rpl.balanceOf(owner) > 10**18, "no RPL received"
    return owner

@pytest.fixture(scope='session')
def existingNode(accounts):
    return accounts.at('0xa4186193281f7727C070766ba60B63Df74eA4Da1') # rpl.ramana.eth

@pytest.fixture(scope='session')
def deployer(accounts):
    return accounts[5]

@pytest.fixture(scope='session')
def rocketsplitFactory(project, rocketStorage, deployer):
    return project.RocketSplit.deploy(rocketStorage.address, sender=deployer)

def test_create_marriage(rocketStorage, freshNode, freshRPLOwner, freshETHOwner, rocketsplitFactory):
    ETHFee = (5, 100)
    RPLFee = (10, 100)
    receipt = rocketsplitFactory.deploy(freshNode.address, freshETHOwner.address, freshRPLOwner.address, ETHFee, RPLFee, sender=freshETHOwner)
    marriage = Contract(receipt.return_value)
    rocketStorage.setWithdrawalAddress(freshNode.address, marriage.address, False, sender=freshNode)
    marriage.confirmWithdrawalAddress(sender=freshETHOwner)

# @pytest.fixture(scope='function')
# def freshMarriage(rocketsplitFactory, node, withdrawalAddress, accounts):
#     return rocketsplit.deploy(node,
#            withdrawalAddress, accounts[0],
#             {'numerator': 100, 'denominator': 100}, {'numerator': 100, 'denominator': 100}, sender=withdrawalAddress).return_value
#
#
# def test_create_factory(ethWhale, marriage, withdrawalAddress, project, accounts):
#     # Send a bunch of ETH to the marriage contract.
#     ethWhale.transfer(marriage, '100 ether')
#
#     wallet = project.RocketSplit.at(marriage)
#
#     # Get the balance of the marriage contract.
#     assert wallet.ETHOwner() == withdrawalAddress # dev: ETH Owner is not the withdrawal address.
#     assert wallet.RPLOwner() == accounts[0] # dev: RPL Owner is not the first account.
#     assert wallet.balance == 100000000000000000000 # dev: Balance is not 100 ether.
#
#     # Lets withdrawal the ETH and test the distribution.
#     wallet.withdrawRPL(sender=accounts[0])
#
#     # assert wallet.balance == 0 # dev: Balance is not 0 ether.
#
