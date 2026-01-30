"use client";

import { useState, useEffect } from "react";
import { usePredictionGameContract } from "../utils/evmContract";
import { useAccount } from "wagmi";
import { ethers } from "ethers";

interface PlayerProfile {
  balance: bigint;
  gamesPlayed: bigint;
  gamesWon: bigint;
  totalWagered: bigint;
  totalPayout: bigint;
}

export default function DepositWithdraw() {
  const { address, isConnected } = useAccount();
  const {
    deposit,
    withdraw,
    getPlayerProfile,
    formatEther,
    parseEther,
    isConnected: contractConnected
  } = usePredictionGameContract();

  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fetch player profile
  const fetchPlayerProfile = async () => {
    if (!isConnected || !address) return;
    
    try {
      const profile = await getPlayerProfile();
      setPlayerProfile(profile);
    } catch (error) {
      console.error("Error fetching player profile:", error);
    }
  };

  // Handle deposit
  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      setError("Please enter a valid deposit amount");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const txHash = await deposit(depositAmount);
      setSuccess(`Deposit successful! Transaction: ${txHash}`);
      setDepositAmount("");
      
      // Refresh player profile
      setTimeout(() => {
        fetchPlayerProfile();
      }, 2000);
    } catch (error: any) {
      setError(error.message || "Deposit failed");
    } finally {
      setLoading(false);
    }
  };

  // Handle withdraw
  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      setError("Please enter a valid withdraw amount");
      return;
    }

    if (!playerProfile) {
      setError("Unable to fetch player balance");
      return;
    }

    const withdrawAmountWei = parseEther(withdrawAmount);
    if (withdrawAmountWei > playerProfile.balance) {
      setError("Insufficient balance");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const txHash = await withdraw(withdrawAmount);
      setSuccess(`Withdrawal successful! Transaction: ${txHash}`);
      setWithdrawAmount("");
      
      // Refresh player profile
      setTimeout(() => {
        fetchPlayerProfile();
      }, 2000);
    } catch (error: any) {
      setError(error.message || "Withdrawal failed");
    } finally {
      setLoading(false);
    }
  };

  // Fetch profile on mount and when connected
  useEffect(() => {
    if (isConnected && address) {
      fetchPlayerProfile();
    }
  }, [isConnected, address]);

  if (!isConnected) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4">Deposit & Withdraw</h3>
        <p className="text-gray-400">Please connect your wallet to manage your balance</p>
      </div>
    );
  }

  const balance = playerProfile ? parseFloat(formatEther(playerProfile.balance)) : 0;
  const gamesPlayed = playerProfile ? Number(playerProfile.gamesPlayed) : 0;
  const gamesWon = playerProfile ? Number(playerProfile.gamesWon) : 0;
  const totalWagered = playerProfile ? parseFloat(formatEther(playerProfile.totalWagered)) : 0;
  const totalPayout = playerProfile ? parseFloat(formatEther(playerProfile.totalPayout)) : 0;

  return (
    <div className="pixel-card p-6">
      <h3 className="text-lg font-semibold mb-4 font-mono uppercase tracking-wider">Deposit & Withdraw</h3>
      
      {/* Player Stats */}
      <div className="mb-6 p-4 pixel-card--soft">
        <h4 className="text-md font-medium mb-3 font-mono uppercase tracking-wide">Your Profile</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400 font-mono text-xs">Deposit Balance:</span>
            <div className="font-bold text-green-400 font-mono">{balance.toFixed(4)} ETH</div>
          </div>
          <div>
            <span className="text-gray-400 font-mono text-xs">Games Played:</span>
            <div className="font-bold font-mono">{gamesPlayed}</div>
          </div>
          <div>
            <span className="text-gray-400 font-mono text-xs">Games Won:</span>
            <div className="font-bold text-blue-400 font-mono">{gamesWon}</div>
          </div>
          <div>
            <span className="text-gray-400 font-mono text-xs">Win Rate:</span>
            <div className="font-bold font-mono">
              {gamesPlayed > 0 ? ((gamesWon / gamesPlayed) * 100).toFixed(1) : 0}%
            </div>
          </div>
          <div>
            <span className="text-gray-400 font-mono text-xs">Total Wagered:</span>
            <div className="font-bold font-mono">{totalWagered.toFixed(4)} ETH</div>
          </div>
          <div>
            <span className="text-gray-400 font-mono text-xs">Total Payout:</span>
            <div className="font-bold text-yellow-400 font-mono">{totalPayout.toFixed(4)} ETH</div>
          </div>
        </div>
      </div>

      {/* Deposit Section */}
      <div className="mb-6">
        <h4 className="text-md font-medium mb-3 font-mono uppercase tracking-wide">Deposit ETH</h4>
        <div className="flex gap-3">
          <input
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="0.00"
            className="flex-1 bg-gray-800 border-2 border-gray-600 rounded-none px-4 py-3 text-white focus:border-purple-400 focus:outline-none font-mono"
            step="0.001"
            min="0"
          />
          <button
            onClick={handleDeposit}
            disabled={loading || !depositAmount || parseFloat(depositAmount) <= 0}
            className="pixel-button pixel-button--green px-4 py-2 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Depositing..." : "Deposit"}
          </button>
        </div>
      </div>

      {/* Withdraw Section */}
      <div className="mb-6">
        <h4 className="text-md font-medium mb-3 font-mono uppercase tracking-wide">Withdraw ETH</h4>
        <div className="flex gap-3">
          <input
            type="number"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            placeholder="0.00"
            className="flex-1 bg-gray-800 border-2 border-gray-600 rounded-none px-4 py-3 text-white focus:border-orange-400 focus:outline-none font-mono"
            step="0.001"
            min="0"
            max={balance}
          />
          <button
            onClick={handleWithdraw}
            disabled={loading || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > balance}
            className="pixel-button pixel-button--red px-4 py-2 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Withdrawing..." : "Withdraw"}
          </button>
        </div>
        <div className="text-xs text-gray-400 mt-2 font-mono">
          Available: {balance.toFixed(4)} ETH
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-4">
        <h4 className="text-md font-medium mb-3 font-mono uppercase tracking-wide">Quick Actions</h4>
        <div className="flex gap-2">
          <button
            onClick={() => setDepositAmount("0.01")}
            className="pixel-tag px-3 py-1 text-sm hover:bg-gray-700 transition-colors cursor-pointer"
          >
            0.01 ETH
          </button>
          <button
            onClick={() => setDepositAmount("0.1")}
            className="pixel-tag px-3 py-1 text-sm hover:bg-gray-700 transition-colors cursor-pointer"
          >
            0.1 ETH
          </button>
          <button
            onClick={() => setWithdrawAmount(balance.toString())}
            className="pixel-tag px-3 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
            disabled={balance <= 0}
          >
            Max
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border-2 border-red-500 rounded-none text-red-200 text-sm font-mono shadow-[3px_3px_0_0_rgba(0,0,0,0.6)]">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-900/20 border-2 border-green-500 rounded-none text-green-200 text-sm font-mono shadow-[3px_3px_0_0_rgba(0,0,0,0.6)]">
          {success}
        </div>
      )}

      {/* Refresh Button */}
      <button
        onClick={fetchPlayerProfile}
        className="pixel-button pixel-button--blue px-4 py-2 text-sm w-full"
        disabled={loading}
      >
        Refresh Balance
      </button>
    </div>
  );
}
