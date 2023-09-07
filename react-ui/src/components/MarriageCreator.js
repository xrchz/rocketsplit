import RocketSplitABI from '../abi/RocketSplit.json'
import { useEffect, useState } from 'react';
import { useContractWrite, useNetwork, usePrepareContractWrite, useWaitForTransaction } from 'wagmi';
import { decodeEventLog } from 'viem';

const MAX = 10000;

const MarriageCreator = ({withdrawalAddress, nodeAddress, setSplitAddress}) => {

    const [ethOwner, setEthOwner] = useState(null);
    const [rplOwner, setRplOwner] = useState(null);
    const [ethNumerator, setEthNumerator] = useState(1);
    const [ethDenominator, setEthDenominator] = useState(100);
    const [ethFee, setEthFee] = useState(0);

    const [rplNumerator, setRplNumerator] = useState(1);
    const [rplDenominator, setRplDenominator] = useState(100);
    const [rplFee, setRplFee] = useState(0);

    const { chain } = useNetwork();

    const [isRplOpen, setIsRplOpen] = useState(false);
    const toggleRPLAccordion = () => {
      setIsRplOpen(!isRplOpen);
    };

    const [isEthOpen, setIsEthOpen] = useState(false);
    const toggleEthAccordion = () => {
      setIsEthOpen(!isEthOpen);
    };


    // Setup the contract config.
    const { config } = usePrepareContractWrite({
        address: chain?.id === 5 ? process.env.REACT_APP_ROCKETSPLIT_FACTORY_ADDRESS_GOERLI : process.env.REACT_APP_ROCKETSPLIT_FACTORY_ADDRESS_MAINNET,
        abi: RocketSplitABI.abi,
        functionName: "deploy",
        enabled: ethOwner && rplOwner && ethNumerator && ethDenominator && rplNumerator && rplDenominator,
        args: [nodeAddress, ethOwner, rplOwner, [parseInt(ethNumerator), parseInt(ethDenominator)], [parseInt(rplNumerator), parseInt(rplDenominator)]],
    });

    const { write, data } = useContractWrite(config);

    const { isSuccess, data: receipt } = useWaitForTransaction({
        hash: data?.hash,
    });

    const createMarriage = () => {
        // Let's create a marriage contract.
        console.log("Creating marriage contract.");

        write?.();
    }

    useEffect(() => {
        if(ethNumerator && ethDenominator){
            setEthFee(ethNumerator/ethDenominator);
        }
    }
    , [ethNumerator, ethDenominator]);

    useEffect(() => {
        if(rplNumerator && rplDenominator){
            setRplFee(rplNumerator/rplDenominator);
        }
    }
    , [rplNumerator, rplDenominator]);


    if(!withdrawalAddress){
        return null;
    }

    if(isSuccess) {
        // Parse the event logs.
        const decodedLogs = decodeEventLog({
            abi: RocketSplitABI.abi,
            data: receipt?.logs[0].data,
            topics: receipt?.logs[0].topics,
        });

        // Pass the decoded log up to the parent.
        setSplitAddress(decodedLogs.args.self);
    }

    return (
        <div className="rocket-panel">
            <h2>Marriage Creator</h2>
            {/* Input with ETH Owner and RPL Owner */}
            <div>
                <div className="rocket-inputs">
                    <div className="owner-input">
                      The ETH owner is the one that is bringing the ETH to the table. This section defines the fee they will charge in RPL for the use of their ETH.
                      <p>The fee is set to: <strong>~{parseFloat(ethFee.toFixed(2))}</strong> %</p>
                    </div>
                    <div className="fee-inputs">
                        <label htmlFor="eth-owner">ETH Owner Address</label>
                        <input required className="address-input" type="text" id="eth-owner" name="eth-owner" onChange={(e) => { setEthOwner(e.target.value); }}/>
                        <label htmlFor="eth-slider">ETH Owner Fee</label>
                        <input
                            type="range"
                            min="0"
                            max={MAX}
                            step={1}
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
                                <input type="number" id="eth-denominator" name="eth-denominator" placeholder="100" min="1" onChange={(e) => { setEthDenominator(e.target.value); }} />
                            </div>}
                        </div>
                    </div>
                </div>
                <div className="rocket-inputs">
                    <div className="owner-input">
                        The RPL owner is the one bringing the RPL to the table. This section defines the fee they will charge in ETH for the use of their RPL.
                        <p>The fee is set to: <strong>~{parseFloat(rplFee.toFixed(2))}</strong> %</p>
                    </div>
                    <div className="fee-inputs">
                        <label htmlFor="rplOwner">RPL Owner Address</label>
                        <input className="address-input" type="text" id="rplOwner" name="rplOwner" onChange={(e) => { setRplOwner(e.target.value); }} />
                        <label htmlFor="rpl-slider">RPL Owner Fee</label>
                        <input
                            type="range"
                            min="0"
                            max={MAX}
                            step={1}
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
                                <input type="number" id="rpl-denominator" name="rpl-denominator" placeholder="100" min="1" onChange={(e) => { setRplDenominator(e.target.value); }} />
                            </div>}
                        </div>
                    </div>
                </div>
                <button disabled={!ethOwner || !rplOwner || !ethNumerator || !ethDenominator || !rplNumerator || !rplDenominator} onClick={() => createMarriage()}>Create Marriage</button>
                {isSuccess && <p>Success!</p>}
            </div>
        </div>
    )
}

export default MarriageCreator;