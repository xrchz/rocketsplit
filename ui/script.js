import { ethers } from "./node_modules/ethers/dist/ethers.js"

const fragment = document.createDocumentFragment()

const provider = new ethers.BrowserProvider(window.ethereum)
const network = await provider.getNetwork()
console.log(`Connected to ${network.name}`)
console.log(`Available accounts: ${await provider.listAccounts().then((a) => Promise.all(a.map((s) => s.getAddress()))).then((a) => JSON.stringify(a))}`)
const abi = await fetch('RocketSplit.json').then(res => res.json()).then(j => j.abi)
const factory = new ethers.Contract(await fetch('RocketSplitAddress.json').then(res => res.json()), abi, provider)
console.log(`Factory contract is ${await factory.getAddress()}`)

const addressPattern = '(?:0x[0-9a-fA-F]{20})|(?:.{3,}\.eth)'

const createSection = document.createElement('section')
createSection.appendChild(document.createElement('h2')).innerText = 'Create New Marriage Contract'
const description = createSection.appendChild(document.createElement('p'))
description.innerText = 'Information about what this form does should go here. Note the ETH Owner is also the Node Operator.'

function addAddressInput(asset) {
  const addressLabel = createSection.appendChild(document.createElement('label'))
  addressLabel.innerText = `${asset} Owner`
  addressLabel.classList.add('address')
  const addressInput = addressLabel.appendChild(document.createElement('input'))
  addressInput.id = `${asset}OwnerInput`
  addressInput.type = 'text'
  addressInput.pattern = addressPattern
  const ensName = addressLabel.appendChild(document.createElement('span'))
  ensName.id = `${asset}OwnerENS`
  ensName.classList.add('ens')
}

addAddressInput('ETH')
addAddressInput('RPL')

const changeSection = document.createElement('section')
changeSection.appendChild(document.createElement('h2')).innerText = 'View/Use Marriage Contract'

const body = document.querySelector('body')
body.appendChild(createSection)
body.appendChild(changeSection)
