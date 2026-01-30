"use client";

import { useState, useEffect } from "react";
import { EVMWalletButton } from "../components/EVMWalletButton";
import { fetchCryptoPrices } from "../utils/hyperliquidPrice";
import CandlestickChart from "../components/CandlestickChart";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function EVMHome() {
  const router = useRouter();
  const [connected, setConnected] = useState<boolean>(false);
  const [account, setAccount] = useState<string | null>(null);
  const [prices, setPrices] = useState<{ ethereum: number | null; hype: number | null }>({ ethereum: null, hype: null });
  const [loading, setLoading] = useState<boolean>(true);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [activeChart, setActiveChart] = useState<'ethereum' | 'hype'>('ethereum');

  useEffect(() => {
    const loadPrices = async () => {
      try {
        const priceData = await fetchCryptoPrices();
        setPrices({ ethereum: priceData.ethereum, hype: priceData.hype });
      } catch (error) {
        console.error("Failed to fetch crypto prices:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPrices();

    // Refresh prices every 30 seconds
    const priceInterval = setInterval(loadPrices, 30000);

    return () => {
      clearInterval(priceInterval);
    };
  }, []);

  // Format address for display
  const formatAddress = (addr: string | null) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <div className="min-h-screen cyberpunk-neon-bg text-white">
      {/* Header */}
      <header className="flex justify-between items-center p-6">
        <div className="header-text">Kairos</div>
        <div className="flex items-center gap-3">
          {connected && account && (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg px-3 py-2 text-sm">
              <span className="text-gray-300 font-medium">
                0.0172 ETH
              </span>
            </div>
          )}
          <div>
            <EVMWalletButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex flex-col items-center justify-center">
        <div className="text-center max-w-6xl w-full">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 neon-text">
            Moon or Bust
          </h1>
          
          <p className="text-xl text-gray-300 mb-12">
            Bet ETH, HYPE, USDC, and more on crypto price movements in real-time. Are you ready to test your market instincts?
          </p>
          
          {/* Live Price Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* Ethereum Price Card */}
            <div className="glass-card p-6 rounded-2xl">
              <h2 className="text-2xl font-semibold mb-4">Ethereum (ETH)</h2>
              {loading ? (
                <div className="text-3xl font-bold animate-pulse">Loading...</div>
              ) : (
                <div className="text-4xl font-bold neon-text">
                  ${prices.ethereum?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              )}
              <div className="mt-2 text-gray-400">Live Price</div>
            </div>
            
            {/* HYPE Price Card */}
            <div className="glass-card p-6 rounded-2xl">
              <h2 className="text-2xl font-semibold mb-4">HYPE Token</h2>
              {loading ? (
                <div className="text-3xl font-bold animate-pulse">Loading...</div>
              ) : (
                <div className="text-4xl font-bold neon-text">
                  ${prices.hype?.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                </div>
              )}
              <div className="mt-2 text-gray-400">Live Price</div>
            </div>
          </div>
          
          {/* Candlestick Chart */}
          <div className="mb-12 w-full">
            <div className="flex justify-center mb-4">
              <div className="inline-flex rounded-lg p-1 bg-black/20">
                <button
                  onClick={() => setActiveChart('ethereum')}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    activeChart === 'ethereum' 
                      ? 'bg-purple-600' 
                      : 'hover:bg-black/30'
                  }`}
                >
                  Ethereum (ETH)
                </button>
                <button
                  onClick={() => setActiveChart('hype')}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    activeChart === 'hype' 
                      ? 'bg-purple-600' 
                      : 'hover:bg-black/30'
                  }`}
                >
                  HYPE Token
                </button>
              </div>
            </div>
            
            {activeChart === 'ethereum' ? (
              <CandlestickChart symbol="ETHUSDT" interval="1m" />
            ) : (
              <CandlestickChart symbol="HYPEUSDT" interval="1m" />
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            {!connected ? (
              <div className="glass-button px-8 py-4 text-lg rounded-xl font-bold cursor-pointer">
                <EVMWalletButton />
              </div>
            ) : (
              <button 
                onClick={() => router.push('/evm-game')}
                className="glass-button px-8 py-4 text-lg rounded-xl font-bold hover:bg-purple-700 transition-all"
              >
                Play Now
              </button>
            )}
            
            <button 
              onClick={() => router.push('/leaderboard')}
              className="glass-button px-8 py-4 text-lg rounded-xl font-bold hover:bg-purple-700 transition-all"
            >
              View Leaderboard
            </button>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        {/* Mainnet Coming Soon Section */}
        <div className="mb-16">
          {/* GIF Display Box */}
          <div className="glass-card p-0 rounded-2xl text-center transform transition-all duration-300 hover:scale-105 hover:shadow-2xl max-w-4xl mx-auto relative overflow-hidden">
            {/* Background GIF */}
            <div className="relative rounded-2xl">
              <img 
                src="/images/mainnet.gif" 
                alt="Mainnet Coming Soon" 
                className="w-full h-auto rounded-2xl opacity-100"
                style={{ 
                  imageRendering: 'pixelated',
                  imageRendering: 'crisp-edges',
                  filter: 'none',
                  transform: 'none'
                }}
              />
            </div>
          </div>
          
          {/* Predict Button Below GIF */}
          <div className="text-center mt-6">
            <button 
              onClick={() => {
                console.log('MAINNET button clicked!');
                setShowComingSoon(true);
              }}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-6 px-12 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg text-2xl cursor-pointer"
            >
              MAINNET
            </button>
          </div>
        </div>
        
        {/* Other Feature Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-card p-6 rounded-2xl text-center transform transition-all duration-300 hover:scale-105 hover:shadow-2xl">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-bold mb-2">Real-time Charts</h3>
            <p className="text-gray-300">
              Track live price movements with our interactive candlestick charts powered by Binance data.
            </p>
          </div>
          
          <div className="glass-card p-6 rounded-2xl text-center transform transition-all duration-300 hover:scale-105 hover:shadow-2xl">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-bold mb-2">Secure Bets</h3>
            <p className="text-gray-300">
              All predictions are recorded on-chain using Hyperliquid smart contracts for complete transparency.
            </p>
          </div>
          
          <div className="glass-card p-6 rounded-2xl text-center transform transition-all duration-300 hover:scale-105 hover:shadow-2xl">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-xl font-bold mb-2">Win Rewards</h3>
            <p className="text-gray-300">
              Correct predictions earn you rewards in ETH and HYPE tokens. The more you play, the more you can earn!
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-gray-400">
        <p>© 2025 Kairos. All rights reserved.</p>
        <p className="mt-2 text-sm">Built on Hyperliquid Blockchain</p>
      </footer>

      {/* Coming Soon Popup */}
      {showComingSoon && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowComingSoon(false)}>
          <div className="glass-card p-8 rounded-2xl text-center max-w-md mx-auto" onClick={(e) => e.stopPropagation()}>
            <div className="text-4xl font-bold mb-4 text-white">STAY TUNED!</div>
            <p className="text-gray-300 mb-6">
              Mainnet is launching soon! The prediction game will be available shortly.
            </p>
            <button 
              onClick={() => setShowComingSoon(false)}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg text-lg"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}