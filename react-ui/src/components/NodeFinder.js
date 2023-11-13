import { useEffect, useState } from "react";
import { keccak256 } from "viem";
import RocketSplitABI from "../abi/RocketSplit.json";
import { useAccount, useContractRead, useContractWrite, useNetwork, usePrepareContractWrite, usePublicClient, useWaitForTransaction } from "wagmi";
import { normalize } from "viem/ens";

const NodeFinder = ({setWithdrawalAddress, withdrawalAddress, setNodeAddress, nodeAddress, toast, pendingWithdrawalAddress, setPendingWithdrawalAddress, setSplitAddress, isRocketSplit, setIsRocketSplit}) => {

    const [ nodeManagerAddress, setNodeManagerAddress ] = useState(null);
    const [ nodeManagerFunction, setNodeManagerFunction ] = useState(null);
    const [ ensName, setEnsName ] = useState(null);

    const emptyAddress = `0x${'0'.repeat(40)}`
    // eslint-disable-next-line no-useless-escape
    const addressPattern = '^(?:0x[0-9a-fA-F]{40})|(?:.{3,}\.eth)$'
    const addressPlaceholder = '0x... or ENS name'

    const publicClient = usePublicClient();
    const { address } = useAccount();
    const { chain } = useNetwork();

    const [toRocketSplit, setToRocketSplit] = useState(false);

    const storageContractConfig = {
        address: chain?.id === 17000 ? process.env.REACT_APP_ROCKETPOOL_STORAGE_ADDRESS_HOLESKY : process.env.REACT_APP_ROCKETPOOL_STORAGE_ADDRESS_MAINNET,
        abi: [{"inputs":[{"internalType":"bytes32","name":"_key","type":"bytes32"}],"name":"getAddress","outputs":[{"internalType":"address","name":"r","type":"address"}],"stateMutability":"view","type":"function"}, {"inputs":[{"internalType":"address","name":"_nodeAddress","type":"address"}],"name":"confirmWithdrawalAddress","outputs":[],"stateMutability":"nonpayable","type":"function"}]   
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

    // We need to know if the pendingWithdrawalAddress is a Rocketsplit address,
    // If not we can call directly to the storage contract as long as we are connected as the pending address.
    useContractRead({
        abi: RocketSplitABI.abi,
        address: pendingWithdrawalAddress,
        functionName: "guardian",
        onLoading: () => console.log("Loading..."),
        onError: (error) => setToRocketSplit(false),
        onSuccess: (result) => {
            console.log("Do we have a rocket split address?: " + result);
            setToRocketSplit(true)
        }
    });

    // Only executes when the address and functionName are set.
    useContractRead({
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
                        setPendingWithdrawalAddress(null);
                    }
                    break;
                case "getNodePendingWithdrawalAddress":
                    console.log("Node pending withdrawal address: " + result);
                    console.log("Withdrawal addresses: " + withdrawalAddress)
                    if(result !== emptyAddress && result !== withdrawalAddress) {
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
                    setPendingWithdrawalAddress(null);
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
        abi: RocketSplitABI.abi,
        functionName: "confirmWithdrawalAddress",
        args: [],
    });

    const { write: confirmWithdrawalAddress, data: confirmWithdrawalAddressData } = useContractWrite(config);
    const { isSuccess, isLoading } = useWaitForTransaction({
        hash: confirmWithdrawalAddressData?.hash,
        onLoading: () => console.log("Loading..."),
        onError: (error) => console.log("Error: " + error),
        onSuccess: (resultObj) => {
            console.log("Successfully confirmed withdrawal address!");
        }
    });

    // Prepare the contract write to update pending withdrawal address.
    const { config: confirmWithdrawalConfig } = usePrepareContractWrite({
        ...storageContractConfig,
        functionName: "confirmWithdrawalAddress",
        args: [nodeAddress]
    });

    const { write: confirmNonRPWithdrawalAddress, data: confirmNonRPWithdrawalAddressData } = useContractWrite(confirmWithdrawalConfig);
    const { isLoading: loadingNonRPChange} = useWaitForTransaction({
        hash: confirmNonRPWithdrawalAddressData?.hash,
        onLoading: () => console.log("Loading..."),
        onError: (error) => console.log("Error: " + error),
        onSuccess: (resultObj) => {
            console.log("Successfully confirmed withdrawal address!");
            setWithdrawalAddress(pendingWithdrawalAddress);
            setPendingWithdrawalAddress(null);
        }
    });

    const lookupWithdrawal = async () => {
        console.log("Looking up withdrawal for address: " + nodeAddress);

        // Reset the withdrawal address.
        setWithdrawalAddress(null);

        // Lookup ENS name if applicable.
        const lookupAddress = await publicClient.getEnsAddress({
            name: normalize(nodeAddress),
        }).catch((error) => {
            //console.log(error);
            setEnsName(null);
        });

        if(lookupAddress) {
            console.log("Setting node address to ENS");
            setEnsName(nodeAddress);
            setNodeAddress(lookupAddress);
        }
        else {
            console.log("Falling back to address.")
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
    }

    useEffect(() => {
        if(isSuccess) {
            console.log("Withdrawal address updated successfully.");
            console.log(pendingWithdrawalAddress);
            setWithdrawalAddress(pendingWithdrawalAddress);
            setPendingWithdrawalAddress(null);
            setSplitAddress(null);
            toast("Withdrawal address updated successfully.");
        }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    , [isSuccess]);

    console.log("The current widhtdrawal address is: " + isRocketSplit);

    return(
        <div className="rocket-panel">
            <h2>Enter Rocketpool Node Address:</h2>
            <input placeholder={addressPlaceholder} value={nodeAddress} onChange={(e) => { setNodeAddress(e.target.value);  setNodeManagerFunction(null)}}></input>
            <span>{ensName}</span>
            <button disabled={!address || !nodeAddress} onClick={() => lookupWithdrawal()}>Submit</button>
            {address ? <></> : <>Connect you wallet to get started.</>}
            {pendingWithdrawalAddress && toRocketSplit &&
                <div className="sub-panel"><p>Pending Node Withdrawal Address Change, <strong>migrating to Rocketsplit 🚀</strong> {pendingWithdrawalAddress}</p><button className="btn-action" onClick = {() => { confirmWithdrawalAddress?.() }}>Confirm Change</button></div>
            }
            {pendingWithdrawalAddress && !toRocketSplit && pendingWithdrawalAddress === address && // @TODO: need to ensure account connected is new withdrawal. */}
                <div className="sub-panel"><p>Pending Node Withdrawal Address Change NOT Rocketsplit: {pendingWithdrawalAddress}</p><button className="btn-action" onClick = {() => { confirmNonRPWithdrawalAddress?.() }}>Confirm Change</button></div>
            }

            {loadingNonRPChange &&
              <div className="action-panel loading">
                    <div className="spinner"></div>
                    <p>Confirming Withdrawal Change</p>
             </div>
            }

            {isLoading &&
                <div className="action-panel loading">
                    <div className="spinner"></div>
                    <p>Migrating to Rocketsplit 🚀</p>
                </div>
            }
        </div>
    )
}

export default NodeFinder;