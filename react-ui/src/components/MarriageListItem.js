import RocketStorage from '../abi/RocketStorage.json'
import { useContractWrite, useNetwork, usePrepareContractWrite, useWaitForTransaction } from "wagmi";
import { useState } from 'react';

const MarriageListItem = ({ nodeAddress, splitAddress, setPendingWithdrawalAddress }) => {

    const { chain } = useNetwork();

    const [withdrawalAddressEnabled, setWithdrawalAddressEnabled] = useState(false);

    const rocketStorageAddress = chain?.id === 17000 ? process.env.REACT_APP_ROCKETPOOL_STORAGE_ADDRESS_HOLESKY : process.env.REACT_APP_ROCKETPOOL_STORAGE_ADDRESS_MAINNET;

    const { config } = usePrepareContractWrite({
        address: rocketStorageAddress,
        abi: RocketStorage,
        functionName: "setWithdrawalAddress",
        args: [nodeAddress, splitAddress, false],
        onError: (error) => {
            setWithdrawalAddressEnabled(false);
        },
        onLoading: () => console.log("Loading..."),
        onSuccess: (resultObj) => {
            setWithdrawalAddressEnabled(true);
        }
    });

    const { write: setWithdrawalAddress, data } = useContractWrite(config);

    useWaitForTransaction({
        hash: data?.hash,
        onLoading: () => console.log("Loading..."),
        onError: (error) => console.log("Error: " + error),
        onSuccess: (resultObj) => {
            console.log("Successfully changed withdrawal address!");
            setPendingWithdrawalAddress(splitAddress);
        }
    });


    return (
        <li className="split-listitem">
            <strong>{splitAddress}</strong>
            {withdrawalAddressEnabled && 
                <button className="btn-action" onClick={() => setWithdrawalAddress?.()}>Set Withdrawal Address</button>
            }
            {!withdrawalAddressEnabled &&
                <div className="sub-panel">
                    Connect as the exsisting withdrawal address to set the marriage contract.
                </div>
            }
            </li>
    )
}

export default MarriageListItem;