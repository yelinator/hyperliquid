"use client";

import { EnhancedWalletConnect } from '@/app/components/EnhancedWalletConnect';
import { useEnhancedWalletConnection } from '@/app/hooks/useEnhancedWalletConnection';

export default function WalletDemoPage() {
  const { walletInfo, isConnected } = useEnhancedWalletConnection();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center py-6 border-b border-gray-800">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
            Kairos Prediction Game
          </h1>
          <EnhancedWalletConnect />
        </header>

        <main className="mt-12">
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-6">Hyperliquid Wallet Integration</h2>
            <p className="text-gray-300 mb-12 max-w-2xl mx-auto">
              Professional wallet connect system with support for MetaMask, Coinbase Wallet, and WalletConnect.
              Auto-switches to Hyperliquid chain and displays wallet information.
            </p>

            {isConnected && walletInfo ? (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 max-w-2xl mx-auto border border-gray-700">
                <h3 className="text-2xl font-semibold mb-6">Wallet Connected</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-900/50 p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Address</p>
                    <p className="font-mono text-lg">{walletInfo.address}</p>
                  </div>
                  <div className="bg-gray-900/50 p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Connector</p>
                    <p className="font-mono text-lg">{walletInfo.connector}</p>
                  </div>
                  <div className="bg-gray-900/50 p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">ETH Balance</p>
                    <p className="font-mono text-lg">{walletInfo.balance.eth?.toFixed(4) || '0.0000'} ETH</p>
                  </div>
                  <div className="bg-gray-900/50 p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Chain ID</p>
                    <p className="font-mono text-lg">{walletInfo.chainId}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-12 max-w-2xl mx-auto border border-gray-700">
                <h3 className="text-2xl font-semibold mb-4">Connect Your Wallet</h3>
                <p className="text-gray-300 mb-8">
                  Connect your wallet to start playing the Kairos Prediction Game on Hyperliquid.
                </p>
                <EnhancedWalletConnect />
              </div>
            )}
          </div>
        </main>

        <footer className="mt-24 text-center text-gray-500 text-sm">
          <p>© 2025 Kairos Prediction Game. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}