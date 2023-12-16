import { useEffect, useState } from "react";
import { formatEther, keccak256 } from "viem";
import { useContractRead, useContractReads, usePublicClient, useNetwork, usePrepareContractWrite, useContractWrite } from "wagmi";
import zstd from 'zstandard-wasm';
import RocketSplitABI from '../abi/RocketSplit.json'

const ClaimIntervals = ({ nodeAddress, withdrawalAddress }) => {

    const [rocketRewardsPoolAddress, setRocketRewardsPoolAddress] = useState(null);
    const [rocketMinipoolManagerAddress, setRocketMinipoolManagerAddress] = useState(null);
    const [rocketMerkleDistributorAddress, setRocketMerkleDistributorAddress] = useState(null);
    const [currentIntervalIndex, setCurrentIntervalIndex] = useState(0);
    const [minipoolCount, setMinipoolCount] = useState(0);
    const [unclaimedIntervals, setUnclaimedIntervals] = useState(null);
    const [pendingClaims, setPendingClaims] = useState([]);
    const [selectedClaims, setSelectedClaims] = useState([]);

    const [nodeMinipools, setNodeMinipools] = useState([]);

    const [claimableRPL, setClaimableRPL] = useState(null);
    const [claimableETH, setClaimableETH] = useState(null);

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

    useEffect(() => {
        // Calculate total rewards in both ETH and RPL for all pendingClaims
        let totalETH = 0n;
        let totalRPL = 0n;
        for (const claim of pendingClaims) {
            totalETH += claim.amountETH;
            totalRPL += claim.amountRPL;
        }

        setClaimableETH(totalETH);
        setClaimableRPL(totalRPL);
    }, [pendingClaims])


    //--------------------------------------------------------------------------------
    // Get the various addresses we need.
    //--------------------------------------------------------------------------------
    useContractRead({
        ...storageContractConfig,
        functionName: "getAddress",
        args: [keccak256(`contract.addressrocketRewardsPool`)],
        onLoading: () => console.log("Loading..."),
        onError: (error) => console.log("Error: " + error),
        onSuccess: (result) => {
            console.log(`rocketRewardsPoolAddress ${result}`)
            setRocketRewardsPoolAddress(result);
        }
    })

    useContractRead({
        ...storageContractConfig,
        functionName: "getAddress",
        args: [keccak256(`contract.addressrocketMinipoolManager`)],
        onLoading: () => console.log("Loading..."),
        onError: (error) => console.log("Error: " + error),
        onSuccess: (result) => {
            console.log(`rocketMinipoolManagerAddress ${result}`)
            setRocketMinipoolManagerAddress(result);
        }
    })

    useContractRead({
        ...storageContractConfig,
        functionName: "getAddress",
        args: [keccak256(`contract.addressrocketMerkleDistributorMainnet`)],
        onLoading: () => console.log("Loading..."),
        onError: (error) => console.log("Error: " + error),
        onSuccess: (result) => {
            console.log(`rocketMerkleDistributorAddress ${result}`)
            setRocketMerkleDistributorAddress(result);
        }
    })
    //--------------------------------------------------------------------------------

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
        enabled: nodeAddress && rocketMinipoolManagerAddress && minipoolCount > 0,
        contracts: Array.from(Array(Number(minipoolCount)).keys()).map(i =>
            ({address: rocketMinipoolManagerAddress,
              abi: minipoolManagerAbi,
              functionName: "getNodeMinipoolAt",
              args: [nodeAddress, i]})),
        onSuccess: (data) => setNodeMinipools(data)
    })

    async function ensureCIDForInterval(i) {
        const batchSize = 50000n;
        const currentBlockNumber = await publicClient.getBlockNumber();
        let fromBlock = chain?.id === 17000 ? 42724n : 15342713n;  // What block did the reward contract get deployed?
        let toBlock;

        while (fromBlock < currentBlockNumber) {
            toBlock = fromBlock + batchSize - 1n;
            if (toBlock > currentBlockNumber) {
                toBlock = currentBlockNumber;
            }

            if (!intervalCIDs[i]) {
                try {
                    const logs = await publicClient.getContractEvents({
                        address: rocketRewardsPoolAddress,
                        abi: rewardsPoolAbi,
                        eventName: 'RewardSnapshot',
                        args: { rewardIndex: i },
                        fromBlock: fromBlock,
                        toBlock: toBlock,
                    });

                    if (logs.length == 1) {
                        if (logs[0].args?.submission?.merkleTreeCID) {
                            intervalCIDs[i] = logs[0].args.submission.merkleTreeCID;
                            console.log(`Got ${intervalCIDs[i]} cid for ${i}`); // for debug
                            return { rewardIndex: i, cid: intervalCIDs[i] };
                        } else {
                            console.error(`merkleTreeCID ${i} missing in log: ${logs}`);
                        }
                    } else {
                        console.error(`Wrong number of logs for interval ${i}: ${logs}`);
                    }
                } catch (error) {
                    console.error(`Error fetching events for interval ${i}: ${error}`);
                }
            } else {
                return { rewardIndex: i, cid: intervalCIDs[i] };
            }

            fromBlock = toBlock + 1n;
        }
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function processCIDs(cids) {

        // filter out undefined cids
        // Seems like we can just shift the array. Are rewards 0 indexed?
        cids = cids.filter(cid => cid)

        await zstd.loadWASM()
        const pendingClaims = []

        try {
            for (const {rewardIndex, cid} of cids) {
                const url = new URL(`/ipfs/${cid}/rp-rewards-${chain.name.toLowerCase()}-${rewardIndex}.json.zst`, 'https://cloudflare-ipfs.com/')
                console.log("Requesting tree " + url.toString())
                const res = await fetch(url)

                const decoder = new TextDecoder()
                const compressed = new Uint8Array(await res.arrayBuffer())
                const tree = JSON.parse(decoder.decode(zstd.decompress(compressed))).nodeRewards
                const claim = tree[nodeAddress.toLowerCase()]

                if(claim) {
                    pendingClaims.push({
                        rewardIndex,
                        amountETH: BigInt(claim.smoothingPoolEth),
                        amountRPL: BigInt(claim.collateralRpl),
                        merkleProof: claim.merkleProof
                    })
                }

                sleep(1000)
            }

            setPendingClaims(pendingClaims)
        }
        catch (e) {
            console.error(e)
        }
    }

    useContractReads({
        enabled: chain && nodeAddress && rocketMerkleDistributorAddress && rocketRewardsPoolAddress && currentIntervalIndex,
        contracts:
            Array.from(Array(Number(currentIntervalIndex)).keys()).map(i => ({
                address: rocketMerkleDistributorAddress,
                abi: merkleDistributorAbi,
                functionName: "isClaimed",
                args: [i, nodeAddress]
            }))
        ,
        onSuccess: (data) => {
            const result = data.map((claimed, index) => !claimed.result ? index : null).filter(index => index !== null);
            console.log(`${nodeAddress} got ${result.length} unclaimed intervals: ${result}`) // TODO: for debug only

            setUnclaimedIntervals(result)
            Promise.all(result.map(ensureCIDForInterval)).then(processCIDs)
        },
    })

    const { config } = usePrepareContractWrite({
        address: withdrawalAddress,
        abi: RocketSplitABI.abi,
        functionName: "claimMerkleRewards",
        args: [selectedClaims.map(claim => claim.rewardIndex), selectedClaims.map(claim => claim.amountRPL), selectedClaims.map(claim => claim.amountETH), selectedClaims.map(claim => claim.merkleProof)],
        onLoading: () => console.log("Loading..."),
        onError: (error) => console.log("Error: " + error),
        onSuccess: (result) => {
            console.log(`claim result ${result}`)
        }
    })

    const { write: claimRewards } = useContractWrite(config);


    const claimInterval = async (index) => {
        const claim = pendingClaims[index];

        if (selectedClaims.includes(claim)) {
            // Remove claim from selectedClaims if it's already there
            setSelectedClaims(selectedClaims.filter(c => c !== claim));
        } else {
            // Add claim to selectedClaims if it's not there
            setSelectedClaims([...selectedClaims, claim]);
        }
    }

    console.log("selectedClaims: " + selectedClaims);

    return (
        <>
        <div className="rocket-panel">
            <h2>Available Rewards:</h2>
            { unclaimedIntervals && <>{unclaimedIntervals.length} claimable rewards totaling {parseFloat(formatEther(claimableETH)).toFixed(4)} ETH and {parseFloat(formatEther(claimableRPL)).toFixed(4)} RPL</> }
            <button className="btn-action" onClick={() => claimRewards?.()}  disabled={selectedClaims.length === 0}>Claim Rewards</button>

            <table>
                <thead>
                    <tr>
                        <th>Interval</th>
                        <th>Amount ETH</th>
                        <th>Amount RPL</th>
                        <th><input type="checkbox" onClick={(e) => setSelectedClaims(e.target.checked ? pendingClaims : [])}/></th>
                    </tr>
                </thead>
                <tbody>
                    {pendingClaims.map((claim, index) => (
                    <tr key={index}>
                        <td>{claim.rewardIndex}</td>
                        <td>{parseFloat(formatEther(claim.amountETH)).toFixed(4)} ETH</td>
                        <td>{parseFloat(formatEther(claim.amountRPL)).toFixed(4)} RPL</td>
                        <td>
                        <input
                            type="checkbox"
                            checked={selectedClaims.includes(claim)}
                            onChange={() => claimInterval(index)}
                        />
                        </td>
                    </tr>
                    ))}
                </tbody>
            </table>
        </div>
        <div className="rocket-panel">
            <h2>Minipool Balances: </h2>
                <p>You have {minipoolCount.toString()} Minipools:</p>
                {nodeMinipools.map((minipool, index) => (
                    <p key={index}>{minipool.result}</p>
                ))}
        </div>
        </>
    )

}

export default ClaimIntervals;
