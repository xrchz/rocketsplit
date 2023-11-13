import RocketStorage from '../abi/RocketStorage.json'
import { useContractWrite, useNetwork, usePrepareContractWrite, useWaitForTransaction } from "wagmi";
import AddressDisplay from './AddressDisplay';

const MarriageListItem = ({ nodeAddress, splitAddress, setPendingWithdrawalAddress, marriageDetails, isRocketSplit}) => {

    const { chain } = useNetwork();

    //const [withdrawalAddressEnabled, setWithdrawalAddressEnabled] = useState(false);

    const rocketStorageAddress = chain?.id === 17000 ? process.env.REACT_APP_ROCKETPOOL_STORAGE_ADDRESS_HOLESKY : process.env.REACT_APP_ROCKETPOOL_STORAGE_ADDRESS_MAINNET;

    const { config } = usePrepareContractWrite({
        address: rocketStorageAddress,
        abi: RocketStorage,
        functionName: "setWithdrawalAddress",
        args: [nodeAddress, splitAddress, false],
        onError: (error) => {
           // setWithdrawalAddressEnabled(false);
        },
        onLoading: () => console.log("Loading..."),
        onSuccess: (resultObj) => {
           // setWithdrawalAddressEnabled(true);
        }
    });

    const { write: setWithdrawalAddress, data } = useContractWrite(config);

    const { isLoading } = useWaitForTransaction({
        hash: data?.hash,
        onLoading: () => console.log("Loading..."),
        onError: (error) => console.log("Error: " + error),
        onSuccess: (resultObj) => {
            console.log("Successfully changed withdrawal address!");
            setPendingWithdrawalAddress(splitAddress);
        }
    });

    // return (
    //     <li className="split-listitem">
    //         <strong>{splitAddress}</strong>
    //         {withdrawalAddressEnabled && 
    //             <button className="btn-action" onClick={() => setWithdrawalAddress?.()}>Set Withdrawal Address</button>
    //         }
    //         {!withdrawalAddressEnabled &&
    //             <div className="sub-panel">
    //                 Connect as the exsisting withdrawal address to set the marriage contract.
    //             </div>
    //         }
    //         </li>
    // )

    console.log("Marriage Details");
    console.log(marriageDetails);
    console.log(isRocketSplit);
    return (
        <li className="split-listitem">
            {isRocketSplit && <strong>Current withdrawal is a rocketsplit address.</strong>}
            <div className="split-details">
                <div><AddressDisplay address={splitAddress}/></div>
                <div>
                    <div><AddressDisplay address={marriageDetails.args.ETHOwner}/></div>
                    <div>~{((parseInt(marriageDetails.args.ETHFee.numerator) / parseInt(marriageDetails.args.ETHFee.denominator))*100).toFixed(2)}%</div>
                </div>
                <div>
                   <div><AddressDisplay address={marriageDetails.args.RPLOwner}/></div>
                    <div>~{((parseInt(marriageDetails.args.RPLFee.numerator) / parseInt(marriageDetails.args.RPLFee.denominator))*100).toFixed(2)}%</div>
                </div>
                <button className="btn-action" onClick={() => {console.log("set withdrawal"); setWithdrawalAddress?.()}}>Set Withdrawal Address</button>
                {isLoading &&<div className="action-panel loading"> <div className="spinner"></div><p>Changing withdrawal address</p></div>}
            </div>
        </li>
    )
}

export default MarriageListItem;