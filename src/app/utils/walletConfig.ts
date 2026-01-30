import { type Chain } from 'viem/chains';
import { injected, walletConnect } from '@wagmi/connectors';
import { sepolia } from 'wagmi/chains'; // Import Sepolia testnet

// Define the Hyperliquid testnet chain configuration
export const hyperliquidTestnet: Chain = {
  id: 998, // Testnet ID - matching wagmiConfig
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

// Define the Hyperliquid mainnet chain configuration
export const hyperliquid: Chain = {
  id: 999, // Mainnet ID
  name: 'Hyperliquid',
  nativeCurrency: {
    decimals: 18,
    name: 'HYPE',
    symbol: 'HYPE',
  },
  rpcUrls: {
    default: { http: ['https://rpc.hyperliquid.xyz/evm'] },
    public: { http: ['https://rpc.hyperliquid.xyz/evm'] },
  },
  blockExplorers: {
    default: { name: 'Hyperliquid Explorer', url: 'https://explorer.hyperliquid.xyz' },
  },
  testnet: false,
};

// Safe check for ethereum provider
const getEthereumProvider = () => {
  if (typeof window === 'undefined') return undefined;
  
  // Handle multiple wallet injection conflicts
  const ethereum = (window as any).ethereum;
  if (!ethereum) return undefined;
  
  // Handle multiple providers if present
  if (ethereum.providers && Array.isArray(ethereum.providers)) {
    // Look for MetaMask first (but not other wallets that might be masquerading as MetaMask)
    const metaMaskProvider = ethereum.providers.find((p: any) => p.isMetaMask && !p.isBraveWallet && !p.isTokenary && !p.overrideName);
    if (metaMaskProvider) return metaMaskProvider;
    
    // Look for Coinbase Wallet
    const coinbaseProvider = ethereum.providers.find((p: any) => p.isCoinbaseWallet);
    if (coinbaseProvider) return coinbaseProvider;
    
    // Filter out conflicting providers
    const validProviders = ethereum.providers.filter((p: any) => 
      !(p.isBraveWallet || p.isTokenary || p.overrideName)
    );
    
    // Return the first valid provider or the first provider as fallback
    return validProviders.length > 0 ? validProviders[0] : ethereum.providers[0];
  }
  
  // Check for specific wallet providers to avoid conflicts
  if (ethereum.isMetaMask && !ethereum.isBraveWallet && !ethereum.isTokenary) return ethereum;
  if (ethereum.isCoinbaseWallet) return ethereum;
  
  // Return the provider if it's not a conflicting one
  if (!(ethereum.isBraveWallet || ethereum.isTokenary || ethereum.overrideName)) return ethereum;
  
  // Return undefined if we can't find a suitable provider
  return undefined;
};

// Supported wallets with their metadata
export const SUPPORTED_WALLETS = [
  {
    id: 'metamask',
    name: 'MetaMask',
    icon: '🦊',
    connectorId: 'injected',
    installed: typeof window !== 'undefined' && !!getEthereumProvider()?.isMetaMask,
    supportedChains: [sepolia.id, hyperliquid.id],
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    icon: ' Coinbase',
    connectorId: 'coinbaseWallet',
    installed: typeof window !== 'undefined' && !!getEthereumProvider()?.isCoinbaseWallet,
    supportedChains: [sepolia.id, hyperliquid.id],
  },
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    icon: '📱',
    connectorId: 'walletConnect',
    installed: false, // WalletConnect is always available
    supportedChains: [sepolia.id, hyperliquid.id],
  },
];

// WalletConnect project ID (you should replace this with your own)
export const WALLET_CONNECT_PROJECT_ID = '3f82c8a735799d19e5f8a8e2a8f1e1d8';

// WalletConnect metadata
export const WALLET_CONNECT_METADATA = {
  name: 'Hyperliquid Prediction Game',
  description: 'Predict cryptocurrency prices and win crypto rewards on Hyperliquid blockchain',
  url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001',
  icons: ['https://hyperliquid.xyz/favicon.ico'],
};