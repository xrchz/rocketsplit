import { ethers } from "./node_modules/ethers/dist/ethers.js"

const fragment = document.createDocumentFragment()

const provider = new ethers.BrowserProvider(window.ethereum)
const network = await provider.getNetwork()
console.log(`Connected to ${network.name}`)
const abi = await fetch('RocketSplit.json').then(res => res.json()).then(j => j.abi)
const factory = new ethers.Contract(await fetch('RocketSplitAddress.json').then(res => res.json()), abi, provider)
console.log(`Factory contract is ${await factory.getAddress()}`)
let signer

const rocketStorage = new ethers.Contract(
  await fetch('RocketStorageAddress.json').then(res => res.json()),
  ['function getAddress(bytes32 key) view returns (address)'],
  provider)
const rocketNodeManager = new ethers.Contract(
  await rocketStorage['getAddress(bytes32)'](ethers.id('contract.addressrocketNodeManager')),
  ['function getNodeExists(address _nodeAddress) view returns (bool)'],
  provider)

const walletSection = document.createElement('section')
const signerLabel = walletSection.appendChild(document.createElement('label'))
signerLabel.classList.add('address')
signerLabel.innerText = 'Connected account: '
const signerInput = signerLabel.appendChild(document.createElement('input'))
signerInput.type = 'text'
signerInput.setAttribute('readonly', true)
signerInput.placeholder = 'none'

async function signerConnected() {
  signerInput.value = ''
  signer = await provider.getSigner()
  if (signer)
    signerInput.value = await signer.getAddress()
}

window.ethereum.on('connect', signerConnected)
window.ethereum.on('accountsChanged', signerConnected)

await window.ethereum.send('eth_requestAccounts')

await signerConnected()

const addressPattern = '^(?:0x[0-9a-fA-F]{40})|(?:.{3,}\.eth)$'

const createSection = document.createElement('section')
createSection.appendChild(document.createElement('h2')).innerText = 'Create New Marriage Contract'
const description = createSection.appendChild(document.createElement('p'))
description.innerText = 'Information about what this form does should go here. Note the ETH Owner is also the Node Operator.'

const createInputsDiv = createSection.appendChild(document.createElement('div'))
createInputsDiv.classList.add('inputs')

const button = document.createElement('input')
button.type = 'button'
button.value = 'Deploy Contract'
button.disabled = true

function canSubmit() {
  const addresses = Array.from(
    createInputsDiv.querySelectorAll('.address > input')
  ).every(a => a.value && a.checkValidity())
  const fees = Array.from(
    createInputsDiv.querySelectorAll('.fraction')
  ).every(s => s.innerText)
  return addresses && fees
}

function makeOnChangeAddress(addressInput, ensName) {
  async function onChangeAddress() {
    addressInput.setCustomValidity('')
    ensName.innerText = ''
    if (addressInput.checkValidity()) {
      if (addressInput.value.endsWith('.eth')) {
        const resolvedAddress = await provider.resolveName(addressInput.value)
        if (!resolvedAddress) {
          addressInput.setCustomValidity(`Could not resolve ENS name ${addressInput.value}`)
        }
        else {
          ensName.innerText = addressInput.value
          addressInput.value = resolvedAddress
        }
      }
      else if (addressInput.value) {
        const foundName = await provider.lookupAddress(addressInput.value)
        if (foundName)
          ensName.innerText = foundName
      }
    }
    addressInput.reportValidity()
    button.disabled = !canSubmit()
  }
  return onChangeAddress
}

function addInputs(asset) {
  const div = createInputsDiv.appendChild(document.createElement('div'))
  const addressLabel = div.appendChild(document.createElement('label'))
  addressLabel.innerText = `${asset} Owner`
  addressLabel.classList.add('address')
  const addressInput = addressLabel.appendChild(document.createElement('input'))
  addressInput.type = 'text'
  addressInput.pattern = addressPattern
  const ensName = addressLabel.appendChild(document.createElement('span'))
  ensName.classList.add('ens')
  const feeNLabel = div.appendChild(document.createElement('label'))
  feeNLabel.innerText = `${asset} Fee Numerator`
  feeNLabel.classList.add('fee')
  const feeNInput = feeNLabel.appendChild(document.createElement('input'))
  feeNInput.type = 'number'
  feeNInput.min = 0
  const feeDLabel = div.appendChild(document.createElement('label'))
  feeDLabel.innerText = `${asset} Fee Denominator`
  feeDLabel.classList.add('fee')
  const feeDInput = feeDLabel.appendChild(document.createElement('input'))
  feeDInput.type = 'number'
  feeDInput.min = 1
  const feeFraction = div.appendChild(document.createElement('span'))
  feeFraction.innerText = ''
  feeFraction.classList.add('fraction')
  addressInput.addEventListener('change', makeOnChangeAddress(addressInput, ensName))
  function updateFees() {
    feeNInput.max = feeDInput.value
    feeFraction.innerText = ''
    if (feeNInput.checkValidity() && feeDInput.checkValidity()) {
      if (!feeNInput.value) feeNInput.value = 0
      if (!feeDInput.value) feeDInput.value = feeNInput.value || 1
      const num = feeNInput.valueAsNumber
      const den = feeDInput.valueAsNumber
      feeFraction.innerText = `${num}/${den} ≈ ${(100*num/den).toPrecision(3)}%`
    }
    feeDInput.reportValidity()
    feeNInput.reportValidity()
    button.disabled = !canSubmit()
  }
  feeNInput.addEventListener('change', updateFees)
  feeDInput.addEventListener('change', updateFees)
}

const nodeLabel = createInputsDiv.appendChild(document.createElement('label'))
nodeLabel.innerText = 'Node address'
nodeLabel.classList.add('address')
const nodeInput = nodeLabel.appendChild(document.createElement('input'))
nodeInput.type = 'text'
nodeInput.pattern = addressPattern
const nodeEns = nodeLabel.appendChild(document.createElement('span'))
nodeEns.classList.add('ens')
const onChangeNode = makeOnChangeAddress(nodeInput, nodeEns)
nodeInput.addEventListener('change', async () => {
  await onChangeNode()
  if (nodeInput.checkValidity() && nodeInput.value) {
    if (!(await rocketNodeManager.getNodeExists(nodeInput.value))) {
      nodeInput.setCustomValidity('Node address not registered with Rocket Pool')
      nodeInput.reportValidity()
      button.disabled = true
    }
  }
})
addInputs('ETH')
addInputs('RPL')
createInputsDiv.appendChild(button)
button.addEventListener('click', async () => {
  // TODO: await factory.connect(signer).deploy()
})

const changeSection = document.createElement('section')
changeSection.appendChild(document.createElement('h2')).innerText = 'View/Use Marriage Contract'

const body = document.querySelector('body')
body.appendChild(walletSection)
body.appendChild(createSection)
body.appendChild(changeSection)
