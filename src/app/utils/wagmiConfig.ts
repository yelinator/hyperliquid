import { createConfig, http } from 'wagmi';
import { type Chain } from 'viem/chains';
import { injected, walletConnect, coinbaseWallet } from '@wagmi/connectors';
import { sepolia } from 'wagmi/chains'; // Import Sepolia testnet

// Define the Hyperliquid testnet chain configuration
export const hyperliquidTestnet: Chain = {
  id: 998, // Testnet ID
  name: 'Hyperliquid Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Test ETH',
    symbol: 'tETH',
  },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.hyperliquid.xyz'] },
    public: { http: ['https://rpc.testnet.hyperliquid.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Hyperliquid Testnet Explorer', url: 'https://explorer.testnet.hyperliquid.xyz' },
  },
  testnet: true,
};

// Create wagmi config with dynamic imports to avoid server-side issues
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

const baseConnectors = [
  injected(),
      coinbaseWallet({
        appName: 'Hyperliquid Prediction Game',
        appLogoUrl: 'https://hyperliquid.xyz/favicon.ico',
      }),];

const connectors = [...baseConnectors];

if (walletConnectProjectId && walletConnectProjectId !== 'YOUR_WALLETCONNECT_PROJECT_ID_HERE') {
  connectors.push(
    walletConnect({
      projectId: walletConnectProjectId,
      showQrModal: true,
      metadata: {
        name: 'Hyperliquid Prediction Game',
        description: 'Predict cryptocurrency prices and win crypto rewards on Hyperliquid blockchain',
        url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001',
        icons: ['https://hyperliquid.xyz/favicon.ico'],
      },
    })
  );
}

export const config = createConfig({
  chains: [sepolia, hyperliquidTestnet],
  connectors,
  transports: {
    [sepolia.id]: http(),
    [hyperliquidTestnet.id]: http(),
  },
});

export default config;