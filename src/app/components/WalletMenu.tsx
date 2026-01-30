"use client";

import { useState } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { useRouter } from 'next/navigation';
// On-chain contract usage removed for off-chain balances

interface WalletMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WalletMenu({ isOpen, onClose }: WalletMenuProps) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const [depositBalance, setDepositBalance] = useState<string>('0');

  // Fetch deposit balance when component mounts
  useState(() => {
    if (isConnected && address) {
      fetchDepositBalance();
    }
  });

  const fetchDepositBalance = async () => {
    try {
      if (!address) return;
      const { offchainGetProfile } = await import('../utils/offchainClient');
      const oc = await offchainGetProfile(address);
      const weiStr = oc?.balance?.available ?? '0';
      const eth = Number(BigInt(weiStr)) / 1e18;
      setDepositBalance(isFinite(eth) ? eth.toFixed(4) : '0');
    } catch (error) {
      console.error('Error fetching off-chain deposit balance:', error);
    }
  };

  const handleMenuClick = (action: string) => {
    onClose();
    
    switch (action) {
      case 'profile':
        router.push('/profile');
        break;
      case 'deposit':
        router.push('/deposit');
        break;
      case 'withdraw':
        router.push('/withdraw');
        break;
      case 'disconnect':
        disconnect();
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-80 max-w-sm mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Wallet Menu</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Wallet Address */}
        <div className="mb-6 p-3 bg-gray-800 rounded-lg">
          <div className="text-sm text-gray-400 mb-1">Connected Wallet</div>
          <div className="text-white font-mono text-sm break-all">
            {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
          </div>
        </div>

        {/* Deposit Balance */}
        <div className="mb-6 p-3 bg-gray-800 rounded-lg">
          <div className="text-sm text-gray-400 mb-1">Deposit Balance</div>
          <div className="text-white font-bold text-lg">
            {depositBalance} ETH
          </div>
        </div>

        {/* Menu Options */}
        <div className="space-y-3">
          <button
            onClick={() => handleMenuClick('profile')}
            className="w-full p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center"
          >
            <span className="mr-2">👤</span>
            Profile
          </button>

          <button
            onClick={() => handleMenuClick('deposit')}
            className="w-full p-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center"
          >
            <span className="mr-2">💰</span>
            Deposit
          </button>

          <button
            onClick={() => handleMenuClick('withdraw')}
            className="w-full p-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors flex items-center justify-center"
          >
            <span className="mr-2">💸</span>
            Withdraw
          </button>

          <button
            onClick={() => handleMenuClick('disconnect')}
            className="w-full p-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center"
          >
            <span className="mr-2">🔌</span>
            Disconnect
          </button>
        </div>
      </div>
    </div>
  );
}
