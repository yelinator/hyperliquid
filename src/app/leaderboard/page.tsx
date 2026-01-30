"use client";

import { useState } from "react";
import { EnhancedWalletConnect } from "../components/EnhancedWalletConnect";

export default function LeaderboardPage() {
  // Mock data for leaderboard (EVM addresses)
  const [leaderboardData] = useState([
    { rank: 1, address: "0x4a2...8f9", wins: 42, earnings: 125.6 },
    { rank: 2, address: "0x8b3...1e2", wins: 38, earnings: 98.3 },
    { rank: 3, address: "0x2c7...5k9", wins: 35, earnings: 87.9 },
    { rank: 4, address: "0x9d1...6x4", wins: 32, earnings: 76.4 },
    { rank: 5, address: "0x5e8...3w7", wins: 29, earnings: 68.2 },
    { rank: 6, address: "0x3f9...2y1", wins: 27, earnings: 59.7 },
    { rank: 7, address: "0x7a4...6b8", wins: 24, earnings: 52.1 },
    { rank: 8, address: "0x1b5...9m3", wins: 22, earnings: 45.8 },
    { rank: 9, address: "0x6c2...4v6", wins: 20, earnings: 39.3 },
    { rank: 10, address: "0x4d7...8z2", wins: 18, earnings: 34.7 },
  ]);

  // Mock data for user history (ETH/HYPE tokens)
  const [userHistory] = useState([
    { id: 1, date: "2025-09-10", prediction: "UP", timeframe: "1m", amount: 2.5, result: "WIN", reward: 4.8, token: "ETH" },
    { id: 2, date: "2025-09-09", prediction: "DOWN", timeframe: "5m", amount: 1.2, result: "LOSE", reward: 0, token: "HYPE" },
    { id: 3, date: "2025-09-08", prediction: "UP", timeframe: "1h", amount: 3.0, result: "WIN", reward: 5.2, token: "ETH" },
    { id: 4, date: "2025-09-07", prediction: "DOWN", timeframe: "1m", amount: 1.5, result: "WIN", reward: 2.9, token: "HYPE" },
    { id: 5, date: "2025-09-06", prediction: "UP", timeframe: "5m", amount: 2.0, result: "LOSE", reward: 0, token: "ETH" },
  ]);

  // Mock global stats
  const globalStats = {
    totalRounds: 1247,
    totalVolume: 2456.8,
    activePlayers: 12843
  };

  return (
    <div className="min-h-screen pixel-bg" style={{ imageRendering: 'pixelated' }}>
        {/* Header */}
        <header className="flex justify-between items-center p-6 pixel-bg">
          <div className="pixel-header-button">
            <div className="pixel-header-icon"></div>
            <span className="pixel-header-text">Kairos</span>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => window.location.href = '/game'}
              className="pixel-button pixel-button--purple px-4 py-2 font-mono uppercase text-sm"
            >
              Play Game
            </button>
            <EnhancedWalletConnect />
          </div>
        </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl pixel-bg">
        <h1 className="pixel-text-large text-4xl md:text-5xl font-bold text-center mb-4 text-white tracking-widest">LEADERBOARD & HISTORY</h1>
        <p className="pixel-text text-center mb-12 text-gray-300 text-lg">Top players and prediction history</p>

        {/* Global Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="pixel-card pixel-card--soft p-6 text-center relative overflow-hidden">
            <div className="absolute top-2 right-2 text-4xl opacity-20">🎯</div>
            <div className="pixel-text-large text-4xl mb-2 text-white font-bold">{globalStats.totalRounds.toLocaleString()}</div>
            <div className="pixel-text text-sm text-gray-300">TOTAL ROUNDS PLAYED</div>
            <div className="mt-2 h-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-none"></div>
          </div>
          
          <div className="pixel-card pixel-card--soft p-6 text-center relative overflow-hidden">
            <div className="absolute top-2 right-2 text-4xl opacity-20">💰</div>
            <div className="pixel-text-large text-4xl mb-2 text-white font-bold">{globalStats.totalVolume.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div>
            <div className="pixel-text text-sm text-gray-300">ETH VOLUME</div>
            <div className="mt-2 h-1 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-none"></div>
          </div>
          
          <div className="pixel-card pixel-card--soft p-6 text-center relative overflow-hidden">
            <div className="absolute top-2 right-2 text-4xl opacity-20">👥</div>
            <div className="pixel-text-large text-4xl mb-2 text-white font-bold">{globalStats.activePlayers.toLocaleString()}</div>
            <div className="pixel-text text-sm text-gray-300">ACTIVE PLAYERS</div>
            <div className="mt-2 h-1 bg-gradient-to-r from-green-500 to-teal-500 rounded-none"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Leaderboard */}
          <div className="pixel-card pixel-card--soft p-6">
            <div className="flex items-center mb-6">
              <span className="text-2xl mr-3">🏆</span>
              <h2 className="pixel-text-large text-2xl text-white font-bold tracking-widest">TOP PLAYERS</h2>
            </div>
            
            <div className="space-y-3">
              {leaderboardData.map((player) => (
                <div 
                  key={player.rank} 
                  className="pixel-card pixel-card--soft p-4 flex items-center justify-between hover:scale-105 transition-transform cursor-pointer"
                >
                  <div className="flex items-center">
                    <div className={`pixel-border w-10 h-10 flex items-center justify-center mr-4 relative ${
                      player.rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black' : 
                      player.rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-black' : 
                      player.rank === 3 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white' : 'bg-gradient-to-br from-purple-500 to-purple-700 text-white'
                    }`}>
                      {player.rank === 1 && <span className="absolute -top-1 -right-1 text-xs">👑</span>}
                      {player.rank}
                    </div>
                    <div>
                      <div className="pixel-text font-mono text-sm text-white">{player.address}</div>
                      <div className="flex items-center gap-2">
                        <span className="pixel-text text-xs text-gray-400">🎯</span>
                        <span className="pixel-text text-xs text-gray-300">{player.wins} wins</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="pixel-text-large font-bold text-lg text-white">{player.earnings.toFixed(1)}</div>
                    <div className="pixel-text text-xs opacity-70 text-gray-400">ETH</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* User History */}
          <div className="pixel-card pixel-card--soft p-6">
            <div className="flex items-center mb-6">
              <span className="text-2xl mr-3">📊</span>
              <h2 className="pixel-text-large text-2xl text-white font-bold tracking-widest">YOUR PREDICTION HISTORY</h2>
            </div>
            
            <div className="space-y-4">
              {userHistory.map((prediction) => (
                <div 
                  key={prediction.id} 
                  className="pixel-card pixel-card--soft p-4 hover:scale-105 transition-transform cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="pixel-text font-bold text-sm text-white">{prediction.date}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-lg ${prediction.prediction === 'UP' ? '📈' : '📉'}`}></span>
                        <div className="pixel-text text-sm text-gray-300">
                          {prediction.prediction} for {prediction.timeframe}
                        </div>
                        <div className={`pixel-tag px-2 py-1 text-xs ${prediction.token === 'ETH' ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white'}`}>
                          {prediction.token}
                        </div>
                      </div>
                    </div>
                    <div className={`pixel-tag px-3 py-1 text-sm font-bold flex items-center gap-1 ${
                      prediction.result === 'WIN' 
                        ? 'bg-green-500 text-black' 
                        : 'bg-red-500 text-white'
                    }`}>
                      {prediction.result === 'WIN' ? '🎉' : '💸'}
                      {prediction.result}
                    </div>
                  </div>
                  
                  <div className="flex justify-between pt-3 border-t border-gray-700">
                    <div className="text-center">
                      <div className="pixel-text text-xs opacity-70 text-gray-400">BET AMOUNT</div>
                      <div className="pixel-text-large font-bold flex items-center gap-1 text-white">
                        <span>{prediction.amount}</span>
                        <span className="text-xs">{prediction.token}</span>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="pixel-text text-xs opacity-70 text-gray-400">REWARD</div>
                      <div className={`pixel-text-large font-bold flex items-center gap-1 ${prediction.result === 'WIN' ? 'text-green-400' : 'text-gray-400'}`}>
                        <span>{prediction.reward}</span>
                        <span className="text-xs">{prediction.token}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}