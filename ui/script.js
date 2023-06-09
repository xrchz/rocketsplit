import { ethers } from "./node_modules/ethers/dist/ethers.js"
import { EthereumProvider } from "@walletconnect/ethereum-provider";

// TODO: change (or confirm change) RocketSplit withdrawal address to another address (if right account is signer)
// TODO: update buttons on change of signer
// TODO: add withdrawal actions: withdraw ETH, withdraw RPL, withdraw rewards
// TODO: set/change ENS (reverse record) for any deployed RocketSplit
// TODO: better instructions (+ link to docs?)
// TODO: check ux when transactions fail, are rejected, are replaced, etc.
// TODO: support walletconnect
// TODO: better styling
// TODO: allow overriding the address to confirm pending (in case the last log isn't the right one)?
// TODO: check if any other wallets are needed?

// Dynamic elements:
// 00: Signer, SignerENS
// 01: Node, NodeENS
// 02: ETHOwner, ETHOwnerENS
// 03: RPLOwner, RPLOwnerENS
// 04: ETHFeeN, ETHFeeD, ETHFeePercent
// 05: RPLFeeN, RPLFeeD, RPLFeePercent
// 06: DeployButton
// 07: WithdrawalAddress
// 08: DeployedAddress
// 09: PendingWithdrawalAddress
// 10: RocketSplitDetails
// 11: NewENS
// 12: ChangeENSButton
// 13: ConfirmDeployedButton
// 14: ChangeAddress, ChangeAddressENS, ChangeForce
// 15: ChangeButton
// 16: ConfirmChangeAddress, ConfirmChangeENS, ConfirmChangeForce, ConfirmChangeButton
// 17: WithdrawRewardsButton
// 18: WithdrawRPLButton
// 19: WithdrawETHButton
//
// Dependencies:
// 02: 00, 01
// 03: 00, 01
// 04: 00, 01
// 05: 00, 01
// 06: 00, 01, 02, 03, 04, 05
// 07: 01
// 08: 01
// 09: 01
// 10: 01
// 11: 00, 01
// 12: 00, 01, 11
// 13: 00, 01
// 14: 00, 01
// 15: 00, 01, 14
// 16: 00, 01
// 17: 00, 01
// 18: 00, 01
// 19: 00, 01

const body = document.querySelector('body')

const emptyAddress = `0x${'0'.repeat(40)}`
const addressPattern = '^(?:0x[0-9a-fA-F]{40})|(?:.{3,}\.eth)$'
const addressPlaceholder = '0x... or ENS name'

// The WalletConnect project ID.
const projectId = process.env.PROJECT_ID

// Load the provider from local storage.
let provider = undefined

let ethereumProvider = undefined
let signer = undefined

const rocketSplitABI = require('./RocketSplit.json')
const factoryAddress = require('./RocketSplitAddress.json')
const rocketStorageAddress = require('./RocketStorageAddress.json')

let factory = undefined
let deployFunction = undefined
let rocketStorage = undefined
let rocketNodeManager = undefined

// Function to create the contract instances we need to interact with the protocol.
const createContracts = async () => {
  factory = new ethers.Contract(factoryAddress, rocketSplitABI.abi, provider)
  console.log(`Factory contract is ${await factory.getAddress()}`)
  deployFunction = factory.interface.getFunction('deploy').format()

  rocketStorage = new ethers.Contract(
    rocketStorageAddress,
    ['function getAddress(bytes32 key) view returns (address)',
    'function setWithdrawalAddress(address _nodeAddress, address _newWithdrawalAddress, bool _confirm)'],
    provider)
  rocketNodeManager = new ethers.Contract(
    await rocketStorage['getAddress(bytes32)'](ethers.id('contract.addressrocketNodeManager')),
    ['function getNodeExists(address _nodeAddress) view returns (bool)',
    'function getNodeWithdrawalAddress(address _nodeAddress) view returns (address)',
    'function getNodePendingWithdrawalAddress(address _nodeAddress) view returns (address)'],
    provider)
}

const headerSection = document.createElement('header')
headerSection.appendChild(document.createElement('h2')).innerText = 'RocketSplit'

const transactionStatus = document.createElement('p')
transactionStatus.classList.add('status')
transactionStatus.classList.add('hidden')


const walletSection = document.createElement('section')
const helpText = walletSection.appendChild(document.createElement('p'))
helpText.innerText = 'Create a new marriage contract or view an existing one. The first step is to find your node. Then you can manage or create your marriage contract. This contract will act as your withdrawal address for your node.'
const nodeDiv = walletSection.appendChild(document.createElement('div'))
nodeDiv.classList.add('inputs')

