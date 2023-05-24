# @version ^0.3.7

import RocketSplit as RocketSplitInterface

interface RPLInterface:
  def balanceOf(_who: address) -> uint256: view
  def transfer(_to: address, _value: uint256) -> bool: nonpayable
  def transferFrom(_from: address, _to: address, _value: uint256) -> bool: nonpayable
  def approve(_spender: address, _value: uint256) -> bool: nonpayable

interface RocketStorageInterface:
  def getAddress(_key: bytes32) -> address: view
  def confirmWithdrawalAddress(_nodeAddress: address): nonpayable
  def setWithdrawalAddress(_nodeAddress: address, _newWithdrawalAddress: address, _confirm: bool): nonpayable

interface RocketNodeStakingInterface:
  def getNodeRPLStake(_nodeAddress: address) -> uint256: view
  def stakeRPLFor(_nodeAddress: address, _amount: uint256): nonpayable

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
rocketStorage: immutable(RocketStorageInterface)
RPLToken: immutable(RPLInterface)

guardian: public(address)
nodeAddress: public(address)
ETHOwner: public(address)
RPLOwner: public(address)
pendingWithdrawalAddress: public(address)
ETHFee: public(Fee)
RPLFee: public(Fee)
RPLPrincipal: public(uint256)

@external
def __init__(_rocketStorageAddress: address):
  rocketStorage = RocketStorageInterface(_rocketStorageAddress)
  RPLToken = RPLInterface(rocketStorage.getAddress(rocketTokenRPLKey))
  self.guardian = msg.sender

@external
@payable
def __default__():
  pass

event DeployRocketSplit:
  self: indexed(address)
  node: indexed(address)
  ETHOwner: address
  RPLOwner: address
  ETHFee: Fee
  RPLFee: Fee

@external
def deploy(_nodeAddress: address,
           _ETHOwner: address, _RPLOwner: address,
           _ETHFee: Fee, _RPLFee: Fee) -> address:
  assert self.guardian != empty(address), "proxy"
  contract: RocketSplitInterface = RocketSplitInterface(create_minimal_proxy_to(self))
  contract.setup(_nodeAddress, _ETHOwner, _RPLOwner, _ETHFee, _RPLFee)
  log DeployRocketSplit(contract.address, _nodeAddress, _ETHOwner, _RPLOwner, _ETHFee, _RPLFee)
  return contract.address

@external
def setup(_nodeAddress: address,
          _ETHOwner: address, _RPLOwner: address,
          _ETHFee: Fee, _RPLFee: Fee):
  assert self.guardian == empty(address), "auth"
  self.guardian = msg.sender
  self.nodeAddress = _nodeAddress
  self.ETHOwner = _ETHOwner
  self.RPLOwner = _RPLOwner
  self.ETHFee = _ETHFee
  self.RPLFee = _RPLFee

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
  self.RPLPrincipal = rocketNodeStaking.getNodeRPLStake(self.nodeAddress)

@external
def withdrawRPL():
  assert msg.sender == self.RPLOwner, "auth"
  rocketNodeStaking: RocketNodeStakingInterface = self._getRocketNodeStaking()
  principal: uint256 = self.RPLPrincipal
  remainder: uint256 = rocketNodeStaking.getNodeRPLStake(self.nodeAddress)
  amount: uint256 = principal - remainder
  assert RPLToken.transfer(msg.sender, amount), "transfer"
  self.RPLPrincipal = remainder

@external
def withdrawETH():
  assert msg.sender == self.ETHOwner, "auth"
  assert self._getRocketNodeStaking().getNodeRPLStake(self.nodeAddress) == 0, "RPL"
  send(msg.sender, self.balance)

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
    send(self.RPLOwner, fee)
  send(self.ETHOwner, self.balance)

@external
def confirmWithdrawalAddress():
  rocketStorage.confirmWithdrawalAddress(self.nodeAddress)

@external
def ensSetName(_name: String[256]):
  EnsRevRegInterface(
    EnsRegInterface(ensRegAddress).owner(addrReverseNode)).setName(_name)

@external
def changeWithdrawalAddress(_newWithdrawalAddress: address):
  assert msg.sender == self.ETHOwner, "auth"
  self.pendingWithdrawalAddress = _newWithdrawalAddress

@external
def confirmChangeWithdrawalAddress(_newWithdrawalAddress: address, _force: bool):
  assert msg.sender == self.RPLOwner, "auth"
  assert _newWithdrawalAddress == self.pendingWithdrawalAddress, "pendingWithdrawalAddress"
  rocketStorage.setWithdrawalAddress(self.nodeAddress, _newWithdrawalAddress, _force)
