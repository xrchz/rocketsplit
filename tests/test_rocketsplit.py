import pytest
from datetime import datetime
from eth_utils import keccak
from ape import Contract, reverts

NULL_ADDRESS = '0x0000000000000000000000000000000000000000'

@pytest.fixture(scope='session')
def rocketStorage():
    return Contract('0x1d8f8f00cfa6758d7bE78336684788Fb0ee0Fa46')

@pytest.fixture(scope='session')
def rocketNodeManager(rocketStorage):
    return Contract(rocketStorage.getAddress(keccak('contract.addressrocketNodeManager'.encode())))

@pytest.fixture(scope='session')
def RPLToken(rocketStorage):
    return Contract(rocketStorage.getAddress(keccak('contract.addressrocketTokenRPL'.encode())))

@pytest.fixture(scope='session')
def freshNode(accounts, rocketNodeManager):
    rocketNodeManager.registerNode('testZone', sender=accounts[0])
    return accounts[0]

@pytest.fixture(scope='session')
def freshAccount(accounts):
    return accounts[7]

@pytest.fixture(scope='session')
def coldAccount(accounts):
    return accounts[8]

@pytest.fixture(scope='session')
def ETHOwner(accounts):
    return accounts[1]

@pytest.fixture(scope='session')
def RPLOwner(accounts, rocketStorage, RPLToken):
    owner = accounts[2]
    # buy some RPL
    Weth = Contract('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2')
    Weth.deposit(value='5 ETH', sender=owner)
    uniswapRouter = Contract('0xE592427A0AEce92De3Edee1F18E0157C05861564')
    Weth.approve(uniswapRouter.address, '5 ETH', sender=owner)
    uniswapRouter.exactInputSingle((
        Weth.address,
        RPLToken.address,
        3000,
        owner.address,
        int(datetime.now().timestamp()) + 1800,
        '5 ETH',
        0,
        0), sender=owner)
    assert RPLToken.balanceOf(owner) > 10**18, "no RPL received"
    return owner

@pytest.fixture(scope='session')
def existingNode(accounts):
    return accounts['0xa4186193281f7727C070766ba60B63Df74eA4Da1'] # rpl.ramana.eth

@pytest.fixture(scope='session')
def deployer(accounts):
    return accounts[5]

@pytest.fixture()
def rocketsplitFactory(project, accounts, rocketStorage, deployer):
    factory = project.RocketSplit.deploy(rocketStorage.address, sender=deployer)
    Registry = Contract('0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e')
    namehash = project.provider.web3.ens.namehash
    name = 'rocketsplit.eth'
    name_id = namehash(name)
    NameWrapper = Contract(Registry.owner(name_id))
    name_owner_address = NameWrapper.ownerOf(name_id)
    name_owner = accounts[name_owner_address]
    # send name owner some ETH for gas
    deployer.transfer(name_owner, '0.1 ETH')
    name_resolver = Registry.resolver(name_id)
    Resolver = Contract(name_resolver)
    name_ttl = Registry.ttl(name_id)
    Resolver.setAddr(name_id, factory.address, sender=name_owner)
    NameWrapper.setRecord(name_id, factory.address, name_resolver, name_ttl, sender=name_owner)
    factory.ensSetName(name, sender=deployer)
    RevRegistry = Contract(Registry.owner(namehash('addr.reverse')))
    factory_id = RevRegistry.node(factory.address)
    assert Resolver.addr(name_id) == factory.address, "failed to set factory ens"
    assert NameWrapper.ownerOf(name_id) == factory.address, "failed to set factory wrapped ens"
    assert Contract(Registry.resolver(factory_id)).name(factory_id) == name, "failed to set factory reverse record"
    return factory