// Create our connect wallet button for Metamask
const btnConnectWallet = document.createElement('button')
btnConnectWallet.type = 'button'
const txtConnectWallet = document.createElement('span')
txtConnectWallet.innerText = 'Connect with Metamask'
txtConnectWallet.classList.add('button--text')
btnConnectWallet.appendChild(txtConnectWallet)
btnConnectWallet.classList.add('hidden')
btnConnectWallet.addEventListener('click', async () => {
  try {
    btnConnectWallet.classList.add('button--loading')
    transactionStatus.innerText = "";
    transactionStatus.classList.add('hidden')

    provider = new ethers.BrowserProvider(window.ethereum)

    await signerConnected()
    await createContracts()

    setDisplayMode('find-node')

  }
  catch (e) {
    btnConnectWallet.classList.remove('button--loading')
    transactionStatus.innerText = "There was a problem connecting to your wallet. Please try again."
    transactionStatus.classList.remove('hidden')
  }
})
walletSection.appendChild(btnConnectWallet)

// Create our wallet connect button.
const btnConnectWalletConnect = document.createElement('button')
btnConnectWalletConnect.type = 'button'
const txtConnectWalletConnect = document.createElement('span')
txtConnectWalletConnect.innerText = 'Connect with WalletConnect'
txtConnectWalletConnect.classList.add('button--text')
btnConnectWalletConnect.appendChild(txtConnectWalletConnect)
btnConnectWalletConnect.classList.add('hidden')
btnConnectWalletConnect.addEventListener('click', async () => {
  try {
    btnConnectWalletConnect.classList.add('button--loading')
    transactionStatus.innerText = "";
    transactionStatus.classList.add('hidden')
    if (!ethereumProvider) {
      ethereumProvider = await EthereumProvider.init({
        projectId,
        showQrModal: true,
        qrModalOptions: { themeMode: "light" },
        chains: [1],
        methods: ["eth_sendTransaction", "personal_sign"],
        events: ["chainChanged", "accountsChanged"],
        metadata: {
          name: "RocketSplit",
          description: "Rocketsplit",
          url: "https://rocketsplit.xyz",
          icons: ["https://my-dapp.com/logo.png"],
        },
      });

      // Set up connection listener
      ethereumProvider.on("connect", async () => {
        //console.info(ethereumProvider.accounts)
        provider = new ethers.BrowserProvider(ethereumProvider)

        await signerConnected()
        await createContracts()

        setDisplayMode('find-node')
      });
    }

    ethereumProvider.connect()
  }
  catch (e) {
    btnConnectWalletConnect.classList.remove('button--loading')
    transactionStatus.innerText = "There was a problem connecting to your wallet. Please try again."
    transactionStatus.classList.remove('hidden')
    console.error(e)
  }
})
walletSection.appendChild(btnConnectWalletConnect)


// Create our check node address button
const btnFindNode = document.createElement('button')
btnFindNode.type = 'button'
const txtFindNode = document.createElement('span')
txtFindNode.innerText = 'Find Node'
txtFindNode.classList.add('button--text')
btnFindNode.classList.add('hidden')
btnFindNode.appendChild(txtFindNode)
btnFindNode.addEventListener('click', async () => {
  try {
    btnFindNode.classList.add('button--loading')
    transactionStatus.innerText = "";
    transactionStatus.classList.add('hidden')

    await onChangeNodeEns()
    await onChangeNodeWithdrawal()

    btnFindNode.classList.remove('button--loading')
    setDisplayMode('connected')
  }
  catch (e) {
    btnFindNode.classList.remove('button--loading')
    transactionStatus.innerText = "There was a problem finding your node. Please try again.";
    transactionStatus.classList.remove('hidden')
    setDisplayMode('find-node')
    console.error(e)
  }
})
walletSection.appendChild(btnFindNode)

const signerLabel = headerSection.appendChild(document.createElement('label'))
signerLabel.classList.add('address')
signerLabel.innerText = 'Connected account'
const signerInput = signerLabel.appendChild(document.createElement('input'))
signerInput.type = 'text'
signerInput.setAttribute('readonly', true)
signerInput.placeholder = 'none'
const signerEns = signerLabel.appendChild(document.createElement('span'))
signerEns.classList.add('ens')

async function signerConnected() {
  if(provider) {
    signerInput.value = ''
    signerEns.innerText = ''
    signer = await provider.getSigner().catch((err) => {
      throw err
    })

    if (signer) {
      signerInput.value = await signer.getAddress()
      if (signerInput.value) {
        const foundName = await provider.lookupAddress(signerInput.value)
        if (foundName)
          signerEns.innerText = foundName
      }
    }
  }
}

const checkAccounts = async () => {
  console.log("Checking connected accounts.")

  const accounts = await window.ethereum.send('eth_accounts').catch((err) => {
    //Error
    if (err.code === 4001) { // EIP 1193 userRejectedRequest error
      console.log('Please connect to MetaMask.')
    } else {
      console.error(err)
    }
  });

  if(accounts.result.length > 0) {
    console.log("Found accounts, connecting to first account.")
    await signerConnected()
    transactionStatus.innerText = ''
    transactionStatus.classList.add('hidden')
    setDisplayMode('find-node')
    return
  }

  // Clear the wallet input field.
  signerInput.value = ''
  setDisplayMode('not-connected')
}

