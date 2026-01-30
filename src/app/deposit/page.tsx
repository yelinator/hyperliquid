"use client";

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { usePredictionGameContract } from '../utils/evmContract';
import { useWalletClient } from 'wagmi';
import { depositToVaultWithWallet } from '../utils/vault';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function DepositPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const { deposit, getPlayerProfile, formatEther } = usePredictionGameContract();
  const { data: walletClient } = useWalletClient();
  
  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentBalance, setCurrentBalance] = useState<string>('0');

  useEffect(() => {
    if (isConnected && address) {
      fetchCurrentBalance();
    }
  }, [isConnected, address]);

  const fetchCurrentBalance = async () => {
    try {
      if (!address) return;
      const { offchainGetProfile } = await import('../utils/offchainClient');
      const oc = await offchainGetProfile(address);
      const weiStr = oc?.balance?.available ?? '0';
      const eth = Number(BigInt(weiStr)) / 1e18;
      setCurrentBalance(isFinite(eth) ? eth.toFixed(4) : '0');
    } catch (err) {
      console.error('Error fetching balance:', err);
    }
  };

  const handleDeposit = async () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // On-chain: deposit to Vault, then credit off-chain
      const txHash = await depositToVaultWithWallet(walletClient, amount);
      setSuccess(`Successfully deposited ${amount} ETH! Transaction: ${txHash}`);
      // Credit off-chain balance after on-chain confirm
      const { offchainDepositWebhook } = await import('../utils/offchainClient');
      await offchainDepositWebhook(address!, amount);
      setAmount('');
      
      // Refresh balance after successful deposit
      setTimeout(() => {
        fetchCurrentBalance();
      }, 500);
      
    } catch (err: any) {
      console.error('Deposit error:', err);
      setError(err.message || 'Failed to deposit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDeposit = (quickAmount: string) => {
    setAmount(quickAmount);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen pixel-bg flex items-center justify-center">
        <div className="pixel-card p-8 text-center">
          <h1 className="pixel-text-large text-2xl font-bold text-white mb-4">DEPOSIT</h1>
          <p className="pixel-text text-gray-400 mb-6">Please connect your wallet to make a deposit</p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pixel-bg">
      <div className="container mx-auto px-4 py-8">
        {/* Pixel header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="pixel-text-large text-3xl font-bold text-white tracking-widest">DEPOSIT ETH</h1>
          <button 
            onClick={() => router.push('/game')} 
            className="pixel-button pixel-button--blue px-5 py-3 font-mono uppercase text-sm"
            onMouseEnter={() => router.prefetch('/game')}
          >
            BACK TO GAME
          </button>
        </div>

        <div className="max-w-md mx-auto">
          {/* Current Balance */}
          <div className="pixel-card p-6 mb-6">
            <h2 className="pixel-text-large text-xl font-bold text-white mb-4 uppercase tracking-wide">CURRENT BALANCE</h2>
            <div className="pixel-text-large text-3xl font-bold text-green-400">{currentBalance} ETH</div>
            <p className="pixel-text text-gray-400 text-sm mt-2">Available for betting</p>
          </div>

          {/* Deposit Form */}
          <div className="pixel-card p-6">
            <h2 className="pixel-text-large text-xl font-bold text-white mb-4 uppercase tracking-wide">DEPOSIT AMOUNT</h2>
            
            {/* Amount Input */}
            <div className="mb-4">
              <label className="pixel-text block text-gray-400 text-sm mb-2">AMOUNT (ETH)</label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="w-full bg-gray-800 border-2 border-gray-600 rounded-none px-4 py-3 text-white focus:border-purple-400 focus:outline-none font-mono"
                disabled={loading}
              />
            </div>

            {/* Quick Deposit Buttons */}
            <div className="mb-6">
              <label className="pixel-text block text-gray-400 text-sm mb-2">QUICK DEPOSIT</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleQuickDeposit('0.01')}
                  className="pixel-tag py-2 px-3 text-sm font-mono hover:bg-gray-700 transition-colors cursor-pointer"
                  disabled={loading}
                >
                  0.01 ETH
                </button>
                <button
                  onClick={() => handleQuickDeposit('0.1')}
                  className="pixel-tag py-2 px-3 text-sm font-mono hover:bg-gray-700 transition-colors cursor-pointer"
                  disabled={loading}
                >
                  0.1 ETH
                </button>
                <button
                  onClick={() => handleQuickDeposit('0.5')}
                  className="pixel-tag py-2 px-3 text-sm font-mono hover:bg-gray-700 transition-colors cursor-pointer"
                  disabled={loading}
                >
                  0.5 ETH
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-900/20 border-2 border-red-500 rounded-none text-red-300 text-sm font-mono shadow-[3px_3px_0_0_rgba(0,0,0,0.6)]">
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="mb-4 border-2 border-green-500 bg-green-900/20 rounded-none p-4 shadow-[4px_4px_0_0_rgba(0,0,0,0.6)]">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-5 w-5 flex items-center justify-center bg-green-600 text-white font-bold font-mono">✓</div>
                  <div className="text-green-300 text-sm font-mono">
                    <div className="text-green-200 font-semibold tracking-wider">Deposit successful</div>
                    {(() => {
                      const match = success.match(/Transaction:\s*(0x[a-fA-F0-9]{64})/);
                      const tx = match?.[1];
                      if (!tx) return <div className="mt-1 text-green-300/90">Your deposit was confirmed.</div>;
                      const short = `${tx.substring(0, 10)}…${tx.substring(tx.length - 8)}`;
                      const href = `https://sepolia.etherscan.io/tx/${tx}`;
                      return (
                        <div className="mt-1">
                          <span className="text-green-300/90">Tx:</span>{' '}
                          <a className="underline decoration-green-500 underline-offset-2 hover:text-green-200" href={href} target="_blank" rel="noreferrer">
                            {short}
                          </a>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Deposit Button */}
            <button
              onClick={handleDeposit}
              disabled={loading || !amount || parseFloat(amount) <= 0}
              className="w-full pixel-button pixel-button--green py-3 px-4 font-mono disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Depositing...
                </div>
              ) : (
                `Deposit ${amount || '0'} ETH`
              )}
            </button>

            {/* Info */}
            <div className="mt-4 text-xs text-gray-400 font-mono">
              <p>• Deposits are held in the smart contract</p>
              <p>• You can withdraw your balance anytime</p>
              <p>• Minimum deposit: 0.001 ETH</p>
            </div>
          </div>

          {/* Navigation */}
          <div className="mt-6 flex gap-4">
              <button
                onClick={() => router.push('/profile')}
                onMouseEnter={() => (window as any).prefetchRoute?.('/profile')}
                className="flex-1 pixel-button pixel-button--blue py-2 px-4 font-mono"
              >
                View Profile
              </button>
              <button
                onClick={() => router.push('/withdraw')}
                onMouseEnter={() => (window as any).prefetchRoute?.('/withdraw')}
                className="flex-1 pixel-button pixel-button--red py-2 px-4 font-mono"
              >
                Withdraw
              </button>
          </div>
        </div>
      </div>
    </div>
  );
}