@pytest.fixture()
def freshMarriageUnconfirmed(rocketsplitFactory, freshNode, RPLOwner, ETHOwner):
    ETHFee = (5, 100)
    RPLFee = (10, 100)
    receipt = rocketsplitFactory.invoke_transaction(
            'deploy', freshNode.address, ETHOwner.address, RPLOwner.address,
            ETHFee, RPLFee, False, sender=ETHOwner)
    return Contract(receipt.return_value)

def test_confirm_withdrawal_address_unset(freshMarriageUnconfirmed, ETHOwner):
    with reverts('Confirmation must come from the pending withdrawal address'):
        freshMarriageUnconfirmed.confirmWithdrawalAddress(sender=ETHOwner)

def test_confirm_withdrawal_address_anyone(freshMarriageUnconfirmed, rocketStorage, freshNode, freshAccount):
    rocketStorage.setWithdrawalAddress(freshNode.address, freshMarriageUnconfirmed.address, False, sender=freshNode)
    freshMarriageUnconfirmed.confirmWithdrawalAddress(sender=freshAccount)
    assert rocketStorage.getNodeWithdrawalAddress(freshNode.address) == freshMarriageUnconfirmed.address, "failed to set withdrawal address"

@pytest.fixture()
def freshMarriage(freshMarriageUnconfirmed, freshNode, ETHOwner, rocketStorage):
    rocketStorage.setWithdrawalAddress(freshNode.address, freshMarriageUnconfirmed.address, False, sender=freshNode)
    freshMarriageUnconfirmed.confirmWithdrawalAddress(sender=ETHOwner)
    return freshMarriageUnconfirmed

@pytest.fixture()
def ETHOwnerNode(ETHOwner, rocketNodeManager):
    rocketNodeManager.registerNode('ETHZone', sender=ETHOwner)
    return ETHOwner

@pytest.fixture()
def marriageETHFeeOnly(rocketStorage, rocketsplitFactory, RPLOwner, ETHOwnerNode):
    ETHFee = (10, 100)
    RPLFee = (0, 1)
    receipt = rocketsplitFactory.invoke_transaction(
            'deploy', ETHOwnerNode.address, ETHOwnerNode.address, RPLOwner.address,
            ETHFee, RPLFee, True, sender=ETHOwnerNode)
    rocketSplit = Contract(receipt.return_value)
    rocketStorage.setWithdrawalAddress(ETHOwnerNode.address, rocketSplit.address, False, sender=ETHOwnerNode)
    rocketSplit.confirmWithdrawalAddress(sender=ETHOwnerNode)
    return rocketSplit

@pytest.fixture()
def migratedMarriageUnconfirmed(rocketsplitFactory, existingNode, RPLOwner, ETHOwner):
    ETHFee = (0, 1)
    RPLFee = (1, 5)
    receipt = rocketsplitFactory.invoke_transaction(
            'deploy', existingNode.address, ETHOwner.address, RPLOwner.address,
            ETHFee, RPLFee, True, sender=RPLOwner)
    return Contract(receipt.return_value)

@pytest.fixture()
def migratedMarriage(rocketStorage, accounts, migratedMarriageUnconfirmed, existingNode, ETHOwner, RPLOwner):
    existingWithdrawalAddress = rocketStorage.getNodeWithdrawalAddress(existingNode.address)
    existingWithdrawer = accounts[existingWithdrawalAddress]
    # send some ETH to existingWithdrawer for gas
    accounts[5].transfer(existingWithdrawer, '0.1 ETH')
    rocketStorage.setWithdrawalAddress(existingNode.address, migratedMarriageUnconfirmed.address, False, sender=existingWithdrawer)
    migratedMarriageUnconfirmed.confirmWithdrawalAddress(sender=RPLOwner)
    assert rocketStorage.getNodeWithdrawalAddress(existingNode.address) == migratedMarriageUnconfirmed.address, "failed to set withdrawal address"
    return migratedMarriageUnconfirmed

