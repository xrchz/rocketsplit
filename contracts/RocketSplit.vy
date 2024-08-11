#pragma version ~=0.4.0
#pragma evm-version cancun
#pragma optimize gas

MAX_INTERVALS: constant(uint256) = 128
MAX_PROOF_LENGTH: constant(uint256) = 32
MAX_MINIPOOLS: constant(uint256) = 1024

interface RPLInterface:
  def balanceOf(_who: address) -> uint256: view
  def transfer(_to: address, _value: uint256) -> bool: nonpayable
  def transferFrom(_from: address, _to: address, _value: uint256) -> bool: nonpayable
  def approve(_spender: address, _value: uint256) -> bool: nonpayable

interface RocketStorageInterface:
  def getAddress(_key: bytes32) -> address: view
  def getNodeWithdrawalAddress(_nodeAddress: address) -> address: view
  def confirmWithdrawalAddress(_nodeAddress: address): nonpayable
  def setWithdrawalAddress(_nodeAddress: address, _newWithdrawalAddress: address, _confirm: bool): nonpayable

interface RocketNodeStakingInterface:
  def getNodeRPLStake(_nodeAddress: address) -> uint256: view
  def stakeRPLFor(_nodeAddress: address, _amount: uint256): nonpayable

interface RocketNodeDistributorFactoryInterface:
  def getProxyAddress(_nodeAddress: address) -> address: view

interface RocketNodeDistributorInterface:
  def distribute(): nonpayable

interface RocketMerkleDistributorInterface:
  def claim(_nodeAddress: address,
            _rewardIndex: DynArray[uint256, MAX_INTERVALS],
            _amountRPL: DynArray[uint256, MAX_INTERVALS],
            _amountETH: DynArray[uint256, MAX_INTERVALS],
            _merkleProof: DynArray[DynArray[bytes32, MAX_PROOF_LENGTH], MAX_INTERVALS]): nonpayable

interface MinipoolInterface:
  def distributeBalance(_rewardsOnly: bool): nonpayable

interface EnsRevRegInterface:
  def setName(_name: String[256]) -> bytes32: nonpayable

interface EnsRegInterface:
  def owner(_node: bytes32) -> address: view

struct Fee:
  numerator: uint256
  denominator: uint256

addrReverseNode: constant(bytes32) = 0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2
ensRegAddress: constant(address) = 0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e
rocketNodeStakingKey: constant(bytes32) = keccak256("contract.addressrocketNodeStaking")
rocketTokenRPLKey: constant(bytes32) = keccak256("contract.addressrocketTokenRPL")
rocketMerkleDistributorKey: constant(bytes32) = keccak256("contract.addressrocketMerkleDistributorMainnet")
rocketNodeDistributorFactoryKey: constant(bytes32) = keccak256("contract.addressrocketNodeDistributorFactory")
rocketStorage: immutable(RocketStorageInterface)
RPLToken: immutable(RPLInterface)

guardian: public(address)
nodeAddress: public(address)
distributor: public(RocketNodeDistributorInterface)
ETHOwner: public(address)
RPLOwner: public(address)
pendingWithdrawalAddress: public(address)
pendingForce: public(bool)
ETHFee: public(Fee)
RPLFee: public(Fee)
RPLPrincipal: public(uint256)
RPLRefundee: public(address)
RPLRefund: public(uint256)

@deploy
def __init__(_rocketStorageAddress: address):
  rocketStorage = RocketStorageInterface(_rocketStorageAddress)
  RPLToken = RPLInterface(staticcall rocketStorage.getAddress(rocketTokenRPLKey))
  self.guardian = msg.sender

allowPaymentsFrom: address
@external
@payable
def __default__():
  assert msg.sender == self.allowPaymentsFrom, "external payment not allowed"

event DeployRocketSplit:
  self: address
  node: indexed(address)
  ETHOwner: indexed(address)
  RPLOwner: indexed(address)
  ETHFee: Fee
  RPLFee: Fee
  RPLRefund: bool

interface RocketSplitInterface:
  def setup(_nodeAddress: address,
            _ETHOwner: address, _RPLOwner: address,
            _ETHFee: Fee, _RPLFee: Fee,
            _refundRPL: bool): nonpayable

