import { useEffect, useState } from "react";
import { formatEther, keccak256 } from "viem";
import { useContractRead, useContractReads, usePublicClient, useNetwork, usePrepareContractWrite, useContractWrite, useWaitForTransaction } from "wagmi";
import RocketSplitABI from '../abi/RocketSplit.json'
import AddressDisplay from "./AddressDisplay";

const ClaimIntervals = ({ nodeAddress, withdrawalAddress }) => {

    const [rocketRewardsPoolAddress, setRocketRewardsPoolAddress] = useState(null);
    const [rocketMinipoolManagerAddress, setRocketMinipoolManagerAddress] = useState(null);
    const [rocketMerkleDistributorAddress, setRocketMerkleDistributorAddress] = useState(null);
    const [currentIntervalIndex, setCurrentIntervalIndex] = useState(0);
    const [minipoolCount, setMinipoolCount] = useState(0);
    const [pendingClaims, setPendingClaims] = useState([]);
    const [selectedClaims, setSelectedClaims] = useState([]);

    const [nodeMinipools, setNodeMinipools] = useState([]);
    const [selectedMinipools, setSelectedMinipools] = useState([]);

    const [feeDistributorAddress, setFeeDistributorAddress] = useState('');
    const [feeDistributorBalance, setFeeDistributorBalance] = useState(null);

    const [claimableRPL, setClaimableRPL] = useState(null);
    const [claimableETH, setClaimableETH] = useState(null);
    const [claimableMinipoolETH, setClaimableMinipoolETH] = useState(null);
    const [pendingClaimableRPL, setPendingClaimableRPL] = useState(null);
    const [pendingClaimableETH, setPendingClaimableETH] = useState(null);
    const [rewardsLoading, setRewardsLoading] = useState(true);

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

        setClaimableETH(parseFloat(formatEther(totalETH)).toFixed(4) + " ETH");
        setClaimableRPL(parseFloat(formatEther(totalRPL)).toFixed(4) + " RPL");
    }, [pendingClaims])

    useEffect(() => {
        // Calulate the totat ETH and RPL selected for claiming.
        let totalETH = 0n;
        let totalRPL = 0n;
        for (const claim of selectedClaims) {
            totalETH += claim.amountETH;
            totalRPL += claim.amountRPL;
        }

        setPendingClaimableETH(parseFloat(formatEther(totalETH)).toFixed(4) + " ETH");
        setPendingClaimableRPL(parseFloat(formatEther(totalRPL)).toFixed(4) + " RPL");
    }, [selectedClaims])

    useEffect(() => {
        // Calculate the total amount being claimed from selectedMinipools.
        let totalETH = 0n;
        for (const minipool of selectedMinipools) {
            totalETH += minipool.balance;
        }
        setClaimableMinipoolETH(parseFloat(formatEther(totalETH)).toFixed(4) + " ETH");
    }, [selectedMinipools])


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

    const { refetch: refreshMinipools } = useContractReads({
        enabled: nodeAddress && rocketMinipoolManagerAddress && minipoolCount > 0,
        contracts: Array.from(Array(Number(minipoolCount)).keys()).map(i =>
            ({address: rocketMinipoolManagerAddress,
              abi: minipoolManagerAbi,
              functionName: "getNodeMinipoolAt",
              args: [nodeAddress, i]})),
        onSuccess: async (data) => {
            // Get the balance of all the addresses and store it in the data.balance property
            const updatedData = await Promise.all(data.map(async (minipool, index) => {
                const balance = await publicClient.getBalance({address: minipool.result});
                return {...minipool, balance};
            }));
            setNodeMinipools(updatedData)
        }
    })

    async function loadIntervalProofs(unclaimedIntervals) {
      const pendingClaims = [];

      try {
          for (const interval of unclaimedIntervals) { // Loop through given intervals
              const chainName = chain?.id === 17000 ? "holesky" : "mainnet";
              let url = new URL(`/rocket-pool/rewards-trees/main/${chainName}/rp-rewards-${chainName}-${interval}.json`, 'https://raw.githubusercontent.com/');

              console.log("Requesting tree for interval " + interval);
              const res = await fetch(url);

              if (!res.ok) { // Check if the HTTP request returned a non-successful response status
                  console.log(`Failed to fetch data for interval ${interval}, continuing to next.`);
                  continue; // Continue to next interval if fetch fails
              }

              console.log("Parsing tree for interval " + interval);
              const data = await res.json();
              const tree = data.nodeRewards;
              const claim = tree[nodeAddress.toLowerCase()];

              if (claim) {
                  pendingClaims.push({
                      rewardIndex: interval,
                      amountETH: BigInt(claim.smoothingPoolEth),
                      amountRPL: BigInt(claim.collateralRpl),
                      merkleProof: claim.merkleProof
                  });
              }
          }

          setRewardsLoading(false);
          setPendingClaims(pendingClaims);
      } catch (e) {
          console.error("An error occurred in loadIntervalProofs: ", e);
      }
    }

    const {refetch: refreshUnclaimedIntervals } = useContractReads({
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
            loadIntervalProofs(result)
        },
    })

    const { refetch: refreshDistributor } = useContractRead({
        address: withdrawalAddress,
        abi: RocketSplitABI.abi,
        functionName: "distributor",
        enabled: withdrawalAddress,
        onLoading: () => console.log("Loading..."),
        onError: (error) => console.log("Error: " + error),
        onSuccess: async (result) => { 
            // Get the balance of the distributor
            const balance = await publicClient.getBalance({address: result})

            console.log(`fee distributor ${result} balance ${balance}`) // TODO: for debug only
            setFeeDistributorAddress(result);
            setFeeDistributorBalance(balance);
        }
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

    const { write: claimRewards, data: claimRewardsData } = useContractWrite(config);

    const { isLoading: claimRewardsLoading } = useWaitForTransaction({
        hash: claimRewardsData?.hash,
        onSuccess: (result) => {
            // Read the contract again to update the pending claims.
            refreshUnclaimedIntervals?.();
        }
    });

    const { config: minipoolDistroConfig } = usePrepareContractWrite({
        address: withdrawalAddress,
        abi: RocketSplitABI.abi,
        functionName: "distributeMinipoolBalance",
        args: [selectedMinipools.map(claim => claim.result)],
        enabled: selectedMinipools.length > 0,
        onLoading: () => console.log("Loading..."),
        onError: (error) => console.log("Error: " + error),
    })

    const { write: distributeMinipoolBalance, data: distributeMinipoolBalanceData } = useContractWrite(minipoolDistroConfig);

    const { isLoading: distributeMinipoolBalanceLoading } = useWaitForTransaction({
        hash: distributeMinipoolBalanceData?.hash,
        onSuccess: (result) => {
            // Read the contract again to update the minipool balances.
            refreshMinipools?.();
        }
    });

    const { config: feeDistributorConfig } = usePrepareContractWrite({
        address: withdrawalAddress,
        abi: RocketSplitABI.abi,
        functionName: "claimDistributorRewards",
        args: [],
        onLoading: () => console.log("Loading..."),
        onError: (error) => console.log("Error: " + error),
    })

    const { write: claimDistributorRewards, data: claimDistributorRewardsData } = useContractWrite(feeDistributorConfig);

    const { isLoading: claimDistributorRewardsLoading } = useWaitForTransaction({
        hash: claimDistributorRewardsData?.hash,
        onSuccess: (result) => {
            console.log(`claimDistributorRewards`)
            // Read the contract again to update the fee distributor balance.
            refreshDistributor?.();
        }
    });

    const claimInterval = (index) => {
        const claim = pendingClaims[index];

        if (selectedClaims.includes(claim)) {
            // Remove claim from selectedClaims if it's already there
            setSelectedClaims(selectedClaims.filter(c => c !== claim));
        } else {
            // Add claim to selectedClaims if it's not there
            setSelectedClaims([...selectedClaims, claim]);
        }
    }

    const minipoolToggle = (index) => {
        const minipool = nodeMinipools[index];

        if (selectedMinipools.includes(minipool)) {
            // Remove minipool from selectedMinipools if it's already there
            setSelectedMinipools(selectedMinipools.filter(m => m !== minipool));
        } else {
            // Add minipool to selectedMinipools if it's not there
            setSelectedMinipools([...selectedMinipools, minipool]);
        }
    }

    return (
        <>

        <div className="rocket-panel">
           {claimRewardsLoading &&
                <div className="action-panel loading">
                    <div className="spinner"></div>
                    <p>Distributing Rewards</p>
                </div>
            }
            {rewardsLoading &&
                <div className="action-panel loading">
                    <div className="spinner"></div>
                    <p>Searching for claimable rewards</p>
                </div>
            }
            <h2>Available Rewards:</h2>
            { pendingClaims && <>{pendingClaims.length} claimable rewards totaling {claimableETH} and {claimableRPL}</> }

            { pendingClaims && pendingClaims.length > 0 &&
              <>
              <button className="btn-action" onClick={() => claimRewards?.()}  disabled={selectedClaims.length === 0}>Claim Rewards of {pendingClaimableETH} and {pendingClaimableRPL}</button>
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
              </>
            }
        </div>
        <div className="rocket-panel">
            {distributeMinipoolBalanceLoading &&
                <div className="action-panel loading">
                    <div className="spinner"></div>
                    <p>Distributing Minipools Balances</p>
                </div>
            }
            <h2>Minipool Balances </h2>
                <p>You have {minipoolCount.toString()} Minipool(s).</p>
                <button className="btn-action" onClick={() => distributeMinipoolBalance?.()}  disabled={selectedMinipools.length === 0}>Distribute Minipool Balance of {claimableMinipoolETH}</button>

                <table>
                <thead>
                    <tr>
                        <th>Minipool Address</th>
                        <th>Amount ETH</th>
                        <th><input type="checkbox" onClick={(e) => setSelectedMinipools(e.target.checked ? nodeMinipools : []) }/></th>
                    </tr>
                </thead>
                <tbody>
                    {nodeMinipools.map((minipool, index) => (
                    <tr key={index}>
                        <td><AddressDisplay address={minipool.result}/></td>
                        <td>{minipool.balance ? parseFloat(formatEther(minipool.balance)).toFixed(4) + " ETH" : "0 ETH"}</td>
                        <td>
                        <input
                            type="checkbox"
                            checked={selectedMinipools.includes(minipool)}
                            onChange={() => minipoolToggle(index)}
                        />
                        </td>
                    </tr>
                    ))}
                </tbody>
            </table>
        </div>
        <div className="rocket-panel">
            {claimDistributorRewardsLoading &&
                <div className="action-panel loading">
                    <div className="spinner"></div>
                    <p>Claiming Distribution Rewards</p>
                </div>
            }
            <h2>Fee Distributor</h2>
            <button className="btn-action" onClick={() => claimDistributorRewards?.()}>Distribute Balance</button>     
            <table>
                <thead>
                    <tr>
                        <th>Fee Distributor</th>
                        <th>Amount ETH</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><AddressDisplay address={feeDistributorAddress}/></td>
                        <td>{feeDistributorBalance ? parseFloat(formatEther(feeDistributorBalance)).toFixed(4) + " ETH" : "0 ETH"}</td>
                    </tr>
                </tbody>
            </table>
        </div>
        </>
    )

}

export default ClaimIntervals;
