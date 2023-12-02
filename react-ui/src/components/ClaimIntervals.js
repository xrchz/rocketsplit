import { useState } from "react";
import { useContractRead, useContractReads, usePublicClient, useNetwork } from "wagmi";

const ClaimIntervals = ({ nodeAddress, setPendingClaims, setNodeMinipools }) => {

    const [rocketRewardsPoolAddress, setRocketRewardsPoolAddress] = useState(null);
    const [rocketMinipoolManagerAddress, setRocketMinipoolManagerAddress] = useState(null);
    const [rocketMerkleDistributorAddress, setRocketMerkleDistributorAddress] = useState(null);
    const [currentIntervalIndex, setCurrentIntervalIndex] = useState(0);
    const [minipoolCount, setMinipoolCount] = useState(0);
    const [unclaimedIntervals, setUnclaimedIntervals] = useState(null);

    const intervalCIDs = [];

    const publicClient = usePublicClient();
    const { chain } = useNetwork();
    const minipoolManagerAbi = [{"inputs":[{"internalType":"address","name":"_nodeAddress","type":"address"}],"name":"getNodeActiveMinipoolCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_nodeAddress","type":"address"},{"internalType":"uint256","name":"_index","type":"uint256"}],"name":"getNodeMinipoolAt","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_nodeAddress","type":"address"}],"name":"getNodeMinipoolCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_nodeAddress","type":"address"}],"name":"getNodeStakingMinipoolCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_nodeAddress","type":"address"},{"internalType":"uint256","name":"_index","type":"uint256"}],"name":"getNodeValidatingMinipoolAt","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_nodeAddress","type":"address"}],"name":"getNodeValidatingMinipoolCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_offset","type":"uint256"},{"internalType":"uint256","name":"_limit","type":"uint256"}],"name":"getPrelaunchMinipools","outputs":[{"internalType":"address[]","name":"","type":"address[]"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getStakingMinipoolCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_index","type":"uint256"}],"name":"getVacantMinipoolAt","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getVacantMinipoolCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}];
    const merkleDistributorAbi = [{"inputs":[{"internalType":"address","name":"_nodeAddress","type":"address"},{"internalType":"uint256[]","name":"_rewardIndex","type":"uint256[]"},{"internalType":"uint256[]","name":"_amountRPL","type":"uint256[]"},{"internalType":"uint256[]","name":"_amountETH","type":"uint256[]"},{"internalType":"bytes32[][]","name":"_merkleProof","type":"bytes32[][]"}],"name":"claim","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_nodeAddress","type":"address"},{"internalType":"uint256[]","name":"_rewardIndex","type":"uint256[]"},{"internalType":"uint256[]","name":"_amountRPL","type":"uint256[]"},{"internalType":"uint256[]","name":"_amountETH","type":"uint256[]"},{"internalType":"bytes32[][]","name":"_merkleProof","type":"bytes32[][]"},{"internalType":"uint256","name":"_stakeAmount","type":"uint256"}],"name":"claimAndStake","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_rewardIndex","type":"uint256"},{"internalType":"address","name":"_claimer","type":"address"}],"name":"isClaimed","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"}];
    const rewardsPoolAbi = [{"inputs":[],"name":"getRewardIndex","outputs":[{"internalType":"uint256","type":"uint256","name":"i"}],"stateMutability":"view","type":"function"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"rewardIndex","type":"uint256"},{"components":[{"internalType":"uint256","name":"rewardIndex","type":"uint256"},{"internalType":"uint256","name":"executionBlock","type":"uint256"},{"internalType":"uint256","name":"consensusBlock","type":"uint256"},{"internalType":"bytes32","name":"merkleRoot","type":"bytes32"},{"internalType":"string","name":"merkleTreeCID","type":"string"},{"internalType":"uint256","name":"intervalsPassed","type":"uint256"},{"internalType":"uint256","name":"treasuryRPL","type":"uint256"},{"internalType":"uint256[]","name":"trustedNodeRPL","type":"uint256[]"},{"internalType":"uint256[]","name":"nodeRPL","type":"uint256[]"},{"internalType":"uint256[]","name":"nodeETH","type":"uint256[]"},{"internalType":"uint256","name":"userETH","type":"uint256"}],"indexed":false,"internalType":"struct RewardSubmission","name":"submission","type":"tuple"},{"indexed":false,"internalType":"uint256","name":"intervalStartTime","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"intervalEndTime","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"time","type":"uint256"}],"name":"RewardSnapshot","type":"event"}];

    const storageContractConfig = {
        address: chain?.id === 17000 ? process.env.REACT_APP_ROCKETPOOL_STORAGE_ADDRESS_HOLESKY : process.env.REACT_APP_ROCKETPOOL_STORAGE_ADDRESS_MAINNET,
        abi: [{"inputs":[{"internalType":"bytes32","name":"_key","type":"bytes32"}],"name":"getAddress","outputs":[{"internalType":"address","name":"r","type":"address"}],"stateMutability":"view","type":"function"}]
    };

    const getAddress = (name, setAddress) => {
      useContractRead({
          ...storageContractConfig,
          functionName: "getAddress",
          args: [keccak256(`contract.address${name}`)],
          onLoading: () => console.log("Loading..."),
          onError: (error) => console.log("Error: " + error),
          onSuccess: (result) => {
              setAddress(result);
          }
      })
    }

    getAddress('rocketRewardsPool', setRocketRewardsPoolAddress)
    getAddress('rocketMinipoolManager', setRocketMinipoolManagerAddress)
    getAddress('rocketMerkleDistributor', setRocketMerkleDistributorAddress)

    useContractRead({
        address: rocketRewardsPoolAddress,
        enabled: rocketRewardsPoolAddress,
        abi: rewardsPoolAbi,
        functionName: "getRewardIndex",
        args: [],
        onError: (error) => console.log("Error: " + error),
        onSuccess: (result) => {
            console.log(`current reward interval index ${result}`) // TODO: for debug only
            setCurrentIntervalIndex(result);
        }
    })

    useContractRead({
        address: rocketMinipoolManagerAddress,
        enabled: nodeAddress && rocketMinipoolManagerAddress,
        abi: minipoolManagerAbi,
        functionName: "getNodeMinipoolCount",
        args: [nodeAddress],
        onError: (error) => console.log("Error: " + error),
        onSuccess: (result) => {
            console.log(`${nodeAddress} minipool count ${result}`) // TODO: for debug only
            setMinipoolCount(result);
        }
    })

    useContractReads({
        enabled: nodeAddress && rocketMinipoolManagerAddress && minipoolCount,
        contracts: Array.from(Array(minipoolCount).keys()).map(i =>
            ({address: rocketMinipoolManagerAddress,
              abi: minipoolManagerAbi,
              functionName: "getNodeMinipoolAt",
              args: [nodeAddress, i]})),
        onSuccess: (data) => setNodeMinipools(data)
    })

    function ensureCIDForInterval(i) {
        if (!intervalCIDs[i]) {
            return
            publicClient.getContractEvents({
                address: rocketRewardsPoolAddress,
                abi: rewardsPoolAbi,
                eventName: 'RewardSnapshot',
                args: {rewardIndex: i},
            }).then(logs => {
              if (logs.length == 1) {
                  if (logs[0].args?.submission?.merkleTreeCID) {
                    intervalCIDs[i] = logs[0].args.submission.merkleTreeCID
                    console.log(`Got ${intervalCIDs[i]} cid for ${i}`) // TODO: for debug only
                    return {rewardIndex: i, cid: intervalCIDs[i]}
                  }
                  else
                    console.error(`merkleTreeCID ${i} missing in log: ${logs}`)
              }
              else {
                  console.error(`Wrong number of logs for interval ${i}: ${logs}`)
              }
            })
        }
        else {
            return {rewardIndex: i, cid: intervalCIDs[i]}
        }
    }

    async function processCIDs(cids) {
        const pendingClaims = []
        for (const {rewardIndex, cid} of cids) {
            // TODO: look up the cid on ipfs to get the tree info
            // TODO: find the nodeAddress in the tree and add its claims {rewardIndex, ETH, RPL} to pendingClaims
        }
        setPendingClaims(pendingClaims)
    }

    useContractReads({
        enabled: nodeAddress && rocketMerkleDistributorAddress && rocketRewardsPoolAddress && currentIntervalIndex,
        contracts: Array.from(Array(currentIntervalIndex).keys()).map(i =>
            ({address: rocketMerkleDistributorAddress,
              abi: merkleDistributorAbi,
              functionName: "isClaimed"
              args: [i, nodeAddress]})),
        onSuccess: (data) => {
            const result = data.flatMap((claimed, index) => claimed ? [] : [index])
            console.log(`${nodeAddress} got ${result.length} unclaimed intervals: ${result}`) // TODO: for debug only
            setUnclaimedIntervals(result)
            Promise.all(result.map(ensureCIDForInterval)).then(processCIDs)
        }
    })


}

export default ClaimIntervals;
