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

    return (
        <div className="rocket-panel">
            <h2>Pending Marriage</h2>
            <p>Here is the marriage you just created.</p>
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