'use client';

import { useState, useEffect } from 'react';

interface VaultBalance {
  balance: string;
  balanceWei: string;
  vaultAddress: string;
}

export default function VaultTicker() {
  const [balance, setBalance] = useState<VaultBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVaultBalance = async () => {
    try {
      console.log('Fetching vault balance...');
      const response = await fetch('/api/vault/balance');
      console.log('Response status:', response.status);
      if (!response.ok) throw new Error('Failed to fetch vault balance');
      const data = await response.json();
      console.log('Vault balance data:', data);
      setBalance(data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching vault balance:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVaultBalance();
    // Update every 10 seconds
    const interval = setInterval(fetchVaultBalance, 10000);
    
    // Fallback timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (loading) {
        console.log('VaultTicker timeout - setting loading to false');
        setLoading(false);
        setError('Timeout loading vault balance');
      }
    }, 15000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [loading]);

  if (loading) {
    return (
      <div className="bg-black text-green-400 py-3 px-4 overflow-hidden relative border-b-2 border-green-400 pixel-bg">
        <div className="flex items-center justify-center relative z-10">
          <div className="flex items-center space-x-3">
            <div className="w-4 h-4 bg-green-400 pixel-dot animate-pulse"></div>
            <span className="font-mono font-bold text-sm tracking-wider uppercase pixel-text">LOADING VAULT...</span>
            <div className="w-2 h-2 bg-green-400 pixel-dot animate-ping"></div>
          </div>
        </div>
        <div className="absolute inset-0 pixel-scanlines"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-black text-red-400 py-3 px-4 overflow-hidden relative border-b-2 border-red-400 pixel-bg">
        <div className="flex items-center justify-center relative z-10">
          <div className="flex items-center space-x-3">
            <div className="w-4 h-4 bg-red-400 pixel-dot animate-pulse"></div>
            <span className="font-mono font-bold text-sm tracking-wider uppercase pixel-text">VAULT ERROR: {error}</span>
            <div className="w-2 h-2 bg-red-400 pixel-dot animate-ping"></div>
          </div>
        </div>
        <div className="absolute inset-0 pixel-scanlines"></div>
      </div>
    );
  }

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    if (num >= 1) {
      return num.toFixed(4) + ' ETH';
    } else {
      return num.toFixed(6) + ' ETH';
    }
  };

  return (
    <div className="bg-black text-green-400 py-3 px-4 overflow-hidden relative border-b-2 border-green-400 pixel-bg">
      {/* Pixel-style background animation */}
      <div className="absolute inset-0 pixel-grid opacity-20"></div>
      <div className="absolute inset-0 pixel-scanlines"></div>
      
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <div className="w-4 h-4 bg-green-400 pixel-dot animate-pulse"></div>
            <span className="font-mono font-bold text-sm tracking-wider uppercase pixel-text">VAULT LIVE</span>
            <div className="w-2 h-2 bg-green-400 pixel-dot animate-ping"></div>
          </div>
          <div className="text-2xl font-mono font-bold text-green-300 pixel-text-large">
            {formatBalance(balance?.balance || '0')}
          </div>
          <div className="text-sm text-green-400 font-mono font-semibold pixel-text">
            AVAILABLE
          </div>
        </div>
        
        <div className="flex items-center space-x-6 text-sm">
          <div className="hidden sm:flex items-center space-x-2">
            <span className="text-green-400 font-mono font-semibold pixel-text">VAULT:</span>
            <span className="font-mono bg-green-900/30 px-2 py-1 pixel-border text-green-300">
              {balance?.vaultAddress?.slice(0, 6)}...{balance?.vaultAddress?.slice(-4)}
            </span>
          </div>
          <div className="text-green-400 font-mono font-medium pixel-text">
            ■ LIVE • {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
      
      {/* Pixel-style moving effect */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full pixel-scanlines-moving"></div>
      </div>
    </div>
  );
}
