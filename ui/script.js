import { ethers } from "./node_modules/ethers/dist/ethers.js"

// TODO: change (or confirm change) RocketSplit withdrawal address to another address (if right account is signer)
// TODO: update buttons on change of signer
// TODO: add withdrawal actions
// TODO: set/change ENS (reverse record) for any deployed RocketSplit
// TODO: better instructions
// TODO: support walletconnect
// TODO: better styling
// TODO: allow overriding the address to confirm pending (in case the last log isn't the right one)?
// TODO: check if any other wallets are needed?

const body = document.querySelector('body')

const emptyAddress = `0x${'0'.repeat(40)}`
const addressPattern = '^(?:0x[0-9a-fA-F]{40})|(?:.{3,}\.eth)$'
const addressPlaceholder = '0x... or ENS name'

const provider = new ethers.BrowserProvider(window.ethereum)
const network = await provider.getNetwork()
console.log(`Connected to ${network.name}`)

const rocketSplitABI = await fetch('RocketSplit.json').then(res => res.json()).then(j => j.abi)
const factory = new ethers.Contract(await fetch('RocketSplitAddress.json').then(res => res.json()), rocketSplitABI, provider)
console.log(`Factory contract is ${await factory.getAddress()}`)
const deployFunction = factory.interface.getFunction('deploy').format()

let signer

const rocketStorage = new ethers.Contract(
  await fetch('RocketStorageAddress.json').then(res => res.json()),
  ['function getAddress(bytes32 key) view returns (address)',
   'function setWithdrawalAddress(address _nodeAddress, address _newWithdrawalAddress, bool _confirm)'],
  provider)
const rocketNodeManager = new ethers.Contract(
  await rocketStorage['getAddress(bytes32)'](ethers.id('contract.addressrocketNodeManager')),
  ['function getNodeExists(address _nodeAddress) view returns (bool)',
   'function getNodeWithdrawalAddress(address _nodeAddress) view returns (address)',
   'function getNodePendingWithdrawalAddress(address _nodeAddress) view returns (address)'],
  provider)

const walletSection = document.createElement('section')
const transactionStatus = walletSection.appendChild(document.createElement('p'))
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

const nodeLabel = nodeDiv.appendChild(document.createElement('label'))
nodeLabel.innerText = 'Node address'
nodeLabel.classList.add('address')
const nodeInput = nodeLabel.appendChild(document.createElement('input'))
nodeInput.type = 'text'
nodeInput.pattern = addressPattern
nodeInput.placeholder = addressPlaceholder
const nodeEns = nodeLabel.appendChild(document.createElement('span'))
nodeEns.classList.add('ens')

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

function updateButton() {
  const addresses = Array.from(
    createInputsDiv.querySelectorAll('.address > input')
  ).every(a => a.value && a.checkValidity())
  const fees = Array.from(
    createInputsDiv.querySelectorAll('.fraction')
  ).every(s => s.innerText)
  button.disabled = !(addresses && fees && signer)
}

