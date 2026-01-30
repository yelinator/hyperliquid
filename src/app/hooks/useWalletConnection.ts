import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi';

export interface WalletInfo {
  address: string;
  balance: {
    eth?: number;
    hype?: number;
    usdc?: number;
  };
  connector?: string;
}

export function useWalletConnection() {
  const { address, isConnected, connector } = useAccount();
  const { connect, connectors, error, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);

  // Get token balances
  const { data: ethBalance } = useBalance({
    address: address,
    token: undefined, // Native ETH
  });

  // Update wallet info when connected
  useEffect(() => {
    if (isConnected && address) {
      setWalletInfo({
        address,
        balance: {
          eth: ethBalance?.value ? parseFloat(ethBalance.formatted) : 0,
          hype: 1250, // Mock HYPE balance
          usdc: 500   // Mock USDC balance
        },
        connector: connector?.name
      });
    } else {
      setWalletInfo(null);
    }
  }, [isConnected, address, ethBalance, connector]);

  const connectWallet = (connector: any) => {
    try {
      connect({ connector });
    } catch (err: any) {
      console.error('Connection error:', err);
      // Handle specific WalletConnect errors
      if (err.message && err.message.includes("Origin not found on Allowlist")) {
        alert("WalletConnect configuration error. Please contact the site administrator.");
      } else {
        alert("Failed to connect wallet. Please try again.");
      }
    }
  };

  const disconnectWallet = () => {
    try {
      // Force disconnect and reset state
      disconnect();
      // Additional fallback to ensure disconnection
      setTimeout(() => {
        if (typeof window !== 'undefined' && (window as any).ethereum) {
          // Clear any wallet-specific storage
          localStorage.removeItem('wagmi.connected');
          localStorage.removeItem('wagmi.store');
          localStorage.removeItem('wagmi.wallet');
        }
        // Force a page reload to ensure clean state
        window.location.reload();
      }, 300);
    } catch (err) {
      console.error('Disconnect error:', err);
      // Ultimate fallback - force reload
      window.location.reload();
    }
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
    }
  };

  return {
    walletInfo,
    connectors,
    isConnecting: isPending,
    isConnected,
    error,
    connectWallet,
    disconnectWallet,
    copyAddress,
  };
}