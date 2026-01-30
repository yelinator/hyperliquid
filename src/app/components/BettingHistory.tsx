"use client";

import React, { useState, useEffect } from "react";
import { useAccount } from 'wagmi';

interface BettingHistoryItem {
  id: string;
  amount: string;
  token: string;
  prediction: "up" | "down";
  entryPrice: number;
  exitPrice: number;
  result: "win" | "lose" | "refund" | "pending";
  timestamp: number;
  transactionHash?: string;
}

export default function BettingHistory() {
  const { address } = useAccount();
  const [bettingHistory, setBettingHistory] = useState<BettingHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load betting history from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && address) {
      try {
        const historyKey = `bettingHistory_${address}`;
        const storedHistory = localStorage.getItem(historyKey);
        if (storedHistory) {
          const parsedHistory = JSON.parse(storedHistory);
          console.log('Betting history loaded from localStorage:', parsedHistory.length, 'records');
          // Sort by timestamp descending (newest first)
          const sortedHistory = parsedHistory.sort((a: BettingHistoryItem, b: BettingHistoryItem) => 
            b.timestamp - a.timestamp
          );
          console.log('Sorted betting history:', sortedHistory.length, 'records');
          setBettingHistory(sortedHistory);
        } else {
          console.log('No betting history found in localStorage');
        }
      } catch (err) {
        console.error("Failed to load betting history:", err);
        setError("Failed to load betting history");
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [address]);

  // Format timestamp for display
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Get result color
  const getResultColor = (result: string) => {
    switch (result) {
      case 'win': return 'text-green-400';
      case 'lose': return 'text-red-400';
      case 'refund': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  // Get result text
  const getResultText = (result: string) => {
    switch (result) {
      case 'win': return 'WON';
      case 'lose': return 'LOST';
      case 'refund': return 'REFUND';
      default: return result.toUpperCase();
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-6 rounded-2xl">
        <h2 className="text-2xl font-bold mb-4">Betting History</h2>
        <div className="text-center py-4 text-gray-400">
          Loading betting history...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6 rounded-2xl">
        <h2 className="text-2xl font-bold mb-4">Betting History</h2>
        <div className="text-center py-4 text-red-400">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 rounded-2xl flex flex-col h-full">
      <h2 className="text-2xl font-bold mb-4">Betting History</h2>
      
      {bettingHistory.length === 0 ? (
        <div className="text-center py-4 text-gray-400">
          No betting history found. Place your first bet to see it here!
        </div>
      ) : (
        <div className="space-y-3 flex-grow min-h-[300px] max-h-[500px] overflow-y-auto">
          {bettingHistory.map((bet) => (
            <div key={bet.id} className="p-3 rounded-xl bg-black/20 border border-purple-500/20">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">
                    {bet.amount} {bet.token} on {bet.prediction.toUpperCase()}
                  </div>
                  <div className="text-sm text-gray-400">
                    {formatTimestamp(bet.timestamp)}
                  </div>
                </div>
                <div className={`font-bold ${getResultColor(bet.result)}`}>
                  {getResultText(bet.result)}
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Entry: ${bet.entryPrice.toFixed(4)} | Exit: {bet.result !== 'pending' ? `$${bet.exitPrice.toFixed(4)}` : '...'}
              </div>
              {bet.transactionHash && (
                <div className="text-xs text-gray-500 mt-1">
                  Tx: {bet.transactionHash.substring(0, 10)}...{bet.transactionHash.substring(bet.transactionHash.length - 8)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}