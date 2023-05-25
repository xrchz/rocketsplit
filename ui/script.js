import { ethers } from "./node_modules/ethers/dist/ethers.js"

const fragment = document.createDocumentFragment()

const provider = new ethers.BrowserProvider(window.ethereum)
const network = await provider.getNetwork()
console.log(`Connected to ${network.name}`)
console.log(`Available accounts: ${await provider.listAccounts().then((a) => Promise.all(a.map((s) => s.getAddress()))).then((a) => JSON.stringify(a))}`)
const abi = await fetch('RocketSplit.json').then(res => res.json()).then(j => j.abi)
const factory = new ethers.Contract(await fetch('RocketSplitAddress.json').then(res => res.json()), abi, provider)
console.log(`Factory contract is ${await factory.getAddress()}`)

const addressPattern = '^(?:0x[0-9a-fA-F]{40})|(?:.{3,}\.eth)$'

const createSection = document.createElement('section')
createSection.appendChild(document.createElement('h2')).innerText = 'Create New Marriage Contract'
const description = createSection.appendChild(document.createElement('p'))
description.innerText = 'Information about what this form does should go here. Note the ETH Owner is also the Node Operator.'

const createInputsDiv = createSection.appendChild(document.createElement('div'))
createInputsDiv.classList.add('inputs')

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
  addressInput.addEventListener('change', async () => {
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
  })
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
  feeFraction.innerText = '0'
  function updateFees() {
    feeNInput.max = feeDInput.value
    feeFraction.innerText = '0'
    if (feeNInput.checkValidity() && feeDInput.checkValidity()) {
      if (!feeNInput.value) feeNInput.value = 0
      if (!feeDInput.value) feeDInput.value = feeNInput.value || 1
      const num = feeNInput.valueAsNumber
      const den = feeDInput.valueAsNumber
      feeFraction.innerText = `${num}/${den} ≈ ${(100*num/den).toPrecision(3)}%`
    }
    feeDInput.reportValidity()
    feeNInput.reportValidity()
  }
  feeNInput.addEventListener('change', updateFees)
  feeDInput.addEventListener('change', updateFees)
}

addInputs('ETH')
addInputs('RPL')
const button = createInputsDiv.appendChild(document.createElement('input'))
button.type = 'button'
button.value = 'Deploy Contract'

const changeSection = document.createElement('section')
changeSection.appendChild(document.createElement('h2')).innerText = 'View/Use Marriage Contract'

const body = document.querySelector('body')
body.appendChild(createSection)
body.appendChild(changeSection)