@external
def deploy(_nodeAddress: address,
           _ETHOwner: address, _RPLOwner: address,
           _ETHFee: Fee, _RPLFee: Fee,
           _refundRPL: bool) -> address:
  assert self.guardian != empty(address), "proxy"
  contract: RocketSplitInterface = RocketSplitInterface(create_minimal_proxy_to(self))
  extcall contract.setup(_nodeAddress, _ETHOwner, _RPLOwner, _ETHFee, _RPLFee, _refundRPL)
  log DeployRocketSplit(contract.address, _nodeAddress, _ETHOwner, _RPLOwner, _ETHFee, _RPLFee, _refundRPL)
  return contract.address

@external
def setup(_nodeAddress: address,
          _ETHOwner: address, _RPLOwner: address,
          _ETHFee: Fee, _RPLFee: Fee,
          _refundRPL: bool):
  assert self.guardian == empty(address), "auth"
  assert _ETHFee.numerator <= _ETHFee.denominator, "fee ETH"
  assert _RPLFee.numerator <= _RPLFee.denominator, "fee RPL"
  self.guardian = msg.sender
  self.nodeAddress = _nodeAddress
  self.distributor = RocketNodeDistributorInterface(
      staticcall RocketNodeDistributorFactoryInterface(
        staticcall rocketStorage.getAddress(rocketNodeDistributorFactoryKey)
      ).getProxyAddress(_nodeAddress)
    )
  self.ETHOwner = _ETHOwner
  self.RPLOwner = _RPLOwner
  self.ETHFee = _ETHFee
  self.RPLFee = _RPLFee
  if _refundRPL:
    self.RPLRefundee = staticcall rocketStorage.getNodeWithdrawalAddress(_nodeAddress)
    self.RPLRefund = staticcall self._getRocketNodeStaking().getNodeRPLStake(_nodeAddress)

@internal
def _getRocketNodeStaking() -> RocketNodeStakingInterface:
  rocketNodeStakingAddress: address = staticcall rocketStorage.getAddress(rocketNodeStakingKey)
  return RocketNodeStakingInterface(rocketNodeStakingAddress)

@external
def stakeRPL(_amount: uint256):
  assert msg.sender == self.RPLOwner, "auth"
  rocketNodeStaking: RocketNodeStakingInterface = self._getRocketNodeStaking()
  assert extcall RPLToken.transferFrom(msg.sender, self, _amount), "transferFrom"
  assert extcall RPLToken.approve(rocketNodeStaking.address, _amount), "approve"
  extcall rocketNodeStaking.stakeRPLFor(self.nodeAddress, _amount)
  self.RPLPrincipal = staticcall rocketNodeStaking.getNodeRPLStake(self.nodeAddress) - self.RPLRefund

@external
def withdrawRPL():
  refund: uint256 = self.RPLRefund
  if 0 < refund:
    refundUpToBalance: uint256 = min(staticcall RPLToken.balanceOf(self), refund)
    assert extcall RPLToken.transfer(self.RPLRefundee, refundUpToBalance), "refund"
    self.RPLRefund -= refundUpToBalance
    if msg.sender == self.RPLRefundee:
      return
  assert msg.sender == self.RPLOwner, "auth"
  rocketNodeStaking: RocketNodeStakingInterface = self._getRocketNodeStaking()
  principal: uint256 = self.RPLPrincipal
  remainder: uint256 = staticcall rocketNodeStaking.getNodeRPLStake(self.nodeAddress)
  amount: uint256 = principal - remainder
  if 0 < amount:
    assert extcall RPLToken.transfer(msg.sender, amount), "transfer"
    self.RPLPrincipal = remainder

@external
def withdrawETH():
  assert msg.sender == self.ETHOwner, "auth"
  # TODO: withdraw ETH from the node if possible?
  assert staticcall self._getRocketNodeStaking().getNodeRPLStake(self.nodeAddress) == 0, "stake"
  assert self.RPLRefund == 0, "refund"
  assert self.RPLPrincipal == 0, "principal"
  send(msg.sender, self.balance, gas=msg.gas)

