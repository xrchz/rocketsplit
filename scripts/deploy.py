import IPython
import sha3
from ape import networks, accounts, project, Contract

acc = accounts.test_accounts

rocketStorageAddress = '0x1d8f8f00cfa6758d7bE78336684788Fb0ee0Fa46'

def setUpNode():
    rocketStorage = Contract(rocketStorageAddress)
    rocketNodeManager = Contract(rocketStorage.getAddress(sha3.keccak_256(b'contract.addressrocketNodManager').hexdigest()))
    rocketNodeManager.registerNode('Etc/UTC', sender=acc[0])

def main():
    # setUpNode() TODO: does not work for some reason. use setup.js instead.
    factory = project.RocketSplit.deploy(rocketStorageAddress, sender=acc[0])
    with open("ui/.env", "w") as f:
        f.write(f'RPC={networks.active_provider.web3.provider.endpoint_uri}\n')
        f.write(f'ADDRESS={factory.address}\n')
    with open("ui/RocketSplitAddress.json", "w") as f:
        f.write(f'"{factory.address}"\n')
    with open("ui/RocketStorageAddress.json", "w") as f:
        f.write(f'"{rocketStorageAddress}"\n')
    IPython.embed()
