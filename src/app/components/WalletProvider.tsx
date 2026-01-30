"use client";

import { useState, useEffect } from 'react';
import { config } from '@/app/utils/wagmiConfig';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';

// Handle wallet injection conflicts
const handleWalletConflicts = () => {
  // Only run in browser environment
  if (typeof window === 'undefined') return;
  
  const ethereum = (window as any).ethereum;
  if (!ethereum) return;
  
  // Handle multiple wallet injection conflicts immediately
  // Prioritize MetaMask, then Coinbase Wallet, then others
  let provider = ethereum;
  
  if (ethereum.providers && Array.isArray(ethereum.providers)) {
    // Multiple providers injected, select the most appropriate one
    const providers = ethereum.providers;
    
    // Look for MetaMask first (but not other wallets that might be masquerading as MetaMask)
    const metaMaskProvider = providers.find((p: any) => p.isMetaMask && !p.isBraveWallet && !p.isTokenary);
    if (metaMaskProvider) {
      provider = metaMaskProvider;
      console.log('Using MetaMask provider');
    } else {
      // Look for Coinbase Wallet
      const coinbaseProvider = providers.find((p: any) => p.isCoinbaseWallet);
      if (coinbaseProvider) {
        provider = coinbaseProvider;
        console.log('Using Coinbase Wallet provider');
      } else {
        // Use the first available provider that's not a conflicting wallet
        const validProviders = providers.filter((p: any) => 
          !(p.isBraveWallet || p.isTokenary || p.overrideName)
        );
        if (validProviders.length > 0) {
          provider = validProviders[0];
          console.log('Using first valid provider');
        } else {
          // Fallback to first provider
          provider = providers[0];
          console.log('Using first available provider as fallback');
        }
      }
    }
    
    // Override window.ethereum with selected provider
    try {
      Object.defineProperty(window, 'ethereum', {
        value: provider,
        writable: false, // Make it non-writable to prevent other wallets from overriding
      });
      console.log('Successfully set window.ethereum to selected provider');
    } catch (error) {
      console.warn('Could not set window.ethereum, using assignment instead:', error);
      (window as any).ethereum = provider;
    }
  }
  
  // Log wallet injection information for debugging
  console.log('Wallet injection info:', {
    isMetaMask: !!provider.isMetaMask,
    isCoinbaseWallet: !!provider.isCoinbaseWallet,
    isBraveWallet: !!provider.isBraveWallet,
    providers: ethereum.providers?.length || 'N/A',
  });
  
  // Return the selected provider
  return provider;
};

export default function WalletProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [resolvedConfig, setResolvedConfig] = useState(config);
  
  // Handle wallet events and conflicts
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    // Handle wallet conflicts immediately
    const resolvedProvider = handleWalletConflicts();
    
    // Listen for chain changes
    const handleChainChanged = (chainId: string) => {
      console.log('Chain changed to:', chainId);
      // Reload the page to ensure proper chain synchronization
      window.location.reload();
    };
    
    // Listen for account changes
    const handleAccountsChanged = (accounts: string[]) => {
      console.log('Accounts changed:', accounts);
      if (accounts.length === 0) {
        // Wallet disconnected
        // Clear wagmi storage
        localStorage.removeItem('wagmi.connected');
        localStorage.removeItem('wagmi.store');
        localStorage.removeItem('wagmi.wallet');
        sessionStorage.removeItem('wagmi.connected');
        sessionStorage.removeItem('wagmi.store');
        sessionStorage.removeItem('wagmi.wallet');
        window.location.reload();
      }
    };
    
    // Listen for disconnect
    const handleDisconnect = () => {
      console.log('Wallet disconnected');
      // Clear wagmi storage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('wagmi.connected');
        localStorage.removeItem('wagmi.store');
        localStorage.removeItem('wagmi.wallet');
        sessionStorage.removeItem('wagmi.connected');
        sessionStorage.removeItem('wagmi.store');
        sessionStorage.removeItem('wagmi.wallet');
      }
      window.location.reload();
    };
    
    // Add event listeners with error handling
    try {
      if ((window as any).ethereum) {
        (window as any).ethereum.on?.('chainChanged', handleChainChanged);
        (window as any).ethereum.on?.('accountsChanged', handleAccountsChanged);
        (window as any).ethereum.on?.('disconnect', handleDisconnect);
      }
    } catch (error) {
      console.warn('Could not attach wallet event listeners:', error);
    }
    
    // Cleanup event listeners
    return () => {
      // Only run in browser environment
      if (typeof window === 'undefined') return;
      
      try {
        if ((window as any).ethereum) {
          (window as any).ethereum.removeListener?.('chainChanged', handleChainChanged);
          (window as any).ethereum.removeListener?.('accountsChanged', handleAccountsChanged);
          (window as any).ethereum.removeListener?.('disconnect', handleDisconnect);
        }
      } catch (error) {
        console.warn('Could not remove wallet event listeners:', error);
      }
    };
  }, []);
  
  return (
    <WagmiProvider config={resolvedConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
