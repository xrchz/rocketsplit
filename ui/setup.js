import { ethers } from 'ethers'
const provider = new ethers.JsonRpcProvider('http://localhost:8549')
const network = await provider.getNetwork()
console.log(`Connected to ${network.name}`)
const rocketStorageAddress = '0x1d8f8f00cfa6758d7bE78336684788Fb0ee0Fa46'
const rocketStorage = new ethers.Contract(rocketStorageAddress,
  ['function getAddress(bytes32 key) view returns (address)'],
  provider)
const rocketNodeManager = new ethers.Contract(
  await rocketStorage['getAddress(bytes32)'](ethers.id('contract.addressrocketNodeManager')),
  ['function registerNode(string _timezoneLocation)'],
  provider)
console.log(`Node manager: ${await rocketNodeManager.getAddress()}`)
const testAccountKey = '0xdd23ca549a97cb330b011aebb674730df8b14acaee42d211ab45692699ab8ba5'
const signer = new ethers.Wallet(testAccountKey).connect(provider)
const response = await rocketNodeManager.connect(signer).registerNode('Etc/UTC')
console.log(`Awaiting ${response.hash}`)
await response.wait()
console.log(`Done`)
