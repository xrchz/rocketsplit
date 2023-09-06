import { useEffect, useState } from "react";
import { keccak256 } from "viem";
import RocketsplitABI from "../abi/RocketSplit.json";
import { useChainId, useContractRead, useContractWrite, useNetwork, usePrepareContractWrite, usePublicClient, useWaitForTransaction } from "wagmi";
import { normalize } from "viem/ens";

const NodeFinder = ({setWithdrawalAddress, setNodeAddress, nodeAddress, toast, pendingWithdrawalAddress, setPendingWithdrawalAddress}) => {

    const [ nodeManagerAddress, setNodeManagerAddress ] = useState(null);
    const [ nodeManagerFunction, setNodeManagerFunction ] = useState(null);
    const [ ensName, setEnsName ] = useState(null);

    const emptyAddress = `0x${'0'.repeat(40)}`
    const addressPattern = '^(?:0x[0-9a-fA-F]{40})|(?:.{3,}\.eth)$'
    const addressPlaceholder = '0x... or ENS name'

    const publicClient = usePublicClient();
    const { chain } = useNetwork();

    const storageContractConfig = {
        address: (chain.id === 1 || chain.id === 31337) ? "0x1d8f8f00cfa6758d7bE78336684788Fb0ee0Fa46" : "0xd8Cd47263414aFEca62d6e2a3917d6600abDceB3",
        abi: [{"inputs":[{"internalType":"bytes32","name":"_key","type":"bytes32"}],"name":"getAddress","outputs":[{"internalType":"address","name":"r","type":"address"}],"stateMutability":"view","type":"function"}]   
    };

    const nodeManagerConfig = {
        abi:[{"inputs":[{"internalType":"address","name":"_nodeAddress","type":"address"}],"name":"getNodeExists","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_nodeAddress","type":"address"}],"name":"getNodePendingWithdrawalAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_nodeAddress","type":"address"}],"name":"getNodeRegistrationTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_nodeAddress","type":"address"}],"name":"getNodeTimezoneLocation","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_nodeAddress","type":"address"}],"name":"getNodeWithdrawalAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"}],
    };

    // Get the node manager address.
    useContractRead({
        ...storageContractConfig,
        functionName: "getAddress",
        args: [keccak256("contract.addressrocketNodeManager")],
        onLoading: () => console.log("Loading..."),
        onError: (error) => console.log("Error: " + error),
        onSuccess: (result) => {
            setNodeManagerAddress(result);
        }
    })

    // Only executes when the address and functionName are set.
    const {refetch: nodeManager} = useContractRead({
        ...nodeManagerConfig,
        address: nodeManagerAddress,
        functionName: nodeManagerFunction,
        args: [nodeAddress],
        enabled: nodeManagerAddress && nodeManagerFunction,
        onLoading: () => console.log("Loading..."),
        onError: (error) => {
            toast.error("Node node found. Please try again.");
        },
        onSuccess: (result) => {
            switch(nodeManagerFunction) {
                case "getNodeExists":
                    console.log("Node exists: " + result);
                    if(result === true) {
                        setNodeManagerFunction("getNodeWithdrawalAddress");
                    }
                    else {
                        toast.error("Node not found. Please try again.");
                    }
                    break;
                case "getNodePendingWithdrawalAddress":
                    console.log("Node pending withdrawal address: " + result);

                    if(result != emptyAddress) {
                        setPendingWithdrawalAddress(result);
                    }
                    break;
                case "getNodeRegistrationTime":
                    console.log("Node registration time: " + result);
                    break;
                case "getNodeTimezoneLocation":
                    console.log("Node timezone location: " + result);
                    break;
                case "getNodeWithdrawalAddress":
                    console.log("Node withdrawal address: " + result);
                    setWithdrawalAddress(result);
                    // Check for pending withdrawal address change.
                    setNodeManagerFunction("getNodePendingWithdrawalAddress");
                    break;
                default:
                    console.log("Invalid function");
            }
        }
    })

    // Prepare the contract write to update pending withdrawal address.
    const { config } = usePrepareContractWrite({
        address: pendingWithdrawalAddress,
        abi: RocketsplitABI.abi,
        functionName: "confirmWithdrawalAddress",
        args: [],
    });

    const { write: confirmWithdrawalAddress, data } = useContractWrite(config);
    const { data: receipt, isSuccess } = useWaitForTransaction({
        hash: data?.hash,
    });

    const lookupWithdrawal = async () => {
        console.log("Looking up withdrawal for address: " + nodeAddress);

        // Reset the withdrawal address.
        setWithdrawalAddress(null);

        // Lookup ENS name if applicable.
        const lookupAddress = await publicClient.getEnsAddress({
            name: normalize(nodeAddress),
        }).catch((error) => {
            console.log(error);
            setEnsName(null);
        });

        if(lookupAddress) {
            console.log("Setting node address to ENS");
            setEnsName(nodeAddress);
            setNodeAddress(lookupAddress);
        }
        else {
            setNodeAddress(nodeAddress);
        }

        // Ensure node address is valid and following the correct pattern.
        if(nodeAddress !== null && !nodeAddress.match(addressPattern)) {
            toast.error("Invalid Address");
            setWithdrawalAddress(null)
            setEnsName(null);
            return;
        }

        // Lets check up on the node.
        setNodeManagerFunction("getNodeExists");
        //nodeManager?.();
    }
    useEffect(() => {
        if(isSuccess) {
            setWithdrawalAddress(pendingWithdrawalAddress);
            setPendingWithdrawalAddress(null);
            toast("Withdrawal address updated successfully.");
        }
    }
    , [isSuccess]);

    return(
        <div className="rocket-panel">
            <h2>Enter Rocketpool Node Address:</h2>
            <input placeholder={addressPlaceholder} value={nodeAddress} onChange={(e) => { setNodeAddress(e.target.value);  setNodeManagerFunction(null)}}></input>
            <span>{ensName}</span>
            <button onClick={() => lookupWithdrawal()}>Submit</button>
            {pendingWithdrawalAddress && <><p>Pending Withdrawal Address: {pendingWithdrawalAddress}</p><a className="btn-action" href='#' onClick = {() => { confirmWithdrawalAddress?.() }}>Confirm Change</a></>}
        </div>
    )
}

export default NodeFinder;