function makeOnChangeAddress(addressInput, ensName, updater) {
  async function onChangeAddress() {
    addressInput.setCustomValidity('')
    ensName.innerText = ''
    if (addressInput.checkValidity()) {
      if (addressInput.value.endsWith('.eth')) {
        const resolvedAddress = await provider.resolveName(addressInput.value).catch(() => null)
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
    updater()
  }
  return onChangeAddress
}

const onChangeNodeEns = makeOnChangeAddress(nodeInput, nodeEns, updateButton)

const feeEstimateText = (num, den) => `${num}/${den} ≈ ${(100*num/den).toPrecision(3)}%`

function addInputs(asset) {
  const div = createInputsDiv.appendChild(document.createElement('div'))
  const addressLabel = div.appendChild(document.createElement('label'))
  addressLabel.innerText = `${asset} Owner`
  addressLabel.classList.add('address')
  const addressInput = addressLabel.appendChild(document.createElement('input'))
  addressInput.id = `${asset}Owner`
  addressInput.type = 'text'
  addressInput.pattern = addressPattern
  addressInput.placeholder = addressPlaceholder
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
  addressInput.addEventListener('change', makeOnChangeAddress(addressInput, ensName, updateButton))
  function updateFees() {
    feeNInput.max = feeDInput.value
    feeFraction.innerText = ''
    if (feeNInput.checkValidity() && feeDInput.checkValidity()) {
      if (!feeNInput.value) feeNInput.value = 0
      if (!feeDInput.value) feeDInput.value = feeNInput.valueAsNumber || 1
      const num = feeNInput.valueAsNumber
      const den = feeDInput.valueAsNumber
      feeFraction.innerText = feeEstimateText(num, den)
    }
    feeDInput.reportValidity()
    feeNInput.reportValidity()
    updateButton()
  }
  feeNInput.addEventListener('change', updateFees)
  feeDInput.addEventListener('change', updateFees)
}

addInputs('ETH')
addInputs('RPL')
createInputsDiv.appendChild(button)

const changeSection = document.createElement('section')
changeSection.appendChild(document.createElement('h2')).innerText = 'View/Use Marriage Contract'
const changeInputsDiv = changeSection.appendChild(document.createElement('div'))
changeInputsDiv.classList.add('inputs')

async function contractDetails(proxyContract) {
  const ETHOwner = await proxyContract.ETHOwner()
  const RPLOwner = await proxyContract.RPLOwner()
  const [ETHFeeN, ETHFeeD] = await proxyContract.ETHFee()
  const [RPLFeeN, RPLFeeD] = await proxyContract.RPLFee()
  const RPLPrincipal = await proxyContract.RPLPrincipal()
  async function formatAddress(a) {
    const ens = await provider.lookupAddress(a)
    return ens ? `${a} (${ens})` : a
  }
  return [`ETH Owner: ${await formatAddress(ETHOwner)}`,
          `ETH Fee: ${feeEstimateText(Number(ETHFeeN), Number(ETHFeeD))}`,
          `RPL Owner: ${await formatAddress(RPLOwner)}`,
          `RPL Fee: ${feeEstimateText(Number(RPLFeeN), Number(RPLFeeD))}`,
          `Staked principal: ${ethers.formatEther(RPLPrincipal)} RPL`]
}

function addWithdrawalDisplay(div, label) {
  const withdrawalLabel = div.appendChild(document.createElement('label'))
  withdrawalLabel.classList.add('address')
  withdrawalLabel.innerText = label
  const withdrawalInput = withdrawalLabel.appendChild(document.createElement('input'))
  withdrawalInput.type = 'text'
  withdrawalInput.setAttribute('readonly', true)
  withdrawalInput.placeholder = 'none: set node address first'
  const withdrawalEns = withdrawalLabel.appendChild(document.createElement('span'))
  withdrawalEns.classList.add('ens')
  const withdrawalRocketSplit = withdrawalLabel.appendChild(document.createElement('span'))
  const changers = []
  async function withdrawalChanged(withdrawalAddress) {
    withdrawalInput.value = withdrawalAddress
    withdrawalEns.innerText = ''
    withdrawalRocketSplit.classList.remove('rocketSplit')
    withdrawalRocketSplit.classList.remove('notRocketSplit')
    withdrawalRocketSplit.innerText = ''
    if (withdrawalAddress) {
      const foundName = await provider.lookupAddress(withdrawalAddress)
      if (foundName)
        withdrawalEns.innerText = foundName
      const filter = factory.filters.DeployRocketSplit(withdrawalAddress, nodeInput.value)
      const logs = await factory.queryFilter(filter)
      const proxyContract = logs.length && new ethers.Contract(withdrawalAddress, rocketSplitABI, provider)
      if (proxyContract &&
          await proxyContract.guardian().catch(() => '') ===
          await factory.getAddress()) {
        withdrawalRocketSplit.classList.add('rocketSplit')
        withdrawalRocketSplit.append(...await contractDetails(proxyContract).then(
          lines => lines.map(line => {
            const span = document.createElement('span')
            span.innerText = line
            return span
          })))
        const ETHOwner = await proxyContract.ETHOwner()
        if (ETHOwner === signerInput.value) {
          const changeLabel = document.createElement('label')
          changers.push(div.appendChild(changeLabel))
          changeLabel.innerText = 'New withdrawal address'
          changeLabel.classList.add('address')
          const changeAddress = changeLabel.appendChild(document.createElement('input'))
          changeAddress.type = 'text'
          changeAddress.pattern = addressPattern
          changeAddress.placeholder = addressPlaceholder
          const changeEns = changeLabel.appendChild(document.createElement('span'))
          changeEns.classList.add('ens')
          const changeForceLabel = document.createElement('label')
          changers.push(div.appendChild(changeForceLabel))
          changeForceLabel.innerText = 'force confirmation'
          const changeCheckbox = changeForceLabel.appendChild(document.createElement('input'))
          changeCheckbox.type = 'checkbox'
          const changeButton = document.createElement('input')
          changers.push(div.appendChild(changeButton))
          changeButton.type = 'button'
          changeButton.value = 'Change Withdrawal Address'
          changeButton.disabled = true
          function updateChangeButton() {
            changeButton.disabled = !(
              ETHOwner === signerInput.value &&
              changeAddress.value && changeAddress.checkValidity()
            )
          }
          changeAddress.addEventListener('change',
            makeOnChangeAddress(changeAddress, changeEns, updateChangeButton))
          changeButton.addEventListener('click', async () => {
            changeButton.disabled = true
            transactionStatus.innerText = ''
            try {
              const response = await proxyContract.connect(signer).changeWithdrawalAddress(
                changeAddress.value, changeCheckbox.checked)
              await handleTransaction(response)
            }
            catch (e) {
              transactionStatus.innerText = e.message
              await onChangeNodeWithdrawal()
            }
            updateChangeButton()
          })
        }
        const RPLOwner = await proxyContract.RPLOwner()
        if (await proxyContract.pendingWithdrawalAddress() !== emptyAddress &&
            RPLOwner === signerInput.value) {
          const changeLabel = document.createElement('label')
          changers.push(div.appendChild(changeLabel))
          changeLabel.innerText = 'Pending new withdrawal address'
          changeLabel.classList.add('address')
          const changeAddress = changeLabel.appendChild(document.createElement('input'))
          changeAddress.type = 'text'
          changeAddress.value = await proxyContract.pendingWithdrawalAddress()
          changeAddress.setAttribute('readonly', true)
          const changeEns = changeLabel.appendChild(document.createElement('span'))
          changeEns.classList.add('ens')
          const foundName = await provider.lookupAddress(changeAddress.value)
          if (foundName)
            changeEns.innerText = foundName
          const changeForceLabel = document.createElement('label')
          changers.push(div.appendChild(changeForceLabel))
          changeForceLabel.innerText = 'force confirmation'
          const changeCheckbox = changeForceLabel.appendChild(document.createElement('input'))
          changeCheckbox.type = 'checkbox'
          changeCheckbox.checked = await proxyContract.pendingForce()
          changeCheckbox.setAttribute('readonly', true)
          const changeButton = document.createElement('input')
          changers.push(div.appendChild(changeButton))
          function updateChangeButton() {
            changeButton.disabled = RPLOwner !== signerInput.value
          }
          changeButton.type = 'button'
          changeButton.value = 'Confirm Withdrawal Address Change'
          changeButton.addEventListener('click', async () => {
            changeButton.disabled = true
            transactionStatus.innerText = ''
            // TODO: add confirm change button action
            updateChangeButton()
          })
        }
      }
      else {
        withdrawalRocketSplit.classList.add('notRocketSplit')
        while (changers.length) changers.pop().remove()
      }
    }
    else {
      while (changers.length) changers.pop().remove()
    }
  }
  return [withdrawalChanged, withdrawalInput, withdrawalEns, withdrawalRocketSplit, withdrawalLabel]
}

const [withdrawalChanged] = addWithdrawalDisplay(changeInputsDiv, 'Withdrawal address')

const pendingDiv = changeSection.appendChild(document.createElement('div'))
const [pendingChanged, pendingInput] = addWithdrawalDisplay(pendingDiv, 'Pending withdrawal address')
pendingDiv.classList.add('inputs')
pendingDiv.classList.add('hidden')

const confirmPending = pendingDiv.appendChild(document.createElement('input'))
confirmPending.type = 'button'
confirmPending.value = 'Confirm Withdrawal Address'
confirmPending.disabled = true
confirmPending.classList.add('hidden')

const deployedDiv = changeSection.appendChild(document.createElement('div'))
const [deployedSplitChanged, deployedSplitInput] = addWithdrawalDisplay(deployedDiv, 'Deployed RocketSplit address')
deployedDiv.classList.add('inputs')
deployedDiv.classList.add('hidden')

const setDeployed = deployedDiv.appendChild(document.createElement('input'))
setDeployed.type = 'button'
setDeployed.value = 'Set as Withdrawal Address'
setDeployed.disabled = true

async function onChangeNodeWithdrawal() {
  await withdrawalChanged('')
  await deployedSplitChanged('')
  await pendingChanged('')
  deployedDiv.classList.add('hidden')
  pendingDiv.classList.add('hidden')
  setDeployed.disabled = true
  confirmPending.disabled = true
  confirmPending.classList.add('hidden')
  delete setDeployed.title
  if (nodeInput.checkValidity() && nodeInput.value) {
    if (!(await rocketNodeManager.getNodeExists(nodeInput.value).catch(() => false))) {
      nodeInput.setCustomValidity('Node address not registered with Rocket Pool')
      nodeInput.reportValidity()
      button.disabled = true
    }
    else {
      const pending = await rocketNodeManager.getNodePendingWithdrawalAddress(nodeInput.value)
      if (pending && pending !== emptyAddress) {
        await pendingChanged(pending)
        pendingDiv.classList.remove('hidden')
      }
      const withdrawal = await rocketNodeManager.getNodeWithdrawalAddress(nodeInput.value)
      if (withdrawal) {
        await withdrawalChanged(withdrawal)
      }
      const filter = factory.filters.DeployRocketSplit(null, nodeInput.value)
      const logs = await factory.queryFilter(filter)
      if (logs.length) {
        const log = logs.pop()
        const eventLog = new ethers.EventLog(log, factory.interface, filter.fragment)
        const split = eventLog.args[0]
        if (split === pending) {
          confirmPending.disabled = false
          confirmPending.classList.remove('hidden')
        }
        else if (split !== pending && split !== withdrawal) {
          await deployedSplitChanged(split)
          deployedDiv.classList.remove('hidden')
          if (signerInput.value === withdrawal)
            setDeployed.disabled = false
          else
            setDeployed.title = 'Connect with current withdrawal address'
        }
      }
    }
  }
}

nodeInput.addEventListener('change', async () => {
  await onChangeNodeEns()
  await onChangeNodeWithdrawal()
})

async function handleTransaction(response) {
  transactionStatus.innerText = `Transaction ${response.hash} submitted!`
  const receipt = await response.wait()
  transactionStatus.innerText = `Transaction ${receipt.hash} included in block ${receipt.blockNumber}!`
  await onChangeNodeWithdrawal()
  transactionStatus.innerText = ''
}

button.addEventListener('click', async () => {
  button.disabled = true
  transactionStatus.innerText = ''
  try {
    const response = await factory.connect(signer)[deployFunction](
      nodeInput.value,
      document.getElementById('ETHOwner').value,
      document.getElementById('RPLOwner').value,
      [document.getElementById('ETHFeeN').value, document.getElementById('ETHFeeD').value],
      [document.getElementById('RPLFeeN').value, document.getElementById('RPLFeeD').value])
    await handleTransaction(response)
  }
  catch (e) {
    transactionStatus.innerText = e.message
  }
  updateButton()
})

setDeployed.addEventListener('click', async () => {
  setDeployed.disabled = true
  transactionStatus.innerText = ''
  try {
    const response = await rocketStorage.connect(signer).setWithdrawalAddress(
      nodeInput.value, deployedSplitInput.value, false)
    await handleTransaction(response)
  }
  catch (e) {
    transactionStatus.innerText = e.message
    await onChangeNodeWithdrawal()
  }
})

confirmPending.addEventListener('click', async () => {
  confirmPending.disabled = true
  transactionStatus.innerText = ''
  try {
    const rocketSplit = new ethers.Contract(pendingInput.value, rocketSplitABI, provider)
    const response = await rocketSplit.connect(signer).confirmWithdrawalAddress()
    await handleTransaction(response)
  }
  catch (e) {
    transactionStatus.innerText = e.message
    await onChangeNodeWithdrawal()
  }
})

body.appendChild(walletSection)
body.appendChild(changeSection)
body.appendChild(createSection)
