import { ethers } from "./node_modules/ethers/dist/ethers.js"

const body = document.querySelector('body')

const emptyAddress = `0x${'0'.repeat(40)}`
const provider = new ethers.BrowserProvider(window.ethereum)
const network = await provider.getNetwork()
console.log(`Connected to ${network.name}`)
const abi = await fetch('RocketSplit.json').then(res => res.json()).then(j => j.abi)
const factory = new ethers.Contract(await fetch('RocketSplitAddress.json').then(res => res.json()), abi, provider)
console.log(`Factory contract is ${await factory.getAddress()}`)
const deployFragment = factory.getEvent('DeployRocketSplit').fragment
const deployFilter = factory.filters.DeployRocketSplit
let signer


const rocketStorage = new ethers.Contract(
  await fetch('RocketStorageAddress.json').then(res => res.json()),
  ['function getAddress(bytes32 key) view returns (address)'],
  provider)
const rocketNodeManager = new ethers.Contract(
  await rocketStorage['getAddress(bytes32)'](ethers.id('contract.addressrocketNodeManager')),
  ['function getNodeExists(address _nodeAddress) view returns (bool)',
   'function getNodeWithdrawalAddress(address _nodeAddress) view returns (address)',
   'function getNodePendingWithdrawalAddress(address _nodeAddress) view returns (address)'],
  provider)

const walletSection = document.createElement('section')
const nodeDiv = walletSection.appendChild(document.createElement('div'))
nodeDiv.classList.add('inputs')

const signerLabel = nodeDiv.appendChild(document.createElement('label'))
signerLabel.classList.add('address')
signerLabel.innerText = 'Connected account'
const signerInput = signerLabel.appendChild(document.createElement('input'))
signerInput.type = 'text'
signerInput.setAttribute('readonly', true)
signerInput.placeholder = 'none'
const signerEns = signerLabel.appendChild(document.createElement('span'))
signerEns.classList.add('ens')

async function signerConnected() {
  signerInput.value = ''
  signerEns.innerText = ''
  signer = await provider.getSigner()
  if (signer) {
    signerInput.value = await signer.getAddress()
    if (signerInput.value) {
      const foundName = await provider.lookupAddress(signerInput.value)
      if (foundName)
        signerEns.innerText = foundName
    }
  }
}

window.ethereum.on('connect', signerConnected)
window.ethereum.on('accountsChanged', signerConnected)

try {
  await window.ethereum.send('eth_requestAccounts')
}
catch (e) {
  body.appendChild(document.createElement('p')).innerText = e.message
}

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
  return addresses && fees && signer
}

