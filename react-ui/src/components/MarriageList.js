// A list of marriages created.
import { useAccount, useNetwork, usePublicClient } from 'wagmi';
import MarriageListItem from './MarriageListItem';
import { useEffect, useState } from 'react';
import RocketSplitABI from '../abi/RocketSplit.json'
import { decodeEventLog } from 'viem';

const MarriageList = ({nodeAddress, splitAddress, setPendingWithdrawalAddress, isRocketSplit }) => {

    const publicClient =  usePublicClient();
    const { address } = useAccount();
    const { chain } = useNetwork();
    const [wallets, setWallets] = useState([]);
    const rocketSplitFactoryAddress = chain?.id === 17000 ? process.env.REACT_APP_ROCKETSPLIT_FACTORY_ADDRESS_HOLESKY : process.env.REACT_APP_ROCKETSPLIT_FACTORY_ADDRESS_MAINNET;


    useEffect(() => {

        const fetchLogs = async () => {

            const latestBlock = await publicClient.getBlockNumber();
            const pastBlock = latestBlock - BigInt(5000);

            // In the RocektsplitABI.abi, filter the DeployRocketSplit event into a single object.
            const deployEvent = RocketSplitABI.abi.filter((item) => {
                return item.name === "DeployRocketSplit";
            })[0];

            publicClient.getLogs({
                address: rocketSplitFactoryAddress,
                event: deployEvent,
                args: {
                    node: nodeAddress,
                },
                fromBlock: pastBlock,
                toBlock: latestBlock,
            }).then((logs) => {
                console.log("We have our logs")
                console.log(logs);
                setWallets(logs);
            }).catch((error) => {
                throw error;
            });
        }
        if(nodeAddress && address) {
            console.log("Our node address is: " + nodeAddress);
            console.log("Fetching logs for our node");
            fetchLogs().catch((error) => {
                console.log("Error fetching logs")
                console.log(error);
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodeAddress, address]);


    return (
        <div className="rocket-panel">
            <h2>Pending Rocketsplits</h2>
            <p>Last created Rocketsplit Address:</p>
            <ul className="wallet-list">
                <li className="split-listitem">
                    <div className="split-details">
                        <div>Rocketsplit Address</div>
                        <div>
                            <div>ETH Owner</div>
                            <div></div>
                        </div>
                        <div>
                            <div>RPL Owner</div>
                            <div></div>
                        </div>
                        <div>Set Withdrawal Address</div>
                    </div>
                </li>
                {wallets.map((wallet, i) => {
                    const decodedLogs = decodeEventLog({
                        abi: RocketSplitABI.abi,
                        data: wallet.data,
                        topics: wallet.topics,
                    });
                    return <MarriageListItem key={i} splitAddress={decodedLogs.args.self} nodeAddress={nodeAddress} marriageDetails={decodedLogs} setPendingWithdrawalAddress={setPendingWithdrawalAddress} isRocketSplit={isRocketSplit}/>
                })}
                {/* <MarriageListItem 
                    nodeAddress={nodeAddress} 
                    splitAddress={splitAddress} 
                    setPendingWithdrawalAddress={setPendingWithdrawalAddress}/> */}
            </ul>
        </div>
    )
}

export default MarriageList;