import RocketStorage from '../abi/RocketStorage.json'
import RocketStorageAddress from '../abi/RocketStorageAddress.json'
import { useContractWrite, usePrepareContractWrite, useWaitForTransaction } from "wagmi";

const MarriageListItem = ({ nodeAddress, splitAddress, setPendingWithdrawalAddress }) => {

    const { config } = usePrepareContractWrite({
        address: RocketStorageAddress,
        abi: RocketStorage,
        functionName: "setWithdrawalAddress",
        args: [nodeAddress, splitAddress, false],
        onError: (error) => console.log("Error: " + error),
        onLoading: () => console.log("Loading..."),
        onSuccess: (resultObj) => {
             console.log(resultObj);
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
            <span className="btn-action" onClick={() => setWithdrawalAddress?.()}>Set Withdrawal Address</span>
        </li>
    )
}

export default MarriageListItem;