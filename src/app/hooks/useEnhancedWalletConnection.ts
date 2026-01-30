import { useState, useEffect, useCallback } from 'react';
import { useAccount, useConnect, useDisconnect, useSwitchChain, useChains, useWalletClient } from 'wagmi';
import { sepolia } from 'wagmi/chains'; // Import sepolia chain from wagmi
import { usePredictionGameContract } from '../utils/evmContract';

export interface WalletInfo {
  address: `0x${string}` | undefined;
  balance: {
    eth?: number;
    hype?: number;
    usdc?: number;
  };
  connector?: string;
  chainId?: number;
}

export function useEnhancedWalletConnection() {
  const { address, isConnected, connector, chainId } = useAccount();
  const { connect, connectors, error, isPending, variables } = useConnect();
  const { disconnect, isPending: isDisconnecting } = useDisconnect(); // Get isPending from disconnect
  const { switchChain } = useSwitchChain();
  const chains = useChains();
  const { data: walletClient } = useWalletClient(); // Get the wallet client
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [isSwitchingChain, setIsSwitchingChain] = useState(false);
  const [chainSwitchError, setChainSwitchError] = useState<string | null>(null);
  
  const { getPlayerProfile, formatEther } = usePredictionGameContract();

  // Only expose primary EVM connectors: injected, walletConnect, coinbaseWallet
  // Hide per-app WalletConnect listings (e.g., Keplr, Ronin) and any non‑EVM wallets
  const filteredConnectors = connectors.filter((connector) => {
    const allowedIds = new Set(["injected", "walletConnect", "coinbaseWallet"]);
    if (!allowedIds.has((connector as any).id)) return false;

    // Extra guard against non-EVM wallets that may slip in via naming
    const lowerName = connector.name.toLowerCase();
    if (/(keplr|ronin|phantom|solana)/i.test(lowerName)) return false;

    // If coinbase connector is present without Coinbase injected, still allow (it opens SDK app)
    return true;
  });

  // Refetch deposit balance helper (keeps API compatibility with previous refetchEthBalance)
  const refetchEthBalance = useCallback(async () => {
    try {
      if (!isConnected || !address || !walletClient || chainId !== sepolia.id) return { status: 'skipped' };
      const profile = await getPlayerProfile(address);
      const depositEth = parseFloat(formatEther(profile.balance));
      setWalletInfo({
        address,
        balance: {
          eth: isFinite(depositEth) ? depositEth : 0,
        },
        connector: connector?.name,
        chainId: chainId,
      });
      return { status: 'ok' };
    } catch (e) {
      console.error('refetch deposit balance error:', e);
      return { status: 'error' };
    }
  }, [isConnected, address, walletClient, getPlayerProfile, formatEther, connector?.name, chainId]);

  // Update wallet info when connected
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isConnected || !address || !walletClient) {
      setWalletInfo(null);
      return;
    }
    if (chainId !== sepolia.id) {
      setWalletInfo({ address, balance: { eth: 0 }, connector: connector?.name, chainId });
      return;
    }
    // Fetch and set deposited balance from contract
    (async () => {
      try {
        const profile = await getPlayerProfile(address);
        const depositEth = parseFloat(formatEther(profile.balance));
        setWalletInfo({
          address,
          balance: {
            eth: isFinite(depositEth) ? depositEth : 0,
          },
          connector: connector?.name,
          chainId: chainId,
        });
      } catch (e) {
        console.error('Failed to fetch deposit balance:', e);
        setWalletInfo({
          address,
          balance: { eth: 0 },
          connector: connector?.name,
          chainId: chainId,
        });
      }
    })();
  }, [isConnected, address, walletClient, connector?.name, chainId, getPlayerProfile, formatEther]);

  // Handle chain switching with better error handling
  const switchToSepoliaChain = useCallback(async () => {
    if (!isConnected || !chainId || chainId === sepolia.id) return false;
    
    try {
      setIsSwitchingChain(true);
      setChainSwitchError(null);
      await switchChain({ chainId: sepolia.id });
      return true;
    } catch (err: any) {
      console.error('Failed to switch chain:', err);
      // Check if it's a user rejection error
      if (err?.code === 4001) {
        setChainSwitchError('Chain switch rejected by user. Please manually switch to Sepolia testnet in your wallet.');
      } else {
        setChainSwitchError('Failed to switch to Sepolia testnet. Please switch manually in your wallet.');
      }
      return false;
    } finally {
      setIsSwitchingChain(false);
    }
  }, [isConnected, chainId, switchChain]);

  // Auto-switch to Sepolia chain if needed (removed to allow user choice)
  // useEffect(() => {
  //   // Only run in browser environment
  //   if (typeof window === 'undefined') return;
  //   
  //   if (isConnected && chainId && chainId !== sepolia.id) {
  //     switchToSepoliaChain();
  //   }
  // }, [isConnected, chainId, switchToSepoliaChain]);

  const connectWallet = useCallback(async (connector: any) => {
    try {
      // Reset any previous errors
      setChainSwitchError(null);
      
      // Check if MetaMask is installed
      if (connector.name.includes('MetaMask') && typeof window !== 'undefined') {
        const ethereum = (window as any).ethereum;
        if (!ethereum) {
          throw new Error('MetaMask not detected. Please install MetaMask extension.');
        }
        
        // Check if MetaMask is the selected provider
        if (!ethereum.isMetaMask) {
          throw new Error('MetaMask not detected as the selected wallet provider.');
        }
      }
      
      connect({ connector });
    } catch (err: any) {
      console.error('Connection error:', err);
      // Provide more specific error messages
      if (err.message && err.message.includes('MetaMask')) {
        alert(`MetaMask connection failed: ${err.message}. Please make sure MetaMask is installed and unlocked.`);
      } else {
        alert(`Connection failed: ${err.message || 'Unknown error'}. Please try again.`);
      }
    }
  }, [connect]);

  const disconnectWallet = useCallback(() => {
    try {
      // Call wagmi disconnect
      disconnect();
      
      // Additional cleanup for wallet conflicts
      setTimeout(() => {
        // Clear wagmi storage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('wagmi.connected');
          localStorage.removeItem('wagmi.store');
          localStorage.removeItem('wagmi.wallet');
          sessionStorage.removeItem('wagmi.connected');
          sessionStorage.removeItem('wagmi.store');
          sessionStorage.removeItem('wagmi.wallet');
        }
        
        // Force a page reload to ensure clean state
        window.location.reload();
      }, 300);
    } catch (err) {
      console.error('Disconnect error:', err);
      // Ultimate fallback - force reload
      window.location.reload();
    }
  }, [disconnect]);

  const copyAddress = useCallback(() => {
    if (address) {
      navigator.clipboard.writeText(address);
    }
  }, [address]);

  // Format address for display
  const formatAddress = useCallback((addr: string | undefined) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  }, []);

  // Get wallet icon - returning wallet name for component-based rendering
  const getWalletIconName = useCallback((walletName: string) => {
    // Return standardized wallet names for icon mapping
    const walletIconMap: Record<string, string> = {
      'MetaMask': 'metamask',
      'Coinbase': 'coinbase',
      'WalletConnect': 'wallet',
      'Coinbase Wallet': 'coinbase',
    };

    // Check for exact matches first
    if (walletIconMap[walletName]) {
      return walletIconMap[walletName];
    }

    // Check for partial matches
    for (const [key, icon] of Object.entries(walletIconMap)) {
      if (walletName.includes(key)) {
        return icon;
      }
    }

    // Default to generic wallet icon
    return 'wallet';
  }, []);

  // Get wallet client info
  const getWalletClientInfo = useCallback(() => {
    if (!walletClient) return null;
    
    // Simplified implementation to avoid TypeScript errors
    // We'll only access properties that we know exist on the WalletClient
    return {
      address: walletClient.account?.address,
      chainId: walletClient.chain?.id,
      // Removed connector and transport properties that don't exist on WalletClient
    };
  }, [walletClient]);

  return {
    walletInfo,
    connectors: filteredConnectors, // Use filtered connectors instead of all connectors
    isConnecting: isPending,
    isDisconnecting, // Expose the disconnecting state
    isSwitchingChain,
    chainSwitchError,
    isConnected,
    error,
    connectWallet,
    disconnectWallet,
    copyAddress,
    formatAddress,
    getWalletIconName,
    switchToSepoliaChain,
    walletClient, // Expose the wallet client
    getWalletClientInfo, // Expose wallet client info function
    refetchEthBalance, // Expose balance refetch function
  };
}