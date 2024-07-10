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
            const pastBlock = latestBlock - BigInt(5000);   // @TODO: probably should make this variable.

            // In the RocektsplitABI.abi, filter the DeployRocketSplit event into a single object.
            const deployEvent = RocketSplitABI.filter((item) => {
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
                // Reverse the ordering of the logs so the most recent is first.
                logs.reverse();
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
    }, [nodeAddress, address, splitAddress]);


    return (
        <div className="rocket-panel">
            <h2>Pending Rocketsplits</h2>
            <p>Last created Rocketsplit Address(s):</p>
            <div className="wallet-list">
                {wallets.map((wallet, i) => {
                    const decodedLogs = decodeEventLog({
                        abi: RocketSplitABI,
                        data: wallet.data,
                        topics: wallet.topics,
                    });
                    return <MarriageListItem key={i} splitAddress={decodedLogs.args.self} nodeAddress={nodeAddress} marriageDetails={decodedLogs} setPendingWithdrawalAddress={setPendingWithdrawalAddress} isRocketSplit={isRocketSplit}/>
                })}
                {wallets.length === 0 && <div className="rocket-info-grid">No Rocketsplit addresses found, create one below.</div>}
            </div>
        </div>
    )
}

export default MarriageList;