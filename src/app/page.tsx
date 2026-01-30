"use client";

import { useState, useEffect } from "react";
import { EnhancedWalletConnect } from "./components/EnhancedWalletConnect";
import { fetchCryptoPrices } from "./utils/evmPrice";
import dynamic from "next/dynamic";
const CandlestickChart = dynamic(() => import("./components/CandlestickChart"), {
  ssr: false,
});
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount } from 'wagmi';

// Separate component for wallet-dependent content
function WalletDependentContent() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [activeChart, setActiveChart] = useState<'ethereum' | 'hype'>('ethereum');
  
  // Format address for display
  const formatAddress = (addr: string | undefined) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };
  
  // Show chart on landing page regardless of wallet connection
  const shouldShowChart = true;

  return (
    <>
      {/* Header with wallet connect */}
      <header className="flex justify-between items-center p-6 pixel-bg">
        <div className="pixel-header-button">
          <div className="pixel-header-icon"></div>
          <span className="pixel-header-text">Kairos</span>
        </div>
        <div className="flex items-center gap-3">
          <div>
            <EnhancedWalletConnect />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex flex-col items-center justify-center pixel-bg">
        <div className="text-center max-w-6xl w-full">
          <h1 className="pixel-text-large text-5xl md:text-7xl lg:text-8xl font-bold mb-8 text-white">
            MOON OR BUST
          </h1>
          
          <p className="pixel-text text-2xl md:text-3xl text-gray-300 mb-16">
            Bet ETH, HYPE, USDC, and more on crypto price movements in real-time. Are you ready to test your market instincts?
          </p>
          {/* CTA under hero removed per request (buttons will be under chart) */}
          

          {/* Candlestick Chart */}
          <div className="mb-12 w-full">
            <div className="flex justify-center mb-4">
            <div className="inline-flex p-1 gap-2">
                <button
                  onClick={() => setActiveChart('ethereum')}
                className={`pixel-button pixel-button--blue text-sm ${
                    activeChart === 'ethereum' 
                      ? 'pixel-button--active' 
                      : ''
                  }`}
                >
                  Ethereum (ETH)
                </button>
                <button
                  onClick={() => setActiveChart('hype')}
                className={`pixel-button pixel-button--blue text-sm ${
                    activeChart === 'hype' 
                      ? 'pixel-button--active' 
                      : ''
                  }`}
                >
                  HYPE Token
                </button>
              </div>
            </div>
            
            {/* Only show chart when wallet is connected */}
            {shouldShowChart ? (
              activeChart === 'ethereum' ? (
                <CandlestickChart symbol="ETHUSDT" interval="1m" />
              ) : (
                <CandlestickChart symbol="HYPEUSDT" interval="1m" />
              )
            ) : (
              <div className="pixel-card p-12 text-center">
                <h2 className="pixel-text-large text-2xl font-bold mb-4 text-white">CONNECT WALLET TO VIEW CHART</h2>
                <p className="pixel-text text-gray-300 mb-8">Please connect your wallet to view the live price chart.</p>
                <p className="pixel-text text-gray-400 text-sm">Use the Connect Wallet button in the header to get started.</p>
              </div>
            )}
          </div>

          {/* CTAs moved near features section as requested */}

          {/* Secondary CTAs removed (buttons now only under hero copy) */}
          
          {/* Action Buttons (moved above chart) */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-4 justify-center">
              <a href="/game" className="pixel-button pixel-button--green px-8 py-4 text-lg font-bold text-center">PLAY NOW</a>
              <a href="/leaderboard" className="pixel-button pixel-button--purple px-8 py-4 text-lg font-bold text-center">VIEW LEADERBOARD</a>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default function Home() {
  const router = useRouter();
  const [prices, setPrices] = useState<{ ethereum: number | null; hype: number | null }>({ ethereum: null, hype: null });
  const [loading, setLoading] = useState<boolean>(true);
  const [isClient, setIsClient] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);

  // Set isClient to true on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

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

  return (
    <div className="min-h-screen retro-arcade-bg text-white">
      {/* Show wallet-dependent content only on client side */}
      {isClient ? (
        <WalletDependentContent />
      ) : (
        // Show simplified header and loading state on server side
        <header className="flex justify-between items-center p-6 pixel-bg">
          <div className="pixel-header-button">
            <div className="pixel-header-icon"></div>
            <span className="pixel-header-text">Kairos</span>
          </div>
        </header>
      )}

      {/* Features Section - always show */}
      <section className="container mx-auto px-4 py-16 pixel-bg">
        {/* Mainnet Coming Soon Section */}
        <div className="mb-16">
          {/* GIF Display Box */}
          <div className="pixel-card p-0 text-center max-w-4xl mx-auto relative overflow-hidden">
            {/* Background GIF */}
            <div className="relative">
              <img 
                src="/images/mainnet.gif" 
                alt="Mainnet Coming Soon" 
                className="w-full h-auto opacity-100"
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
              className="pixel-button pixel-button--purple px-12 py-6 text-2xl font-bold transform transition-all duration-300 hover:scale-105 cursor-pointer"
            >
              MAINNET
            </button>
          </div>
        </div>
        
        {/* Other Feature Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="pixel-card p-6 text-center">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="pixel-text-large text-xl mb-2 text-white">REAL-TIME CHARTS</h3>
            <p className="pixel-text text-gray-300">
              Track live price movements with our interactive candlestick charts powered by Binance data.
            </p>
          </div>
          
          <div className="pixel-card p-6 text-center">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="pixel-text-large text-xl mb-2 text-white">SECURE BETS</h3>
            <p className="pixel-text text-gray-300">
              All predictions are recorded on-chain using Hyperliquid smart contracts for complete transparency.
            </p>
          </div>
          
          <div className="pixel-card p-6 text-center">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="pixel-text-large text-xl mb-2 text-white">WIN REWARDS</h3>
            <p className="pixel-text text-gray-300">
              Correct predictions earn you rewards in ETH and HYPE tokens. The more you play, the more you can earn!
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-gray-400 pixel-bg">
        <p className="pixel-text">© 2025 Kairos. All rights reserved.</p>
        <p className="pixel-text mt-2 text-sm">Built on Hyperliquid Blockchain</p>
      </footer>

      {/* Coming Soon Popup */}
      {showComingSoon && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowComingSoon(false)}>
          <div className="pixel-card p-8 text-center max-w-md mx-auto relative" onClick={(e) => e.stopPropagation()}>
            <div className="pixel-text-large text-4xl mb-4 text-white">STAY TUNED!</div>
            <p className="pixel-text text-gray-300 mb-6">
              Mainnet is launching soon! The prediction game will be available shortly.
            </p>
            <button 
              onClick={() => setShowComingSoon(false)}
              className="pixel-button pixel-button--purple px-6 py-3 text-lg font-bold"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}