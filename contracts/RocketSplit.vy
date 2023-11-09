#pragma version ^0.3.0

import RocketSplit as RocketSplitInterface

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
rocketStorage: immutable(RocketStorageInterface)
RPLToken: immutable(RPLInterface)

guardian: public(address)
nodeAddress: public(address)
ETHOwner: public(address)
RPLOwner: public(address)
pendingWithdrawalAddress: public(address)
pendingForce: public(bool)
ETHFee: public(Fee)
RPLFee: public(Fee)
RPLPrincipal: public(uint256)
RPLRefundee: public(address)
RPLRefund: public(uint256)

@external
def __init__(_rocketStorageAddress: address):
  rocketStorage = RocketStorageInterface(_rocketStorageAddress)
  RPLToken = RPLInterface(rocketStorage.getAddress(rocketTokenRPLKey))
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

@external
def deploy(_nodeAddress: address,
           _ETHOwner: address, _RPLOwner: address,
           _ETHFee: Fee, _RPLFee: Fee,
           _refundRPL: bool) -> address:
  assert self.guardian != empty(address), "proxy"
  contract: RocketSplitInterface = RocketSplitInterface(create_minimal_proxy_to(self))
  contract.setup(_nodeAddress, _ETHOwner, _RPLOwner, _ETHFee, _RPLFee, _refundRPL)
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
  self.ETHOwner = _ETHOwner
  self.RPLOwner = _RPLOwner
  self.ETHFee = _ETHFee
  self.RPLFee = _RPLFee
  if _refundRPL:
    self.RPLRefundee = rocketStorage.getNodeWithdrawalAddress(_nodeAddress)
    self.RPLRefund = self._getRocketNodeStaking().getNodeRPLStake(_nodeAddress)

@internal
def _getRocketNodeStaking() -> RocketNodeStakingInterface:
  rocketNodeStakingAddress: address = rocketStorage.getAddress(rocketNodeStakingKey)
  return RocketNodeStakingInterface(rocketNodeStakingAddress)

@external
def stakeRPL(_amount: uint256):
  assert msg.sender == self.RPLOwner, "auth"
  rocketNodeStaking: RocketNodeStakingInterface = self._getRocketNodeStaking()
  assert RPLToken.transferFrom(msg.sender, self, _amount), "transferFrom"
  assert RPLToken.approve(rocketNodeStaking.address, _amount), "approve"
  rocketNodeStaking.stakeRPLFor(self.nodeAddress, _amount)
  self.RPLPrincipal = rocketNodeStaking.getNodeRPLStake(self.nodeAddress) - self.RPLRefund

@external
def withdrawRPL():
  refund: uint256 = self.RPLRefund
  if 0 < refund:
    refundUpToBalance: uint256 = min(RPLToken.balanceOf(self), refund)
    assert RPLToken.transfer(self.RPLRefundee, refundUpToBalance), "refund"
    self.RPLRefund -= refundUpToBalance
    if msg.sender == self.RPLRefundee:
      return
    else:
      assert msg.sender == self.RPLOwner, "auth"
  else:
    assert msg.sender == self.RPLOwner, "auth"
  rocketNodeStaking: RocketNodeStakingInterface = self._getRocketNodeStaking()
  principal: uint256 = self.RPLPrincipal
  remainder: uint256 = rocketNodeStaking.getNodeRPLStake(self.nodeAddress)
  amount: uint256 = principal - remainder
  if 0 < amount:
    assert RPLToken.transfer(msg.sender, amount), "transfer"
    self.RPLPrincipal = remainder

@external
def withdrawETH():
  assert msg.sender == self.ETHOwner, "auth"
  assert self._getRocketNodeStaking().getNodeRPLStake(self.nodeAddress) == 0, "stake"
  assert self.RPLRefund == 0, "refund"
  assert self.RPLPrincipal == 0, "principal"
  send(msg.sender, self.balance, gas=msg.gas)

@external
def claimRewards(_rewardIndex: DynArray[uint256, 128], # TODO: MAX_INTERVALS inlined because of https://github.com/vyperlang/vyper/issues/3294
                 _amountRPL: DynArray[uint256, 128],
                 _amountETH: DynArray[uint256, 128],
                 _merkleProof: DynArray[DynArray[bytes32, 32], 128]): # TODO: MAX_PROOF_LENGTH inlined, same reason as above
  assert msg.sender == self.RPLOwner or msg.sender == self.ETHOwner, "auth"
  rocketMerkleDistributor: RocketMerkleDistributorInterface = RocketMerkleDistributorInterface(rocketStorage.getAddress(rocketMerkleDistributorKey))
  self.allowPaymentsFrom = rocketMerkleDistributor.address
  rocketMerkleDistributor.claim(self.nodeAddress, _rewardIndex, _amountRPL, _amountETH, _merkleProof)
  self.allowPaymentsFrom = empty(address)

@external
def distributeMinipoolBalance(_minipool: DynArray[address, 1024]): # TODO: MAX_MINIPOOLS inlined, as above
  assert msg.sender == self.ETHOwner or msg.sender == self.RPLOwner, "auth"
  for minipoolAddress in _minipool:
    minipool: MinipoolInterface = MinipoolInterface(minipoolAddress)
    self.allowPaymentsFrom = minipoolAddress
    minipool.distributeBalance(True)
  self.allowPaymentsFrom = empty(address)

@internal
def _calculateFee(_amount: uint256, _fee: Fee) -> uint256:
  if _fee.numerator == 0:
    return 0
  else:
    return (_amount * _fee.numerator) / _fee.denominator

@external
def withdrawRewards():
  assert msg.sender == self.RPLOwner, "auth"

  amount: uint256 = RPLToken.balanceOf(self)
  fee: uint256 = self._calculateFee(amount, self.RPLFee)
  if fee != 0:
    assert RPLToken.transfer(self.ETHOwner, fee), "transfer fee"
  assert RPLToken.transfer(self.RPLOwner, amount - fee), "transfer reward"

  fee = self._calculateFee(self.balance, self.ETHFee)
  if fee != 0:
    send(self.RPLOwner, fee, gas=msg.gas)
  send(self.ETHOwner, self.balance, gas=msg.gas)

@external
def confirmWithdrawalAddress():
  rocketStorage.confirmWithdrawalAddress(self.nodeAddress)
  rocketNodeStaking: RocketNodeStakingInterface = self._getRocketNodeStaking()
  self.RPLPrincipal = rocketNodeStaking.getNodeRPLStake(self.nodeAddress) - self.RPLRefund

@external
def ensSetName(_name: String[256]):
  assert msg.sender == self.RPLOwner or msg.sender == self.ETHOwner or msg.sender == self.guardian, "auth"
  EnsRevRegInterface(
    EnsRegInterface(ensRegAddress).owner(addrReverseNode)).setName(_name)

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
  rocketStorage.setWithdrawalAddress(self.nodeAddress, _newWithdrawalAddress, _force)
