import { useBalance, useContractRead, useContractWrite, useNetwork, usePrepareContractWrite, useTransaction } from 'wagmi'
import RocketSplitABI from '../abi/RocketSplit.json'
import RocketStorageAddress from '../abi/RocketStorageAddress.json'
import RocketStorage from '../abi/RocketStorage.json'
import { useState } from 'react';
import { keccak256, toHex } from 'viem';

const WithdrawalDisplay = ({withdrawalAddress}) => {
    const [isRocketSplit, setIsRocketSplit] = useState(false);
    const [isRplOwner, setIsRplOwner] = useState(true);
    const [isEthOwner, setIsEthOwner] = useState(true);
    const [ethFee, setEthFee] = useState(null);
    const [rplFee, setRplFee] = useState(null);

    // Change withdrawal address state.
    const [newWidthdrawalAddress, setNewWithdrawalAddress] = useState(null);
    const [newForce, setNewForce] = useState(false);
    const [pendingWithdrawalAddress, setPendingWithdrawalAddress] = useState(null);
    const [pendingForce, setPendingForce] = useState(null);
    const [showWithdrawalPanel, setShowWithdrawalPanel] = useState(false);
    const [showPendingWithdrawalPanel, setShowPendingWithdrawalPanel] = useState(false);
    // const [newAddressEnsName, setNewAddressEnsName] = useState(null);


    const { chain } = useNetwork();

    // // Check for pending withdrawal address change.
    // useContractRead({
    //     abi: RocketSplitABI.abi,
    //     address: splitAddress,
    //     functionName: "pendingWithdrawalAddress",
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
        address: RocketStorageAddress,
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
            console.log(result);
            setEthFee(result.numerator / result.denominator + '%');
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
            console.log(result);
            setRplFee(result.numerator / result.denominator + '%');
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
            if(result > 0 ) {
                setShowPendingWithdrawalPanel(true);
            }
            setPendingWithdrawalAddress(result);
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
            setPendingWithdrawalAddress(newWidthdrawalAddress);
            setPendingForce(newForce);
            
        }
    });


    const { config: confirmChangeWithdrawalConfig } = usePrepareContractWrite({
        address: withdrawalAddress,
        abi: RocketSplitABI.abi,
        functionName: "confirmChangeWithdrawalAddress",
        args: [pendingWithdrawalAddress, pendingForce],
        onError: (error) => {
            if(error.shortMessage.includes("auth")){
                setIsRplOwner(false);
            }
        }
    })

    const {write: confirmChangeWithdrawalAddress, data: confirmChangeWithdrawalAddressData} = useContractWrite(confirmChangeWithdrawalConfig);

    useTransaction({
        hash: confirmChangeWithdrawalAddressData?.hash,
        onLoading: () => console.log("Loading..."),
        onError: (error) => console.log("Error: " + error),
        onSuccess: (result) => {
            console.log("Successfully changed withdrawal address to pending state");
            setShowPendingWithdrawalPanel(false);
        }
    });

    const { data: ethBalance } = useBalance({
        address: withdrawalAddress,
    });

    const { data: rplBalance } = useBalance({
        address: withdrawalAddress,
        token: chain?.id === 5 ? "0x5e932688e81a182e3de211db6544f98b8e4f89c7" : "0xD33526068D116cE69F19A9ee46F0bd304F21A51f",
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
                {ethFee && <p>ETH Fee: <strong>{ethFee}</strong></p>}
                {rplFee && <p>RPL Fee: <strong>{rplFee}</strong></p>}
            </div>
            {!isRocketSplit && <p className="not-rocketsplit">Not a RocketSplit Address</p>}
            {isRocketSplit &&
                <>
                    <ul className="wallet-actions">
                        {isRplOwner && <li onClick={() => {withdrawRewards?.();}}>Withdrawal Rewards</li>}
                        {isEthOwner && <li onClick={() =>{withdrawETH?.();}}>Withdrawal ETH</li>}
                        {isRplOwner && <li onClick={() => {withdrawRPL?.()}}>Withdrawal RPL</li>}
                        <li>Stake RPL (Coming soon)</li>
                        <li>Change ENS Name (Coming soon)</li>
                        <li onClick={() => {setNewWithdrawalAddress(null); setNewForce(false); setShowWithdrawalPanel(true)}}>Change Withdrawal Address</li>
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

            {isRocketSplit && showPendingWithdrawalPanel && pendingWithdrawalAddress && isRplOwner &&
                <div className="sub-panel">
                    {/* Show the pending withdrawal address change and force */}
                    <h2>Confirm pending withdrawal address change</h2>
                    <p>This transaction will confirm the pending withdrawal address change.</p>
                    <p>Current pending withdrawal address: {pendingWithdrawalAddress}</p>
                    <p>Force: {pendingForce ? 'Y' : 'N'}</p>
                    <button onClick={() => confirmChangeWithdrawalAddress?.()}>Confirm Pending Withdrawal Address Change</button>
                </div>
            }

        </div>
    )

}


export default WithdrawalDisplay