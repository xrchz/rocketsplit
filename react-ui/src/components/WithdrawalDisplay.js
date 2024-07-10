import { useAccount, useBalance, useContractRead, useContractWrite, useNetwork, usePrepareContractWrite, useWaitForTransaction } from 'wagmi'
import RocketSplitABI from '../abi/RocketSplit.json'
import RocketStorage from '../abi/RocketStorage.json'
import { useState } from 'react';
import { formatEther, keccak256, parseUnits, toHex, zeroAddress } from 'viem';
import AddressDisplay from './AddressDisplay';

const WithdrawalDisplay = ({withdrawalAddress, pendingWithdrawalAddress, setPendingWithdrawalAddress, toast}) => {
    const [isRocketSplit, setIsRocketSplit] = useState(false);
    const [isRplOwner, setIsRplOwner] = useState(true);
    const [isEthOwner, setIsEthOwner] = useState(true);
    const [ethOwnerAddress, setEthOwnerAddress] = useState("");
    const [rplOwnerAddress, setRplOwnerAddress] = useState("");
    const [ethFee, setEthFee] = useState(null);
    const [rplFee, setRplFee] = useState(null);
    const { address } = useAccount();

    // Change withdrawal address state.
    const [newWidthdrawalAddress, setNewWithdrawalAddress] = useState(null);
    const [newForce, setNewForce] = useState(false);
    const [pendingRpWithdrawalAddress, setPendingRpWithdrawalAddress] = useState(null);
    const [pendingForce, setPendingForce] = useState(null);
    const [showWithdrawalPanel, setShowWithdrawalPanel] = useState(false);
    const [showPendingWithdrawalPanel, setShowPendingWithdrawalPanel] = useState(false);
    // const [newAddressEnsName, setNewAddressEnsName] = useState(null);

    // Stake RPL state.
    const [showStakeRplPanel, setShowStakeRplPanel] = useState(false);
    const [rplStake, setRplStake] = useState("0");
    const [rplTokenAddress, setRplTokenAddress] = useState(null);
    const [rplAllowance, setRplAllowance] = useState(0);
    const [rplUserBalance, setRplUserBalance] = useState(0);
    const [hasRplStake, setHasRplStake] = useState(false);

    const [RPLRefundee, setRPLRefundee] = useState(null);
    const [RPLRefund, setRPLRefund] = useState(null);

    const [isLoading, setIsLoading] = useState(true);

    const { chain } = useNetwork();
    const rocketStorageAddress = chain?.id === 17000 ? process.env.REACT_APP_ROCKETPOOL_STORAGE_ADDRESS_HOLESKY : process.env.REACT_APP_ROCKETPOOL_STORAGE_ADDRESS_MAINNET;

    // // Check for pending withdrawal address change.
    // useContractRead({
    //     abi: RocketSplitABI,
    //     address: splitAddress,
    //     functionName: "pendingRpWithdrawalAddress",
    //     onLoading: () => console.log("Loading..."),
    //     onError: (error) => console.log("Error: " + error),
    //     onSuccess: (result) => {
    //         console.log("Pending Withdrawal: " + result);
    //     }
    // });

    // We will try to read from the withdrawal address to see if we are already a rocketsplit contract.
    useContractRead({
        abi: RocketSplitABI,
        address: withdrawalAddress,
        functionName: "guardian",
        onLoading: () => console.log("Loading..."),
        onError: (error) => setIsRocketSplit(false),
        onSuccess: (result) => {
            console.log("Result: " + result);
            setIsRocketSplit(true)
            setIsLoading(false);
        }
    });

    useContractRead({
        abi: RocketSplitABI,
        address: withdrawalAddress,
        functionName: "ETHOwner",
        onLoading: () => {},
        onError: (error) => {},
        onSuccess: (result) => {
            setEthOwnerAddress(result);
        }
    });

    useContractRead({
        abi: RocketSplitABI,
        address: withdrawalAddress,
        functionName: "RPLOwner",
        onLoading: () => {},
        onError: (error) => {},
        onSuccess: (result) => {
            setRplOwnerAddress(result);
        }
    });

    // Read the node manager address.
    useContractRead({
        address: rocketStorageAddress,
        abi: RocketStorage,
        functionName: "getAddress",
        args: [keccak256(toHex("contract.addressrocketNodeManager"))],
        onLoading: () => console.log("Loading..."),
        onError: (error) => console.log("Error: " + error),
        onSuccess: (result) => {
            console.log("Rocketpool node manager: " + result);
        }
    })

    // Get the RPL token address
    useContractRead({
        address: rocketStorageAddress,
        abi: RocketStorage,
        functionName: "getAddress",
        args: [keccak256(toHex("contract.addressrocketTokenRPL"))],
        onLoading: () => console.log("Loading..."),
        onError: (error) => console.log("Error: " + error),
        onSuccess: (result) => {
            console.log("RPL Token Address: " + result);
            setRplTokenAddress(result);
        }
    })

    const { refetch: refreshAllowance } = useContractRead({
        address: rplTokenAddress,
        abi: [{"constant":true,"inputs":[{"name":"owner","type":"address"},{"name":"spender","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"type":"function"}],
        functionName: "allowance",
        args: [address, withdrawalAddress],
        onLoading: () => console.log("Loading..."),
        onError: (error) => console.log("Error: " + error),
        onSuccess: (result) => {
            console.log("RPL Allowance: " + formatEther(result));
            setRplAllowance(formatEther(result));
        }
    })

    const { refetch: refreshRPLBalance } = useContractRead({
        address: rplTokenAddress,
        abi: [{"constant":true,"inputs":[{"name":"account","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"type":"function"}],
        functionName: "balanceOf",
        args: [address], // Address of the user whose balance you want to check
        onLoading: () => console.log("Loading..."),
        onError: (error) => console.log("Error: " + error),
        onSuccess: (result) => {
            console.log("RPL user Balance: " + formatEther(result));
            setRplUserBalance(formatEther(result));
        }
    });

    // Read the marriage contracts fees.
    useContractRead({
        address: withdrawalAddress,
        abi: RocketSplitABI,
        functionName: "ETHFee",
        onLoading: () => console.log("Loading..."),
        onError: (error) => console.log("Error: " + error),
        onSuccess: (result) => {
            console.log("ETH Fee");
            // convert values from bigint
            const numerator = parseInt(result.numerator);
            const denominator = parseInt(result.denominator);
            console.log(numerator / denominator);
            setEthFee(((numerator / denominator)*100).toFixed(2) + '%');
        }
    })

    // Read the marriage contracts fees.
    useContractRead({
        address: withdrawalAddress,
        abi: RocketSplitABI,
        functionName: "RPLFee",
        onLoading: () => console.log("Loading..."),
        onError: (error) => console.log("Error: " + error),
        onSuccess: (result) => {
            console.log("RPL Fee");

            // convert values from bigint
            const numerator = parseInt(result.numerator);
            const denominator = parseInt(result.denominator);
            console.log(numerator / denominator);
            setRplFee(((numerator / denominator)*100).toFixed(2) + '%');
        }
    })


    // Read for pending withdrawal changes.
    useContractRead({
        address: withdrawalAddress,
        abi: RocketSplitABI,
        functionName: "pendingWithdrawalAddress",
        onLoading: () => console.log("Loading..."),
        onError: (error) => console.log("Error: " + error),
        onSuccess: (result) => {
            console.log("Pending Withdrawal Address: " + result);
            console.log("Pending RP Withdrawal Addresses: " + pendingRpWithdrawalAddress);
            if(pendingWithdrawalAddress !== result && result !== zeroAddress) {
                console.log("Showing pending withdrawal panel");
                setShowPendingWithdrawalPanel(true);
            }
            setPendingRpWithdrawalAddress(result);
        }
    })

    useContractRead({
        address: withdrawalAddress,
        abi: RocketSplitABI,
        functionName: "pendingForce",
        onLoading: () => console.log("Loading..."),
        onError: (error) => console.log("Error: " + error),
        onSuccess: (result) => {
            setPendingForce(result);
        }
    })


    useContractRead({
        address: withdrawalAddress,
        abi: RocketSplitABI,
        functionName: "RPLRefundee",
        onLoading: () => console.log("Loading..."),
        onError: (error) => console.log("Error: " + error),
        onSuccess: (result) => {
            setRPLRefundee(result);
        }
    })

    useContractRead({
        address: withdrawalAddress,
        abi: RocketSplitABI,
        functionName: "RPLRefund",
        onLoading: () => console.log("Loading..."),
        onError: (error) => console.log("Error: " + error),
        onSuccess: (result) => {
            setRPLRefund(result + " RPL");
        }
    })

    const { config: rplApproveConfig } = usePrepareContractWrite({
        address: rplTokenAddress,
        abi: [{"constant":false,"inputs":[{"name":"spender","type":"address"},{"name":"value","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"type":"function"}],
        functionName: "approve",
        args: [withdrawalAddress, parseUnits(rplStake, 18)],
        onError: (error) => {
            if(error.shortMessage.includes("auth")){
                setIsRplOwner(false);
            }
        }
    });

    const { write: rplApprove, data: rplApproveData } = useContractWrite(rplApproveConfig);

    const { isLoading: rplApproveLoading } = useWaitForTransaction({
        hash: rplApproveData?.hash,
        onLoading: () => console.log("Loading..."),
        onError: (error) => console.log("Error: " + error),
        onSuccess: (result) => {
            console.log("Successfully approved RPL");
            toast.success("Successfully approved RPL");

            // We need to refresh the allowance after we approve.
            refreshAllowance?.();
        }
    });


    const { config: withdrawRPLConfig } = usePrepareContractWrite({
        address: withdrawalAddress,
        abi: RocketSplitABI,
        functionName: "withdrawRPL",
        onError: (error) => {
            if(error.shortMessage.includes("auth")){
                setIsRplOwner(false);
            }
        },
    });

    const { write: withdrawRPL } = useContractWrite(withdrawRPLConfig);

    const { config: withdrawETHConfig } = usePrepareContractWrite({
        address: withdrawalAddress,
        abi: RocketSplitABI,
        functionName: "withdrawETH",
        onError: (error) => {
            if(error.shortMessage.includes("stake")) {
                setHasRplStake(true);
            }

            if(error.shortMessage.includes("auth")){
                setIsEthOwner(false);
            }
        },
    });

    const { write: withdrawETH } = useContractWrite(withdrawETHConfig);

    const { config: withdrawRewardsConfig } = usePrepareContractWrite({
        address: withdrawalAddress,
        abi: RocketSplitABI,
        functionName: "withdrawRewards",
        onError: (error) => {
            if(error.shortMessage.includes("auth")){
                setIsRplOwner(false);
            }
        }
    })

    const {write: withdrawRewards} = useContractWrite(withdrawRewardsConfig);

    const { isLoading: withdrawalRewardsLoading } = useWaitForTransaction({
        hash: withdrawRewards?.hash,
    });

    const { config: changeWithdrawalConfig } = usePrepareContractWrite({
        address: withdrawalAddress,
        abi: RocketSplitABI,
        functionName: "changeWithdrawalAddress",
        args: [newWidthdrawalAddress, newForce],
        onError: (error) => {
            if(error.shortMessage.includes("auth")){
                setIsEthOwner(false);
            }
        }
    })

    const {write: changeWithdrawalAddress, data: changeWithdrawalAddressData} = useContractWrite(changeWithdrawalConfig);

    // Listen for a successfull (or failed) transaction.
    const {isLoading: setPendingChangeLoading } = useWaitForTransaction({
        hash: changeWithdrawalAddressData?.hash,
        onLoading: () => console.log("Loading..."),
        onError: (error) => console.log("Error: " + error),
        onSuccess: (result) => {
            console.log("Successfully changed withdrawal address to pending state");
            setShowWithdrawalPanel(false);
            setShowPendingWithdrawalPanel(true);
            setPendingRpWithdrawalAddress(newWidthdrawalAddress);
            setPendingForce(newForce);

            if(newForce) {
                setPendingWithdrawalAddress(newWidthdrawalAddress);
            }
        }
    });


    const { config: confirmChangeWithdrawalConfig } = usePrepareContractWrite({
        address: withdrawalAddress,
        abi: RocketSplitABI,
        functionName: "confirmChangeWithdrawalAddress",
        args: [pendingRpWithdrawalAddress, pendingForce],
        onError: (error) => {
            if(error.shortMessage.includes("auth")){
                setIsRplOwner(false);
            }
        }
    })

    const {write: confirmChangeWithdrawalAddress, data: confirmChangeWithdrawalAddressData} = useContractWrite(confirmChangeWithdrawalConfig);

    const {isLoading: withdrawalChangeLoading } = useWaitForTransaction({
        hash: confirmChangeWithdrawalAddressData?.hash,
        onLoading: () => console.log("Loading..."),
        onError: (error) => console.log("Error: " + error),
        onSuccess: (result) => {
            console.log("Successfully changed withdrawal address to pending state");
            setShowPendingWithdrawalPanel(false);
            setPendingWithdrawalAddress(pendingRpWithdrawalAddress);
        }
    });

    const { config: stakeRPLConfig } = usePrepareContractWrite({
        address: withdrawalAddress,
        abi: RocketSplitABI,
        functionName: "stakeRPL",
        args: [parseUnits(rplStake, 18)],
        onError: (error) => {
            if(error.shortMessage.includes("auth")){
                setIsRplOwner(false);
            }
        }
    })

    const {write: stakeRPL, data: stakeRPLData} = useContractWrite(stakeRPLConfig);

    const {isLoading: stakeRPLLoading } = useWaitForTransaction({
        hash: stakeRPLData?.hash,
        onLoading: () => console.log("Loading..."),
        onError: (error) => console.log("Error: " + error),
        onSuccess: (result) => {
            console.log("Successfully staked additional RPL.");
            setShowStakeRplPanel(false);
            toast.success("Successfully staked additional RPL.");
            refreshAllowance?.();
            refreshRPLBalance?.();
        }
    });
  

    const { data: ethBalance } = useBalance({
        address: withdrawalAddress,
    });

    const { data: rplBalance } = useBalance({
        address: withdrawalAddress,
        token: chain?.id === 17000 ? "0x1cc9cf5586522c6f483e84a19c3c2b0b6d027bf0" : "0xD33526068D116cE69F19A9ee46F0bd304F21A51f",
    });

    if(!withdrawalAddress){
        return null;
    }
    return(
        <div className="rocket-panel">
            <h2>Current Withdrawal Address:</h2>
            <p className="large-address"><strong><AddressDisplay address={withdrawalAddress}/></strong></p>
            {isRocketSplit && !isLoading && <><p className="is-rocketsplit">🚀 A RocketSplit Address</p></>}
            <div className="rocket-info-grid">
                {isRocketSplit && <p>ETH Owner: <strong><AddressDisplay address={ethOwnerAddress}/></strong></p>}
                {isRocketSplit && <p>RPL Owner: <strong><AddressDisplay address={rplOwnerAddress}/></strong></p>}
                <p>ETH Balance: <strong>{parseFloat(ethBalance?.formatted).toFixed(4)} {ethBalance?.symbol}</strong></p>
                {rplBalance?.formatted && <p>RPL Balance: <strong>{parseFloat(rplBalance?.formatted).toFixed(4)} {rplBalance?.symbol}</strong></p>}
                {ethFee && isRocketSplit && <p>ETH Fee: <strong>{ethFee}</strong></p>}
                {rplFee && isRocketSplit && <p>RPL Fee: <strong>{rplFee}</strong></p>}
            </div>
            {isRocketSplit && !isLoading && RPLRefundee && RPLRefundee !== zeroAddress && <div>{RPLRefundee} - {RPLRefund}</div>}
            {!isRocketSplit && !isLoading && <p className="not-rocketsplit">Not a RocketSplit Address</p>}
            {isRocketSplit && !isLoading &&
                <>
                <ul className="wallet-actions">
                  <li>
                    <button
                      className={isEthOwner ? '' : 'disabled'}
                      onClick={() => {
                        if (isEthOwner) {
                          setNewWithdrawalAddress(null);
                          setNewForce(false);
                          setShowWithdrawalPanel(true);
                        }
                      }}
                      disabled={!isEthOwner}
                    >
                      Change Withdrawal Address
                    </button>
                  </li>
                  <li>
                    <button
                      className={isEthOwner && !hasRplStake ? '' : 'disabled'}
                      onClick={() => {
                        if (isEthOwner && !hasRplStake) withdrawETH?.();
                      }}
                      disabled={!isEthOwner || hasRplStake}
                    >
                      Withdraw ETH
                    </button>
                    <div>(After Exit and RPL Withdrawal)</div>
                  </li>
                  <li>
                    <button
                      className={(isEthOwner || isRplOwner) ? '' : 'disabled'}
                      disabled={!(isEthOwner || isRplOwner)}
                    >
                      Change ENS Name (Coming soon)
                    </button>
                  </li>
                  <li>
                    <button
                      className={isRplOwner ? '' : 'disabled'}
                      onClick={() => {
                        if (isRplOwner) withdrawRPL?.();
                      }}
                      disabled={!isRplOwner}
                    >
                      Withdraw RPL
                    </button>
                    <div>(After Exit)</div>
                  </li>
                  <li>
                    <button
                      className={isRplOwner ? '' : 'disabled'}
                      onClick={() => {
                        if (isRplOwner) withdrawRewards?.();
                      }}
                      disabled={!isRplOwner}
                    >
                      Withdraw Rewards
                    </button>
                  </li>
                  <li>
                    <button
                      className={isRplOwner ? '' : 'disabled'}
                      onClick={() => {
                        if (isRplOwner) setShowStakeRplPanel(true);
                      }}
                      disabled={!isRplOwner}
                    >
                      Stake RPL
                    </button>
                  </li>
                </ul>
              </>
            }

            {isRocketSplit && showWithdrawalPanel && !isLoading &&
                <div className="action-panel">
                    <h2>Set pending withdrawal address change</h2>
                    <p>This transaction will set the withdrawal address into a pending state within the current Rocketsplit withdrawal address. After this is complete, the RPL owner will need to confirm to set the nodes pending withdrawal address.</p>
                    <label htmlFor="newWithdrawal">New Withdrawal Address</label>
                    <input className="address-input" type="text" id="newWithdrawal" name="newWithdrawal" onChange={(e) => { setNewWithdrawalAddress(e.target.value); }} />
                    {/* <span className="ens-label">{newAddressEnsName}</span> */}
                    <div>
                        <label htmlFor="force-change">Force?</label>
                        <input
                            type="checkbox"
                            id="force-change"
                            name="force-change"
                            onChange={(e) => { 
                                const newValue = e.target.checked ? 1 : 0;
                                setNewForce(newValue);
                            }}
                        />
                    </div>
                    <button disabled={!newWidthdrawalAddress} onClick={() => changeWithdrawalAddress?.()}>Set Pending Withdrawal Address Change</button>
                    <div className="close-panel" onClick={() => {setShowWithdrawalPanel(false)}}>Cancel</div>
                </div>
            }



            {isRocketSplit && showPendingWithdrawalPanel && pendingRpWithdrawalAddress && isRplOwner && pendingRpWithdrawalAddress !== zeroAddress &&
                <div className="sub-panel">
                    {/* Show the pending withdrawal address change and force */}
                    <h2>Confirm pending withdrawal address change</h2>
                    <p>This transaction will confirm the pending withdrawal address change.</p>
                    <p>Current pending withdrawal address: {pendingRpWithdrawalAddress}</p>
                    <p>Force: {pendingForce ? 'Y' : 'N'}</p>
                    <button onClick={() => confirmChangeWithdrawalAddress?.()}>Confirm Pending Withdrawal Address Change</button>
                </div>
            }

            {isRocketSplit && showStakeRplPanel && isRplOwner &&
                <div className="action-panel">
                    <h2>Stake additional RPL</h2>
                    <p>This will add RPL principal to the RocketSplit contract. Your current allowed allowance is {rplAllowance}. Your RPL balance is {Number(rplUserBalance).toFixed(4)}</p>
                    <label htmlFor="stakeRpl">Additional RPL:</label>
                    <input className="address-input" type="number" id="stakeRpl" name="stakeRpl" onChange={(e) => { setRplStake(e.target.value); }} />
                    {Number(rplAllowance) < Number(rplStake) && Number(rplUserBalance) >= Number(rplStake) && <button onClick={() => rplApprove?.()}>Approve RPL</button>}
                    {Number(rplAllowance) >= Number(rplStake) && Number(rplUserBalance) >= Number(rplStake) && <button disabled={!rplStake} onClick={() => stakeRPL?.()}>Stake Additional RPL</button>}
                    {Number(rplUserBalance) < Number(rplStake) && <p>Insufficient RPL balance (Balance: {rplUserBalance})</p>}
                    <div className="close-panel" onClick={() => {setShowStakeRplPanel(false)}}>Cancel</div>
                    {stakeRPLLoading &&
                        <div className="action-panel loading">
                            <div className="spinner"></div>
                            <p>Staking RPL</p>
                        </div>
                    }
                    {rplApproveLoading &&
                        <div className="action-panel loading">
                            <div className="spinner"></div>
                            <p>Approving RPL Allowance</p>
                        </div>
                    }
                </div>
            }

            {withdrawalRewardsLoading &&
                <div className="action-panel loading">
                    <div className="spinner"></div>
                    <p>Withdrawing Rewards</p>
                </div>
            }

            {withdrawalChangeLoading &&
                <div className="action-panel loading">
                    <div className="spinner"></div>
                    <p>Setting pending withdrawal change.</p>
                </div>
            }

            {setPendingChangeLoading &&
                <div className="action-panel loading">
                    <div className="spinner"></div>
                    <p>Confirming pending withdrawal change.</p>
                </div>
            }

        </div>
    )

}


export default WithdrawalDisplay