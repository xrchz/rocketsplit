import { useBalance, useContractRead, useContractWrite, useNetwork, usePrepareContractWrite, useTransaction, useWaitForTransaction } from 'wagmi'
import RocketSplitABI from '../abi/RocketSplit.json'
import RocketStorage from '../abi/RocketStorage.json'
import { useState } from 'react';
import { keccak256, toHex, zeroAddress } from 'viem';

const WithdrawalDisplay = ({withdrawalAddress, pendingWithdrawalAddress, setPendingWithdrawalAddress, toast}) => {
    const [isRocketSplit, setIsRocketSplit] = useState(false);
    const [isRplOwner, setIsRplOwner] = useState(true);
    const [isEthOwner, setIsEthOwner] = useState(true);
    const [ethFee, setEthFee] = useState(null);
    const [rplFee, setRplFee] = useState(null);

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
    const [rplStake, setRplStake] = useState(0);

    const [RPLRefundee, setRPLRefundee] = useState(null);
    const [RPLRefund, setRPLRefund] = useState(null);


    const { chain } = useNetwork();
    const rocketStorageAddress = chain?.id === 17000 ? process.env.REACT_APP_ROCKETPOOL_STORAGE_ADDRESS_HOLESKY : process.env.REACT_APP_ROCKETPOOL_STORAGE_ADDRESS_MAINNET;

    // // Check for pending withdrawal address change.
    // useContractRead({
    //     abi: RocketSplitABI.abi,
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
        abi: RocketSplitABI.abi,
        address: withdrawalAddress,
        functionName: "guardian",
        onLoading: () => console.log("Loading..."),
        onError: (error) => setIsRocketSplit(false),
        onSuccess: (result) => {
            console.log("Result: " + result);
            setIsRocketSplit(true)
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

    // Read the marriage contracts fees.
    useContractRead({
        address: withdrawalAddress,
        abi: RocketSplitABI.abi,
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
        abi: RocketSplitABI.abi,
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
        abi: RocketSplitABI.abi,
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
        abi: RocketSplitABI.abi,
        functionName: "pendingForce",
        onLoading: () => console.log("Loading..."),
        onError: (error) => console.log("Error: " + error),
        onSuccess: (result) => {
            setPendingForce(result);
        }
    })


    useContractRead({
        address: withdrawalAddress,
        abi: RocketSplitABI.abi,
        functionName: "RPLRefundee",
        onLoading: () => console.log("Loading..."),
        onError: (error) => console.log("Error: " + error),
        onSuccess: (result) => {
            setRPLRefundee(result);
        }
    })

    useContractRead({
        address: withdrawalAddress,
        abi: RocketSplitABI.abi,
        functionName: "RPLRefund",
        onLoading: () => console.log("Loading..."),
        onError: (error) => console.log("Error: " + error),
        onSuccess: (result) => {
            setRPLRefund(result + " RPL");
        }
    })



    const { config: withdrawRPLConfig } = usePrepareContractWrite({
        address: withdrawalAddress,
        abi: RocketSplitABI.abi,
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
        abi: RocketSplitABI.abi,
        functionName: "withdrawETH",
        onError: (error) => {
            if(error.shortMessage.includes("auth")){
                setIsEthOwner(false);
            }
        },
    });

    const { write: withdrawETH } = useContractWrite(withdrawETHConfig);

    const { config: withdrawRewardsConfig } = usePrepareContractWrite({
        address: withdrawalAddress,
        abi: RocketSplitABI.abi,
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
        abi: RocketSplitABI.abi,
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
    useTransaction({
        hash: changeWithdrawalAddressData?.hash,
        onLoading: () => console.log("Loading..."),
        onError: (error) => console.log("Error: " + error),
        onSuccess: (result) => {
            console.log("Successfully changed withdrawal address to pending state");
            setShowWithdrawalPanel(false);
            setShowPendingWithdrawalPanel(true);
            setPendingRpWithdrawalAddress(newWidthdrawalAddress);
            setPendingForce(newForce);

            if(!newForce) {
                setPendingWithdrawalAddress(newWidthdrawalAddress);
            }
        }
    });


    const { config: confirmChangeWithdrawalConfig } = usePrepareContractWrite({
        address: withdrawalAddress,
        abi: RocketSplitABI.abi,
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
    });

    useTransaction({
        hash: confirmChangeWithdrawalAddressData?.hash,
        onLoading: () => console.log("Loading..."),
        onError: (error) => console.log("Error: " + error),
        onSuccess: (result) => {
            console.log("Successfully changed withdrawal address to pending state");
            setShowPendingWithdrawalPanel(false);
        }
    });

    const { config: stakeRPLConfig } = usePrepareContractWrite({
        address: withdrawalAddress,
        abi: RocketSplitABI.abi,
        functionName: "stakeRPL",
        args: [rplStake],
        onError: (error) => {
            if(error.shortMessage.includes("auth")){
                setIsRplOwner(false);
            }

            if(error.shortMessage.includes("transfer amount exceeds balance")){
                toast.error("Insufficient RPL balance");
            }
        }
    })

    const {write: stakeRPL, data: stakeRPLData} = useContractWrite(stakeRPLConfig);

    useTransaction({
        hash: stakeRPLData?.hash,
        onLoading: () => console.log("Loading..."),
        onError: (error) => {
            console.log("Error: " + error);
        },
        onSuccess: (result) => {
            console.log("Successfully staked RPL");
            setShowStakeRplPanel(false);
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
            <p>{withdrawalAddress}</p>
            {isRocketSplit && <><p className="is-rocketsplit">🚀 A RocketSplit Address</p></>}
            <div className="rocket-info-grid">
                <p>ETH Balance: <strong>{parseFloat(ethBalance?.formatted).toFixed(4)} {ethBalance?.symbol}</strong></p>
                {rplBalance?.formatted && <p>RPL Balance: <strong>{parseFloat(rplBalance?.formatted).toFixed(4)} {rplBalance?.symbol}</strong></p>}
                {ethFee && isRocketSplit && <p>ETH Fee: <strong>{ethFee}</strong></p>}
                {rplFee && isRocketSplit && <p>RPL Fee: <strong>{rplFee}</strong></p>}
            </div>
            {isRocketSplit && RPLRefundee && RPLRefundee !== zeroAddress && <div>{RPLRefundee} - {RPLRefund}</div>}
            {!isRocketSplit && <p className="not-rocketsplit">Not a RocketSplit Address</p>}
            {isRocketSplit &&
                <>
                    <ul className="wallet-actions">
                        {isRplOwner && <li onClick={() => {withdrawRewards?.();}}>Withdraw Rewards</li>}
                        {isEthOwner && <li onClick={() =>{withdrawETH?.();}}>Withdraw ETH</li>}
                        {isRplOwner && <li onClick={() => {withdrawRPL?.()}}>Withdraw RPL</li>}
                        {isRplOwner && <li onClick={() => {setShowStakeRplPanel(true)}}>Stake RPL</li>}
                        {isEthOwner &&<li onClick={() => {setNewWithdrawalAddress(null); setNewForce(false); setShowWithdrawalPanel(true)}}>Change Withdrawal Address</li>}
                        {(isEthOwner || isRplOwner) && <li>Change ENS Name (Coming soon)</li>}
                    </ul>
                </>
            }

            {isRocketSplit && showWithdrawalPanel &&
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



            {isRocketSplit && showPendingWithdrawalPanel && pendingRpWithdrawalAddress && isRplOwner &&
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
                    <p>This will add RPL principal to the RocketSplit contract</p>
                    <label htmlFor="stakeRpl">Additional RPL:</label>
                    <input className="address-input" type="text" id="stakeRpl" name="stakeRpl" onChange={(e) => { setRplStake(e.target.value); }} />
                    <button disabled={!rplStake} onClick={() => stakeRPL?.()}>Stake Additional RPL</button>
                    <div className="close-panel" onClick={() => {setShowStakeRplPanel(false)}}>Cancel</div>
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

        </div>
    )

}


export default WithdrawalDisplay