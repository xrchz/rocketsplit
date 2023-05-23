import { ethers } from "./node_modules/ethers/dist/ethers.js"

const fragment = document.createDocumentFragment()

const provider = new ethers.BrowserProvider(window.ethereum)
const network = await provider.getNetwork()
console.log(`Connected to ${network.name}`)
console.log(`Available accounts: ${await provider.listAccounts().then((a) => Promise.all(a.map((s) => s.getAddress()))).then((a) => JSON.stringify(a))}`)

/*
const abi = await fetch('RocketSplit.json').then((res) => res.json()).abi

const factory = new ethers.Contract(process.env.ADDRESS, abi, provider)
console.log(`Factory contract is ${await factory.getAddress()}`)
*/