def test_withdraw_no_ETH_fresh(freshMarriage, RPLOwner, ETHOwner):
    with reverts('auth'):
        freshMarriage.withdrawETH(sender=RPLOwner)
    prev1 = freshMarriage.balance
    prev2 = ETHOwner.balance
    receipt = freshMarriage.withdrawETH(sender=ETHOwner)
    assert freshMarriage.balance == prev1
    assert ETHOwner.balance == prev2 - receipt.total_fees_paid

def test_create_marriage(freshMarriage):
    pass

def test_cannot_just_withdraw_eth(migratedMarriage, ETHOwner):
    with reverts('stake'):
        migratedMarriage.withdrawETH(sender=ETHOwner)

def test_anyone_cannot_withdraw_eth(migratedMarriage, RPLOwner, freshAccount):
    with reverts('auth'):
        migratedMarriage.withdrawETH(sender=RPLOwner)
    with reverts('auth'):
        migratedMarriage.withdrawETH(sender=freshAccount)

def test_anyone_cannot_change_withdrawal_address(freshMarriage, freshNode, freshAccount):
    with reverts('auth'):
        freshMarriage.changeWithdrawalAddress(freshAccount.address, False, sender=freshAccount)
    with reverts('auth'):
        freshMarriage.changeWithdrawalAddress(freshAccount.address, True, sender=freshAccount)
    with reverts('auth'):
        freshMarriage.changeWithdrawalAddress(freshNode.address, True, sender=freshAccount)

@pytest.fixture()
def coldPendingWithdrawalSet(freshMarriage, ETHOwner, coldAccount):
    freshMarriage.changeWithdrawalAddress(coldAccount.address, False, sender=ETHOwner)
    return freshMarriage

def test_confirm_wrong_withdrawal_address(coldPendingWithdrawalSet, coldAccount, freshAccount, RPLOwner):
    with reverts('pendingWithdrawalAddress'):
        coldPendingWithdrawalSet.confirmChangeWithdrawalAddress(freshAccount.address, False, sender=RPLOwner)
    with reverts('pendingForce'):
        coldPendingWithdrawalSet.confirmChangeWithdrawalAddress(coldAccount.address, True, sender=RPLOwner)
    with reverts('auth'):
        coldPendingWithdrawalSet.confirmChangeWithdrawalAddress(coldAccount.address, False, sender=freshAccount)

def test_change_withdrawal_address(rocketStorage, freshNode, coldPendingWithdrawalSet, coldAccount, RPLOwner):
    assert rocketStorage.getNodeWithdrawalAddress(freshNode.address) == coldPendingWithdrawalSet.address
    coldPendingWithdrawalSet.confirmChangeWithdrawalAddress(coldAccount.address, False, sender=RPLOwner)
    assert rocketStorage.getNodeWithdrawalAddress(freshNode.address) == coldPendingWithdrawalSet.address
    rocketStorage.confirmWithdrawalAddress(freshNode.address, sender=coldAccount)
    assert rocketStorage.getNodeWithdrawalAddress(freshNode.address) == coldAccount.address

def test_withdraw_rewards(marriageETHFeeOnly, RPLOwner, ETHOwnerNode, freshAccount, RPLToken):
    assert marriageETHFeeOnly.balance == 0
    # do ETH via fee distributor to avoid external payment not allowed error
    # note: fee distributor does an even split when there are no minipools
    ethRewardAmount = 2 * 10 ** 17
    freshAccount.transfer(marriageETHFeeOnly.distributor(), ethRewardAmount)
    myPortion = ethRewardAmount // 2
    marriageETHFeeOnly.claimDistributorRewards(sender=ETHOwnerNode) # TODO: test wrong caller
    RPLToken.transfer(marriageETHFeeOnly, '5 ETH', sender=RPLOwner)
    assert RPLToken.balanceOf(marriageETHFeeOnly) == 5 * 10 ** 18
    assert marriageETHFeeOnly.balance == myPortion
    # TODO call withdrawRewards
    # TODO check bad and good auth
    # TODO check balances (and fee)
    pass
