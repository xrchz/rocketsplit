import './App.css';
import '@rainbow-me/rainbowkit/styles.css';
import 'react-toastify/dist/ReactToastify.css';

import { useState } from 'react';
import {
  getDefaultWallets,
  RainbowKitProvider,
  ConnectButton,
  darkTheme,
} from '@rainbow-me/rainbowkit';
import { configureChains, createConfig, WagmiConfig } from 'wagmi';
import {
  mainnet,
  localhost
} from 'wagmi/chains';
import { alchemyProvider } from 'wagmi/providers/alchemy';
import { publicProvider } from 'wagmi/providers/public';

import NodeFinder from './components/NodeFinder';
import WithdrawalDisplay from './components/WithdrawalDisplay';
import MarriageCreator from './components/MarriageCreator';

import { ToastContainer, toast } from 'react-toastify';
import MarriageList from './components/MarriageList';



// Add a custom chain to chains for http://127.0.0.1:8545
const foundary = {
  ...localhost,
  name: 'Foundry',
  id: 31337,
}

// Add holesky support.
const holesky = {
  id: 17_000,
  name: 'Holesky',
  network: 'holesky',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    public: { http: ['https://ethereum-holesky.publicnode.com'] },
    default: { http: ['https://ethereum-holesky.publicnode.com'] },
  },
  blockExplorers: {
    etherscan: { name: 'Etherscan', url: 'https://holesky.etherscan.io/' },
    default: { name: 'Etherscan', url: 'https://holesky.etherscan.io/' },
  }
};


const { chains, publicClient } = configureChains(
  [mainnet, holesky, foundary],
  [
    alchemyProvider({ apiKey: process.env.REACT_APP_ALCHEMY_KEY}),
    publicProvider()
  ]
);

const { connectors } = getDefaultWallets({
  appName: 'RocketSplit',
  projectId: process.env.REACT_APP_WALLETCONNECT_PROJECTID,
  chains
});

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient
})

function App() {

  const [withdrawalAddress, setWithdrawalAddress] = useState(null);
  const [pendingWithdrawalAddress, setPendingWithdrawalAddress] = useState(null);
  const [nodeAddress, setNodeAddress] = useState(null);
  const [splitAddress, setSplitAddress] = useState(null);

  return (
     <WagmiConfig config={wagmiConfig}>
        <RainbowKitProvider chains={chains}
          theme={darkTheme({
            borderRadius: "none",
            overlayBlur: "small",
            accentColor: "#f94a3a",
          })}>
                <div className="app">
                    <header className="header">
                      <div className="branding">
                        {/* <img src="/rocketsplit.png" alt="RocketSplit" /> */}
                        <h2>RocketSplit</h2>
                      </div>
                      <ConnectButton />
                    </header>
                    <div className="content">
                      <p className="promo">
                        Enter the Rocketpool node address below. You will be able to go the process of creating a marriage contract OR managing the functionality of an already setup marriage withdrawal address.
                      </p>
                      <NodeFinder setWithdrawalAddress={setWithdrawalAddress}
                        withdrawalAddress={withdrawalAddress}
                        setNodeAddress={setNodeAddress}
                        nodeAddress={nodeAddress}
                        pendingWithdrawalAddress={pendingWithdrawalAddress}
                        setPendingWithdrawalAddress={setPendingWithdrawalAddress}
                        setSplitAddress={setSplitAddress}
                        toast={toast}/>
                      {withdrawalAddress && <WithdrawalDisplay withdrawalAddress={withdrawalAddress} pendingWithdrawalAddress={pendingWithdrawalAddress} setPendingWithdrawalAddress={setPendingWithdrawalAddress} toast={toast} />}
                      {splitAddress && !pendingWithdrawalAddress && 
                        <MarriageList nodeAddress={nodeAddress} 
                          splitAddress={splitAddress}
                          setPendingWithdrawalAddress={setPendingWithdrawalAddress}
                          setWithdrawalAddress={setWithdrawalAddress}/>
                      }
                      {!splitAddress &&
                        <MarriageCreator withdrawalAddress={withdrawalAddress} 
                          nodeAddress={nodeAddress} 
                          setSplitAddress={setSplitAddress}/>
                      }
                    </div>
                    <ToastContainer position="bottom-right" theme="dark" />
              </div>
        </RainbowKitProvider>
      </WagmiConfig>
  );
}

export default App;