@external
def claimMerkleRewards(
    _rewardIndex: DynArray[uint256, MAX_INTERVALS],
    _amountRPL: DynArray[uint256, MAX_INTERVALS],
    _amountETH: DynArray[uint256, MAX_INTERVALS],
    _merkleProof: DynArray[DynArray[bytes32, MAX_PROOF_LENGTH], MAX_INTERVALS]):
  assert msg.sender == self.RPLOwner or msg.sender == self.ETHOwner, "auth"
  rocketMerkleDistributor: RocketMerkleDistributorInterface = RocketMerkleDistributorInterface(
    staticcall rocketStorage.getAddress(rocketMerkleDistributorKey)
  )
  self.allowPaymentsFrom = rocketMerkleDistributor.address
  extcall rocketMerkleDistributor.claim(self.nodeAddress, _rewardIndex, _amountRPL, _amountETH, _merkleProof)
  self.allowPaymentsFrom = empty(address)

@external
def claimDistributorRewards():
  assert msg.sender == self.ETHOwner, "auth"
  self.allowPaymentsFrom = self.distributor.address
  extcall self.distributor.distribute()
  self.allowPaymentsFrom = empty(address)

@external
def distributeMinipoolBalance(_minipool: DynArray[address, MAX_MINIPOOLS], _rewardsOnly: bool):
  assert msg.sender == self.ETHOwner or (msg.sender == self.RPLOwner and _rewardsOnly), "auth"
  for minipoolAddress: address in _minipool:
    minipool: MinipoolInterface = MinipoolInterface(minipoolAddress)
    self.allowPaymentsFrom = minipoolAddress
    extcall minipool.distributeBalance(_rewardsOnly)
  self.allowPaymentsFrom = empty(address)

@internal
def _calculateFee(_amount: uint256, _fee: Fee) -> uint256:
  if _fee.numerator == 0:
    return 0
  else:
    return (_amount * _fee.numerator) // _fee.denominator

@external
def withdrawRewards():
  assert msg.sender == self.RPLOwner, "auth"

  amount: uint256 = staticcall RPLToken.balanceOf(self)
  fee: uint256 = self._calculateFee(amount, self.RPLFee)
  assert extcall RPLToken.transfer(self.RPLOwner, amount - fee), "transfer reward"
  if fee != 0:
    assert extcall RPLToken.transfer(self.ETHOwner, fee), "transfer fee"

  fee = self._calculateFee(self.balance, self.ETHFee)
  send(self.ETHOwner, self.balance - fee, gas=msg.gas)
  if fee != 0:
    send(self.RPLOwner, fee, gas=msg.gas)

@external
def confirmWithdrawalAddress():
  extcall rocketStorage.confirmWithdrawalAddress(self.nodeAddress)
  rocketNodeStaking: RocketNodeStakingInterface = self._getRocketNodeStaking()
  self.RPLPrincipal = staticcall rocketNodeStaking.getNodeRPLStake(self.nodeAddress) - self.RPLRefund

@external
def ensSetName(_name: String[256]):
  assert msg.sender == self.RPLOwner or msg.sender == self.ETHOwner or msg.sender == self.guardian, "auth"
  extcall EnsRevRegInterface(
    staticcall EnsRegInterface(ensRegAddress).owner(addrReverseNode)
  ).setName(_name)

@external
def onERC1155Received(_operator: address, _from: address, _id: uint256, _value: uint256, _data: Bytes[1]) -> bytes4:
  return convert(4063915617, bytes4)

@external
def changeWithdrawalAddress(_newWithdrawalAddress: address, _force: bool):
  assert msg.sender == self.ETHOwner, "auth"
  self.pendingWithdrawalAddress = _newWithdrawalAddress
  self.pendingForce = _force

@external
def confirmChangeWithdrawalAddress(_newWithdrawalAddress: address, _force: bool):
  assert msg.sender == self.RPLOwner, "auth"
  assert _newWithdrawalAddress == self.pendingWithdrawalAddress, "pendingWithdrawalAddress"
  assert _force == self.pendingForce, "pendingForce"
  extcall rocketStorage.setWithdrawalAddress(self.nodeAddress, _newWithdrawalAddress, _force)
