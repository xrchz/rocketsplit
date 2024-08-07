import RocketSplitABI from '../abi/RocketSplit.json'
import { useEffect, useState } from 'react';
import { useContractWrite, useNetwork, usePrepareContractWrite, usePublicClient, useWaitForTransaction } from 'wagmi';
import { decodeEventLog } from 'viem';
import { normalize } from "viem/ens";

const MAX = 10000;

const MarriageCreator = ({withdrawalAddress, nodeAddress, setSplitAddress}) => {

    const [ethOwner, setEthOwner] = useState(null);
    const [rplOwner, setRplOwner] = useState(null);
    const [ethNumerator, setEthNumerator] = useState(1);
    const [ethDenominator, setEthDenominator] = useState(10000);
    const [ethFee, setEthFee] = useState(0);

    const [rplNumerator, setRplNumerator] = useState(1);
    const [rplDenominator, setRplDenominator] = useState(10000);
    const [rplFee, setRplFee] = useState(0);

    const { chain } = useNetwork();
    const publicClient = usePublicClient();

    const [ethOwnerEnsName, setEthOwnerEnsName] = useState(null);
    const [rplOwnerEnsName, setRplOwnerEnsName] = useState(null);

    const [rplRefund, setRplRefund] = useState(false);

    const [isRplOpen, setIsRplOpen] = useState(false);
    const toggleRPLAccordion = () => {
      setIsRplOpen(!isRplOpen);
    };

    const [isEthOpen, setIsEthOpen] = useState(false);
    const toggleEthAccordion = () => {
      setIsEthOpen(!isEthOpen);
    };


    // Setup the contract config.
    const { config, error } = usePrepareContractWrite({
        address: chain?.id === 17000 ? process.env.REACT_APP_ROCKETSPLIT_FACTORY_ADDRESS_HOLESKY : process.env.REACT_APP_ROCKETSPLIT_FACTORY_ADDRESS_MAINNET,
        abi: RocketSplitABI,
        functionName: "deploy",
        enabled: ethOwner && rplOwner && ethNumerator && ethDenominator && rplNumerator && rplDenominator,
        args: [nodeAddress, ethOwner, rplOwner, [parseInt(ethNumerator), parseInt(ethDenominator)], [parseInt(rplNumerator), parseInt(rplDenominator)], rplRefund],
    });

    const { write, data } = useContractWrite(config);

    const { isSuccess, isLoading, data: receipt } = useWaitForTransaction({
        hash: data?.hash,
    });

    if(isSuccess) {
        // Parse the event logs.
        const decodedLogs = decodeEventLog({
            abi: RocketSplitABI,
            data: receipt?.logs[0].data,
            topics: receipt?.logs[0].topics,
        });

        console.log("Marriage created, congrats!");

        // Pass the decoded log up to the parent.
        setSplitAddress(decodedLogs.args.self);
    }

    const createMarriage = async () => {
        // Let's create a marriage contract.
        console.log("Creating marriage contract.");
        await setETHownerENS();
        await setRPLownerENS();

        write?.();
    }

    useEffect(() => {
        if(ethNumerator && ethDenominator){
            const fee = (ethNumerator/ethDenominator)*100;
            // If fee is > 100 then show an error.
            if(fee > 100) {
                //alert("ETH Fee cannot be greater than 100%");
                setEthNumerator(1);
                setEthDenominator(10000);
            }
            setEthFee(fee);
        }
    }
    , [ethNumerator, ethDenominator]);

    useEffect(() => {
        if(rplNumerator && rplDenominator){

            const fee = (rplNumerator/rplDenominator)*100;
            // If fee is > 100 then show an error.
            if(fee > 100) {
                //alert("RPL Fee cannot be greater than 100%");
                setRplNumerator(1);
                setRplDenominator(10000);
            }

            setRplFee(fee);
        }
    }
    , [rplNumerator, rplDenominator]);

    // Set the ETH owner with support for looking up the ENS name if it is one.
    const setETHownerENS = async () => {
        console.log("Setting ETH owner ENS name for " + ethOwner);

        // // Lookup ENS name if applicable.
        const lookupAddress = await publicClient.getEnsAddress({
            name: normalize(ethOwner),
        }).catch((error) => {
            // console.log(error);
            setEthOwnerEnsName(null);
        });

        console.log("ENS lookup result: " + lookupAddress)

        if(lookupAddress) {
            console.log("Setting ENS address for ETH Owner");
            setEthOwnerEnsName(ethOwner);
            setEthOwner(lookupAddress);
        }
        else {
            console.log("No ENS used for ETH Owner")
            setEthOwner(ethOwner);
        }
    }

    const setRPLownerENS = async () => {
        console.log("Setting RPL owner ENS name for " + rplOwner);

        // // Lookup ENS name if applicable.
        const lookupAddress = await publicClient.getEnsAddress({
            name: normalize(rplOwner),
        }).catch((error) => {
            // console.log(error);
            setRplOwnerEnsName(null);
        });

        console.log("ENS lookup result: " + lookupAddress)

        if(lookupAddress) {
            console.log("Setting ENS address for RPL Owner");
            setRplOwnerEnsName(rplOwner);
            setRplOwner(lookupAddress);
        }
        else {
            console.log("No ENS used for RPL Owner")
            setRplOwner(rplOwner);
        }
    }

    if(!withdrawalAddress){
        return null;
    }

    return (
        <div className="rocket-panel">
            <h2>Rocketsplit Creator</h2>
            {/* Input with ETH Owner and RPL Owner */}
            <div>
                <div className="rocket-inputs">
                    <div className="owner-input">
                      This percentage of ETH rewards paid to the RPL owner.
                      <p>The is set to: <strong>~{parseFloat(ethFee.toFixed(2))}</strong> %</p>
                    </div>
                    <div className="fee-inputs">
                        <label htmlFor="eth-owner">ETH Owner Address</label>
                        <input required className="address-input" type="text" id="eth-owner" name="eth-owner" onChange={(e) => { setEthOwner(e.target.value); }}/>
                        <span className="ens-label">{ethOwnerEnsName}</span>
                        <label htmlFor="eth-slider">ETH Owner Fee</label>
                        <input
                            type="range"
                            min="0"
                            max={MAX}
                            step={100}
                            onChange={(e) => setEthNumerator(e.target.value)}
                            value={ethNumerator}
                            name="eth-slider"
                        />
                         <div className="advanced-inputs">
                            <div className="toggle-button" onClick={toggleEthAccordion}>
                                <span>Advanced Configuration</span>
                                {isEthOpen ? <span className="arrow">-</span> : <span className="arrow">+</span>}
                            </div>
                            {isEthOpen && <div className="fee-inputs">
                                <label htmlFor="eth-numerator">ETH Numerator</label>
                                <input type="number" id="eth-numerator" name="eth-numerator" value={ethNumerator} onChange={(e) => { setEthNumerator(e.target.value); }} />
                                <label htmlFor="eth-denominator">ETH Demoninator</label>
                                <input type="number" id="eth-denominator" name="eth-denominator" placeholder="10000" min="1" onChange={(e) => { setEthDenominator(e.target.value); }} />
                            </div>}
                        </div>
                    </div>
                </div>
                <div className="rocket-inputs">
                    <div className="owner-input">
                        This percentage of RPL rewards paid to the ETH owner.
                        <p>The is set to: <strong>~{parseFloat(rplFee.toFixed(2))}</strong> %</p>
                    </div>
                    <div className="fee-inputs">
                        <label htmlFor="rplOwner">RPL Owner Address</label>
                        <input className="address-input" type="text" id="rplOwner" name="rplOwner" onChange={(e) => { setRplOwner(e.target.value); }} />
                        <span className="ens-label">{rplOwnerEnsName}</span>
                        <label htmlFor="rpl-slider">RPL Owner Fee</label>
                        <input
                            type="range"
                            min="0"
                            max={MAX}
                            step={100}
                            onChange={(e) => setRplNumerator(e.target.value)}
                            value={rplNumerator}
                            name="rpl-slider"
                        />
                        <div className="advanced-inputs">
                            <div className="toggle-button" onClick={toggleRPLAccordion}>
                                <span>Advanced Configuration</span>
                                {isRplOpen ? <span className="arrow">-</span> : <span className="arrow">+</span>}
                            </div>
                            {isRplOpen && <div className="fee-inputs">
                                <label htmlFor="rpl-numerator">RPL Numerator</label>
                                <input type="number" id="rpl-numerator" name="rpl-numerator" value={rplNumerator} onChange={(e) => { setRplNumerator(e.target.value); }} />
                                <label htmlFor="rpl-denominator">RPL Denominator</label>
                                <input type="number" id="rpl-denominator" name="rpl-denominator" placeholder="10000" min="1" onChange={(e) => { setRplDenominator(e.target.value); }} />
                            </div>}
                        </div>
                    </div>
                </div>
                <div className="rocket-inputs">
                    <label htmlFor="rpl-refund"> Send any existing RPL on this node to the previous withdrawal address: {withdrawalAddress}</label>
                    <input type="checkbox" id="rpl-refund" name="rpl-refund" onChange={(e) => { setRplRefund(e.target.checked); }} />
                </div>
                <button disabled={!ethOwner || !rplOwner || !ethNumerator || !ethDenominator || !rplNumerator || !rplDenominator} onClick={() => createMarriage()}>Create Marriage</button>
                {isSuccess && <p>Success!</p>}
                {error && (<div>An error occurred preparing the transaction: {error.message}</div>)}
                {isLoading &&
                    <div className="action-panel loading">
                        <div className="spinner"></div>
                        <p>Creating Marriage</p>
                    </div>
                }
            </div>
        </div>
    )
}

export default MarriageCreator;