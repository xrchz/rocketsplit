import { useBalance, useContractRead, useContractWrite, useNetwork, usePrepareContractWrite } from 'wagmi'
import RocketSplitABI from '../abi/RocketSplit.json'
import RocketStorageAddress from '../abi/RocketStorageAddress.json'
import RocketStorage from '../abi/RocketStorage.json'
import { useState } from 'react';
import { keccak256, toHex } from 'viem';

const WithdrawalDisplay = ({withdrawalAddress}) => {
    const [isRocketSplit, setIsRocketSplit] = useState(false);
    const [isRplOwner, setIsRplOwner] = useState(true);
    const [isEthOwner, setIsEthOwner] = useState(true);

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
            <p>ETH Balance: <strong>{ethBalance.formatted} {ethBalance.symbol}</strong></p>
            <p>RPL Balance: <strong>{rplBalance.formatted} {rplBalance.symbol}</strong></p>
            {!isRocketSplit && <p className="not-rocketsplit">Not a RocketSplit Address</p>}
            {isRocketSplit &&
                <>
                    <p className="is-rocketsplit">🚀 A RocketSplit Address</p>
                    <ul className="wallet-actions">
                        {isEthOwner && <li onClick={() =>{withdrawETH?.();}}>Withdrawal ETH</li>}
                        {isRplOwner && <li onClick={() => {withdrawRPL?.()}}>Withdrawal RPL</li>}
                        <li>Stake RPL (Coming soon)</li>
                        <li>Change ENS Name (Coming soon)</li>
                        <li>Change Withdrawal Address (Coming soon)</li>
                    </ul>
                </>
            }

        </div>
    )

}


export default WithdrawalDisplay