function setDisplayMode(mode) {
  console.log("Setting display mode to: " + mode)
  // Sets the different stages of the UI.
  switch(mode) {
    case 'not-connected':
      btnConnectWallet.classList.remove('hidden')
      btnConnectWalletConnect.classList.remove('hidden')
      btnFindNode.classList.add('hidden')

      // Hide the wallet section
      walletSection.classList.add('section-active')
      // Hide the createSection
      createSection.classList.remove('section-active')
      // Hide the changeSection
      changeSection.classList.remove('section-active')

      break
    case 'find-node':
      btnConnectWallet.classList.add('hidden')
      btnConnectWalletConnect.classList.add('hidden')
      btnFindNode.classList.remove('hidden')
      walletSection.classList.add('section-active')
      createSection.classList.remove('section-active')
      changeSection.classList.remove('section-active')
      break
    case 'connected':
      btnConnectWallet.classList.add('hidden')
      btnConnectWalletConnect.classList.add('hidden')
      createSection.classList.add('section-active')
      changeSection.classList.add('section-active')
      break
    default:
      console.error('Unknown display mode: ' + mode)
  }
}


// Listen for wallet events.
window.ethereum.on('connect', signerConnected)
window.ethereum.on('accountsChanged', checkAccounts)


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

const deployButton = document.createElement('input')
deployButton.type = 'button'
deployButton.value = 'Deploy Contract'
deployButton.disabled = true


function updateDeployButton() {
  const addresses = Array.from(
    createInputsDiv.querySelectorAll('.address > input')
  ).every(a => a.value && a.checkValidity())
  const fees = Array.from(
    createInputsDiv.querySelectorAll('.fraction')
  ).every(s => s.innerText)
  deployButton.disabled = !(addresses && fees && signer)
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

const onChangeNodeEns = makeOnChangeAddress(nodeInput, nodeEns, updateDeployButton)

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
  addressInput.addEventListener('change', makeOnChangeAddress(addressInput, ensName, updateDeployButton))
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
    updateDeployButton()
  }
  feeNInput.addEventListener('change', updateFees)
  feeDInput.addEventListener('change', updateFees)
}

addInputs('ETH')
addInputs('RPL')
createInputsDiv.appendChild(deployButton)

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
            transactionStatus.classList.add('hidden')
            try {
              const response = await proxyContract.connect(signer).changeWithdrawalAddress(
                changeAddress.value, changeCheckbox.checked)
              await handleTransaction(response)
            }
            catch (e) {
              transactionStatus.innerText = e.message
              transactionStatus.classList.remove('hidden')
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
            transactionStatus.classList.add('hidden')
            try {
              const response = await proxyContract.connect(signer).confirmChangeWithdrawalAddress(
                changeAddress.value, changeCheckbox.checked)
              await handleTransaction(response)
            }
            catch (e) {
              transactionStatus.innerText = e.message
              transactionStatus.classList.remove('hidden')
              await onChangeNodeWithdrawal()
            }
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
  console.log("Checking node address")
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
      deployButton.disabled = true
      throw new Error('Node address not registered with Rocket Pool')
    }
    else {
      const pending = await rocketNodeManager.getNodePendingWithdrawalAddress(nodeInput.value).catch(() => false)
      if (pending && pending !== emptyAddress) {
        await pendingChanged(pending)
        pendingDiv.classList.remove('hidden')
      }
      const withdrawal = await rocketNodeManager.getNodeWithdrawalAddress(nodeInput.value).catch(() => false)
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
  else {
    throw new Error('Node address not valid')
  }
}


async function handleTransaction(response) {
  transactionStatus.classList.remove('hidden')
  transactionStatus.innerText = `Transaction ${response.hash} submitted!`
  const receipt = await response.wait()
  transactionStatus.innerText = `Transaction ${receipt.hash} included in block ${receipt.blockNumber}!`
  await onChangeNodeWithdrawal()
  transactionStatus.innerText = ''
}

deployButton.addEventListener('click', async () => {
  deployButton.disabled = true
  transactionStatus.innerText = ''
  transactionStatus.classList.add('hidden')
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
    transactionStatus.classList.remove('hidden')
    transactionStatus.innerText = e.message
  }
  updateDeployButton()
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

body.appendChild(headerSection)
body.appendChild(transactionStatus)
body.appendChild(walletSection)
body.appendChild(changeSection)
body.appendChild(createSection)

// Check for connected accounts. @TODO: need to persist connections.
//checkAccounts()
setDisplayMode('not-connected')