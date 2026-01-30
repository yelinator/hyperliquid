"use client";

import { useWalletConnection } from "@/app/hooks/useWalletConnection";
import { Button } from "@/app/components/ui/button";

export function ClientWalletButton() {
  const {
    walletInfo,
    isConnecting,
    isConnected,
    connectWallet,
    disconnectWallet,
  } = useWalletConnection();

  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="flex items-center">
      {isConnected && walletInfo && (
        <div className="text-xs text-gray-400 mr-2">
          Hyperliquid Testnet
        </div>
      )}
      <Button
        className="glass-button px-4 py-2 rounded-lg font-medium"
        onClick={() => isConnected ? disconnectWallet() : connectWallet(null)}
        disabled={isConnecting}
      >
        {isConnecting ? 'Connecting...' : 
         isConnected && walletInfo ? formatAddress(walletInfo.address) : 'Connect Wallet'}
      </Button>
    </div>
  );
}
