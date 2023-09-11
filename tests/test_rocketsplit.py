import pytest

from ape.logging import logger, LogLevel
from ape import accounts, project

@pytest.fixture
def node(accounts):
    return accounts['0xfd0166b400EAD071590F949c6760d1cCc1AfC967']

@pytest.fixture
def withdrawalAddress(accounts):
    return accounts['0x31844DC946FB42a29e26396B31b4Db04913888ED']

@pytest.fixture
def ethWhale(accounts):
    return accounts['0x9e927c02C9eadAE63f5EFb0Dd818943c7262Fb8e']

@pytest.fixture
def rocketsplit(project, withdrawalAddress):
    return project.RocketSplit.deploy('0x1d8f8f00cfa6758d7bE78336684788Fb0ee0Fa46', sender=withdrawalAddress)

@pytest.fixture
def marriage(rocketsplit, node, withdrawalAddress, accounts):
    return rocketsplit.deploy(node,
           withdrawalAddress, accounts[0],
            {'numerator': 100, 'denominator': 100}, {'numerator': 100, 'denominator': 100}, sender=withdrawalAddress).return_value


def test_add():
    assert 1 + 1 == 2

def test_create_factory(ethWhale, marriage, withdrawalAddress, project, accounts):
    # logger.set_level(100)
   
    # Send a bunch of ETH to the marriage contract.
    ethWhale.transfer(marriage, '100 ether')

    wallet = project.RocketSplit.at(marriage)

    # Get the balance of the marriage contract.
    assert wallet.ETHOwner() == withdrawalAddress # dev: ETH Owner is not the withdrawal address.
    assert wallet.RPLOwner() == accounts[0] # dev: RPL Owner is not the first account.
    assert wallet.balance == 100000000000000000000 # dev: Balance is not 100 ether.

    # Lets withdrawal the ETH and test the distribution.
    wallet.withdrawRPL(sender=accounts[0])

    # assert wallet.balance == 0 # dev: Balance is not 0 ether.

