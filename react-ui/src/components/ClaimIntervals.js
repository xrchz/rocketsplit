import { useState } from "react";
import { useContractRead, useContractReads, useNetwork } from "wagmi";

const ClaimIntervals = ({ nodeAddress, setPendingClaims, setNodeMinipools }) => {

    const [rocketRewardsPoolAddress, setRocketRewardsPoolAddress] = useState(null);
    const [rocketMinipoolManagerAddress, setRocketMinipoolManagerAddress] = useState(null);
    const [currentIntervalIndex, setCurrentIntervalIndex] = useState(0);
    const [validatingMinipoolCount, setValidatingMinipoolCount] = useState(0);

    const { chain } = useNetwork();
    const minipoolManagerAbi = [{"inputs":[{"internalType":"address","name":"_nodeAddress","type":"address"}],"name":"getNodeActiveMinipoolCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_nodeAddress","type":"address"},{"internalType":"uint256","name":"_index","type":"uint256"}],"name":"getNodeMinipoolAt","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_nodeAddress","type":"address"}],"name":"getNodeMinipoolCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_nodeAddress","type":"address"}],"name":"getNodeStakingMinipoolCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_nodeAddress","type":"address"},{"internalType":"uint256","name":"_index","type":"uint256"}],"name":"getNodeValidatingMinipoolAt","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_nodeAddress","type":"address"}],"name":"getNodeValidatingMinipoolCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_offset","type":"uint256"},{"internalType":"uint256","name":"_limit","type":"uint256"}],"name":"getPrelaunchMinipools","outputs":[{"internalType":"address[]","name":"","type":"address[]"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getStakingMinipoolCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_index","type":"uint256"}],"name":"getVacantMinipoolAt","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getVacantMinipoolCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}]

    const storageContractConfig = {
        address: chain?.id === 17000 ? process.env.REACT_APP_ROCKETPOOL_STORAGE_ADDRESS_HOLESKY : process.env.REACT_APP_ROCKETPOOL_STORAGE_ADDRESS_MAINNET,
        abi: [{"inputs":[{"internalType":"bytes32","name":"_key","type":"bytes32"}],"name":"getAddress","outputs":[{"internalType":"address","name":"r","type":"address"}],"stateMutability":"view","type":"function"}]
    };

    useContractRead({
        ...storageContractConfig,
        functionName: "getAddress",
        args: [keccak256("contract.addressrocketRewardsPool")],
        onLoading: () => console.log("Loading..."),
        onError: (error) => console.log("Error: " + error),
        onSuccess: (result) => {
            setRocketRewardsPoolAddress(result);
        }
    })

    useContractRead({
        ...storageContractConfig,
        functionName: "getAddress",
        args: [keccak256("contract.addressrocketMinipoolManager")],
        onLoading: () => console.log("Loading..."),
        onError: (error) => console.log("Error: " + error),
        onSuccess: (result) => {
            setRocketMinipoolManagerAddress(result);
        }
    })

    useContractRead({
        address: rocketRewardsPoolAddress,
        enabled: rocketRewardsPoolAddress,
        abi: [{"inputs":[],"name":"getRewardIndex","outputs":[{"internalType":"uint256","type":"uint256","name":"i"}],"stateMutability":"view","type":"function"}],
        functionName: "getRewardIndex",
        args: [],
        onError: (error) => console.log("Error: " + error),
        onSuccess: (result) => {
            setCurrentIntervalIndex(result);
        }
    })

    useContractRead({
        address: rocketMinipoolManagerAddress,
        enabled: nodeAddress && rocketMinipoolManagerAddress,
        abi: minipoolManagerAbi,
        functionName: "getNodeValidatingMinipoolCount",
        args: [nodeAddress],
        onError: (error) => console.log("Error: " + error),
        onSuccess: (result) => {
            setValidatingMinipoolCount(result);
        }
    })

    useContractReads({
        enabled: nodeAddress && rocketMinipoolManagerAddress && validatingMinipoolCount,
        contracts: Array.from(Array(validatingMinipoolCount).keys()).map(i =>
          ({address: rocketMinipoolManagerAddress,
            abi: minipoolManagerAbi,
            functionName: "getNodeValidatingMinipoolAt",
            args: [nodeAddress, i]})),
        onSuccess: (data) => setNodeMinipools(data)
    })

}

export default ClaimIntervals;
