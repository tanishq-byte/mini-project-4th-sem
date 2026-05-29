import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "@solana/wallet-adapter-react-ui/styles.css";
import Landing from "./pages/Landing";
import OrgDashboard from "./pages/OrgDashboard";
import WorkerDashboard from "./pages/WorkerDashboard";
import Workspace from "./pages/Workspace";

function App() {
  const network = (process.env.REACT_APP_NETWORK as WalletAdapterNetwork) ?? WalletAdapterNetwork.Devnet;

  // Use custom RPC if provided, otherwise fall back to clusterApiUrl
  const endpoint = useMemo(
    () => process.env.REACT_APP_RPC_URL ?? clusterApiUrl(network),
    [network]
  );

  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/"         element={<Landing />} />
              <Route path="/org"      element={<OrgDashboard />} />
              <Route path="/worker"   element={<WorkerDashboard />} />
              <Route path="/workspace" element={<Workspace />} />
            </Routes>
          </BrowserRouter>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;