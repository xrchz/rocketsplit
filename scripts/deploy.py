import IPython
import sha3
from ape import networks, accounts, project, Contract

# Mainnet:
# acc = accounts.test_accounts
acc = accounts
rocketStorageAddress = '0x1d8f8f00cfa6758d7bE78336684788Fb0ee0Fa46'

# Goerli:
# rocketStorageAddress = '0xd8Cd47263414aFEca62d6e2a3917d6600abDceB3'
# acc = accounts

def main():
    max_fee = '2 gwei'
    max_priority_fee = '0.002 gwei'
    factory = project.RocketSplit.deploy(rocketStorageAddress, sender=acc[0],
                                         max_fee=max_fee, max_priority_fee=max_priority_fee)
    with open("ui/.env", "w") as f:
        f.write(f'RPC={networks.active_provider.web3.provider.endpoint_uri}\n')
        f.write(f'ADDRESS={factory.address}\n')
    with open("ui/RocketSplitAddress.json", "w") as f:
        f.write(f'"{factory.address}"\n')
    with open("ui/RocketStorageAddress.json", "w") as f:
        f.write(f'"{rocketStorageAddress}"\n')
    IPython.embed()