function makeOnChangeAddress(addressInput, ensName) {
  async function onChangeAddress() {
    addressInput.setCustomValidity('')
    ensName.innerText = ''
    if (addressInput.checkValidity()) {
      if (addressInput.value.endsWith('.eth')) {
        const resolvedAddress = await provider.resolveName(addressInput.value).catch(error => null)
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
  addressInput.id = `${asset}Owner`
  addressInput.type = 'text'
  addressInput.pattern = addressPattern
  const ensName = addressLabel.appendChild(document.createElement('span'))
  ensName.classList.add('ens')
  const feeNLabel = div.appendChild(document.createElement('label'))
  feeNLabel.innerText = `${asset} Fee Numerator`
  feeNLabel.classList.add('fee')
  const feeNInput = feeNLabel.appendChild(document.createElement('input'))
  feeNInput.id = `${asset}FeeN`
  feeNInput.type = 'number'
  feeNInput.min = 0
  const feeDLabel = div.appendChild(document.createElement('label'))
  feeDLabel.innerText = `${asset} Fee Denominator`
  feeDLabel.classList.add('fee')
  const feeDInput = feeDLabel.appendChild(document.createElement('input'))
  feeDInput.id = `${asset}FeeD`
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

const nodeLabel = nodeDiv.appendChild(document.createElement('label'))
nodeLabel.innerText = 'Node address'
nodeLabel.classList.add('address')
const nodeInput = nodeLabel.appendChild(document.createElement('input'))
nodeInput.type = 'text'
nodeInput.pattern = addressPattern
const nodeEns = nodeLabel.appendChild(document.createElement('span'))
nodeEns.classList.add('ens')
const onChangeNode = makeOnChangeAddress(nodeInput, nodeEns)
addInputs('ETH')
addInputs('RPL')
createInputsDiv.appendChild(button)
const resultP = createSection.appendChild(document.createElement('p'))
const deployFunction = factory.interface.getFunction('deploy').format()
button.addEventListener('click', async () => {
  button.disabled = true
  resultP.innerText = ''
  try {
    const response = await factory.connect(signer)[deployFunction](
      nodeInput.value,
      document.getElementById('ETHOwner').value,
      document.getElementById('RPLOwner').value,
      [document.getElementById('ETHFeeN').value, document.getElementById('ETHFeeD').value],
      [document.getElementById('RPLFeeN').value, document.getElementById('RPLFeeD').value])
    resultP.innerText = `Transaction ${response.hash} submitted!`
    const receipt = await response.wait()
    resultP.innerText = `Transaction ${receipt.hash} included in block ${receipt.blockNumber}!`
  }
  catch (e) {
    resultP.innerText = e.message
    button.disabled = !canSubmit()
  }
})

const changeSection = document.createElement('section')
changeSection.appendChild(document.createElement('h2')).innerText = 'View/Use Marriage Contract'
const changeInputsDiv = changeSection.appendChild(document.createElement('div'))
changeInputsDiv.classList.add('inputs')

function addWithdrawalDisplay(label) {
  const withdrawalLabel = changeInputsDiv.appendChild(document.createElement('label'))
  withdrawalLabel.classList.add('address')
  withdrawalLabel.innerText = label
  const withdrawalInput = withdrawalLabel.appendChild(document.createElement('input'))
  withdrawalInput.type = 'text'
  withdrawalInput.setAttribute('readonly', true)
  withdrawalInput.placeholder = 'none'
  const withdrawalEns = withdrawalLabel.appendChild(document.createElement('span'))
  withdrawalEns.classList.add('ens')
  const withdrawalRocketSplit = withdrawalLabel.appendChild(document.createElement('span'))
  async function withdrawalChanged(withdrawalAddress) {
    withdrawalInput.value = withdrawalAddress
    withdrawalEns.innerText = ''
    withdrawalRocketSplit.classList.remove('rocketSplit')
    withdrawalRocketSplit.classList.remove('notRocketSplit')
    if (withdrawalAddress) {
      const foundName = await provider.lookupAddress(withdrawalAddress)
      if (foundName)
        withdrawalEns.innerText = foundName
      const filter = deployFilter(withdrawalAddress, nodeInput.value)
      const logs = await factory.queryFilter(filter)
      if (logs.length) {
        const log = logs.pop()
        withdrawalRocketSplit.classList.add('rocketSplit')
      }
      else {
        withdrawalRocketSplit.classList.add('notRocketSplit')
      }
    }
  }
  return [withdrawalLabel, withdrawalChanged, withdrawalInput, withdrawalEns, withdrawalRocketSplit]
}

const [withdrawalLabel, withdrawalChanged] = addWithdrawalDisplay('Withdrawal address')
const [deployedSplitLabel, deployedSplitChanged] = addWithdrawalDisplay('Deployed RocketSplit address')
const [pendingLabel, pendingChanged] = addWithdrawalDisplay('Pending withdrawal address')
deployedSplitLabel.classList.add('hidden')
pendingLabel.classList.add('hidden')

nodeInput.addEventListener('change', async () => {
  await onChangeNode()
  await withdrawalChanged('')
  await deployedSplitChanged('')
  await pendingChanged('')
  deployedSplitLabel.classList.add('hidden')
  pendingLabel.classList.add('hidden')
  if (nodeInput.checkValidity() && nodeInput.value) {
    if (!(await rocketNodeManager.getNodeExists(nodeInput.value))) {
      nodeInput.setCustomValidity('Node address not registered with Rocket Pool')
      nodeInput.reportValidity()
      button.disabled = true
    }
    else {
      const pending = await rocketNodeManager.getNodePendingWithdrawalAddress(nodeInput.value)
      if (pending && pending !== emptyAddress) {
        await pendingChanged(pending)
        pendingLabel.classList.remove('hidden')
      }
      const withdrawal = await rocketNodeManager.getNodeWithdrawalAddress(nodeInput.value)
      if (withdrawal) {
        await withdrawalChanged(withdrawal)
      }
      const filter = deployFilter(null, nodeInput.value)
      const logs = await factory.queryFilter(filter)
      if (logs.length) {
        const log = logs.pop()
        const eventLog = new ethers.EventLog(log, factory.interface, deployFragment)
        const split = eventLog.args[0]
        if (split !== pending && split !== withdrawal) {
          await deployedSplitChanged(split)
          deployedSplitLabel.classList.remove('hidden')
        }
      }
    }
  }
})

body.appendChild(walletSection)
body.appendChild(createSection)
body.appendChild(changeSection)
