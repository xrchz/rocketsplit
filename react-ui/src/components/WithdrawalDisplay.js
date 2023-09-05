import { useContractRead } from 'wagmi'
import RocketSplitABI from '../abi/RocketSplit.json'
import RocketStorageAddress from '../abi/RocketStorageAddress.json'
import RocketStorage from '../abi/RocketStorage.json'
import { useState } from 'react';
import { keccak256, toHex } from 'viem';

const WithdrawalDisplay = ({withdrawalAddress}) => {
    const [isRocketSplit, setIsRocketSplit] = useState(false);

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

    if(!withdrawalAddress){
        return null;
    }
    return(
        <div className="rocket-panel">
            <h2>Current Withdrawal Address:</h2>
            <p>{withdrawalAddress}</p>
            {!isRocketSplit && <p className="not-rocketsplit">Not a RocketSplit Address</p>}
            {isRocketSplit && <p className="is-rocketsplit">A RocketSplit Address</p>}
        </div>
    )

}


export default WithdrawalDisplay