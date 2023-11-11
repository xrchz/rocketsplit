// A list of marriages created.
import MarriageListItem from './MarriageListItem';

const MarriageList = ({nodeAddress, splitAddress, setPendingWithdrawalAddress }) => {

    // const publicClient =  usePublicClient();
    // const { address } = useAccount();

    // const [wallets, setWallets] = useState([]);

    // useEffect(() => {

    //     const fetchLogs = async () => {

    //         // In the RocektsplitABI.abi, filter the DeployRocketSplit event into a single object.
    //         const deployEvent = RocketsplitABI.abi.filter((item) => {
    //             return item.name === "DeployRocketSplit";
    //         })[0];

    //         publicClient.getLogs({
    //             address: RocketSplitFactoryAddress,
    //             event: deployEvent,
    //             args: {
    //                 node: nodeAddress,
    //                 ethOwner: address,
    //             },
    //         }).then((logs) => {
    //             console.log("We have logs!");
    //             console.log(logs);
    //             setWallets(logs);
    //         }).catch((error) => {
    //             throw error;
    //         });
    //     }

    //     if(nodeAddress && address) {
    //         console.log("Our node address is: " + nodeAddress);
    //         fetchLogs().catch((error) => {
    //             console.log(error);
    //         });
    //     }

    //     //console.log(logs);
    // }, [nodeAddress, address]);

    // if(!wallets || wallets.length == 0){
    //     return null;
    // }

    // @TODO if the current withdrawal address is a rocketsplit address... then we need to call the method on that contract.

    return (
        <div className="rocket-panel">
            <h2>Pending Marriage</h2>
            <p>Here is the marriage you just created. The next step is to set this as the withdrawal address. This needs to execute from the current withdrawal address.</p>
            <ul className="wallet-list">
                {/* {wallets.map((wallet, i) => {
                    const decodedLogs = decodeEventLog({
                        abi: RocketsplitABI.abi,
                        data: wallet.data,
                        topics: wallet.topics,
                    });
                    return <MarriageListItem key={i} splitAddress={decodedLogs.args.self} nodeAddress={nodeAddress}/>
                })} */}
                <MarriageListItem 
                    nodeAddress={nodeAddress} 
                    splitAddress={splitAddress} 
                    setPendingWithdrawalAddress={setPendingWithdrawalAddress}/>
            </ul>
        </div>
    )
}

export default MarriageList;