"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { ClientWalletButton } from "../components/ClientWalletButton";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { EnhancedWalletConnect } from "../components/EnhancedWalletConnect";
import { fetchCryptoPrices, fetchPriceHistory } from "../utils/evmPrice";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useRouter } from "next/navigation";
import { useAccount } from 'wagmi';
import DebugInfo from "../components/DebugInfo";
import { getCurrentPrice } from "../utils/hyperliquidPriceService"; // Import Hyperliquid price service
import { ethers } from 'ethers';
// On-chain contract utilities removed for off-chain implementation

// Dynamic imports for client-side only components - OPTIMIZED LOADING
const CandlestickChart = dynamic(() => import("../components/CandlestickChart"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-96 border border-gray-700 rounded flex items-center justify-center pixel-bg">
      <div className="pixel-dot w-8 h-8 animate-pulse"></div>
      <span className="pixel-text ml-3 text-gray-400">Loading chart...</span>
    </div>
  )
});

const BettingHistory = dynamic(() => import("../components/BettingHistory"), {
  ssr: false,
  loading: () => (
    <div className="pixel-card p-4 text-center">
      <div className="pixel-dot w-6 h-6 animate-pulse mx-auto mb-2"></div>
      <span className="pixel-text text-gray-400">Loading history...</span>
    </div>
  )
});

// Client-side only component for wagmi hooks
function GamePageClient() {
  const router = useRouter();
  
  // Real wallet state via wagmi
  const { address, isConnected, status } = useAccount();
  // Lazy-mount wallet UI to avoid heavy first paint
  const [showWallet, setShowWallet] = useState(false);
  useEffect(() => { 
    // Use setTimeout to avoid setState during render
    setTimeout(() => setShowWallet(true), 0);
  }, []);

  // Removed on-chain contract hooks; gameplay is fully off-chain
  const [offchainBalanceEth, setOffchainBalanceEth] = useState<string>("0.0000");
  const [playerPoints, setPlayerPoints] = useState<string>("0.0000");
  const [prediction, setPrediction] = useState<"up" | "down" | null>(null);
  const [amount, setAmount] = useState<string>("");
  const [token, setToken] = useState<string>("ETH");
  const [timeframe, setTimeframe] = useState<string>("1m");
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [upPool, setUpPool] = useState<number>(125.5);
  const [downPool, setDownPool] = useState<number>(89.3);
  const [prices, setPrices] = useState<{ ethereum: number | null; hype: number | null }>({ ethereum: null, hype: null });
  const [prevPrices, setPrevPrices] = useState<{ ethereum: number | null; hype: number | null }>({ ethereum: null, hype: null });
  const [priceDirection, setPriceDirection] = useState<{ ethereum: 'up' | 'down' | 'same'; hype: 'up' | 'down' | 'same' }>({ ethereum: 'same', hype: 'same' });
  const [priceHistory, setPriceHistory] = useState<{ ethereum: any[]; hype: any[] }>({ ethereum: [], hype: [] });
  const [loading, setLoading] = useState<boolean>(true);
  const [chartTimeframe, setChartTimeframe] = useState<number>(1); // 1 day default
  const [activeChart, setActiveChart] = useState<'ethereum' | 'hype'>('ethereum');
  const [isBettingLocked, setIsBettingLocked] = useState<boolean>(false);
  const [isPlacingBet, setIsPlacingBet] = useState<boolean>(false);
  const [resolvingBets, setResolvingBets] = useState<Set<number>>(new Set());
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [showResultPopup, setShowResultPopup] = useState<boolean>(false);
  const [betResult, setBetResult] = useState<{
    entryPrice: number;
    exitPrice: number;
    result: "win" | "lose" | "refund";
    amount: number;
    payout: number;
    pointsEarned: number;
  } | null>(null);
  const [houseWalletBalance, setHouseWalletBalance] = useState<string>("0");
  const [showBettingHistory, setShowBettingHistory] = useState<boolean>(false);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const OWNER_ADDRESS = '0x5460156db508fC52161A97585c27035eEDf2D3ba'.toLowerCase();
  const [ownerWithdrawAmount, setOwnerWithdrawAmount] = useState<string>("");

  // Calculate points earned based on bet amount (same tiered system as API)
  const calculatePointsEarned = (betAmountEth: number): number => {
    let pointsMultiplier: number;
    
    if (betAmountEth >= 0.1) {
      pointsMultiplier = 25; // 25% for 0.1+ ETH bets
    } else if (betAmountEth >= 0.05) {
      pointsMultiplier = 50; // 50% for 0.05-0.1 ETH bets
    } else if (betAmountEth >= 0.01) {
      pointsMultiplier = 75; // 75% for 0.01-0.05 ETH bets
    } else {
      pointsMultiplier = 100; // 100% for 0.001-0.01 ETH bets
    }
    
    return (betAmountEth * pointsMultiplier) / 100;
  };
  const [withdrawSuccess, setWithdrawSuccess] = useState<boolean>(false);
  const [withdrawError, setWithdrawError] = useState<string>("");
  const [playerProfile, setPlayerProfile] = useState<any>(null);
  // Betting method toggle removed; always using off-chain deposit balance
  // Track rounds we already attempted to resolve to avoid duplicate txs
  const [resolvedRoundsMemo, setResolvedRoundsMemo] = useState<Record<number, boolean>>({});

  // Initialize round start time from localStorage or current time
  const [roundStartTime, setRoundStartTime] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const storedStartTime = localStorage.getItem('roundStartTime');
      if (storedStartTime) {
        const parsedTime = parseInt(storedStartTime, 10);
        // Check if the stored time is reasonable (not too old)
        if (Date.now() - parsedTime < 24 * 60 * 60 * 1000) { // Less than 24 hours old
          // Align the stored time with round boundaries
          const roundDuration = 60; // 1 minute rounds
          const alignedTime = Math.floor(parsedTime / (roundDuration * 1000)) * (roundDuration * 1000);
          return alignedTime;
        }
      }
    }
    // Default to current time aligned with round boundaries
    const roundDuration = 60; // 1 minute rounds
    const currentTime = Date.now();
    const alignedTime = Math.floor(currentTime / (roundDuration * 1000)) * (roundDuration * 1000);
    if (typeof window !== 'undefined') {
      localStorage.setItem('roundStartTime', alignedTime.toString());
    }
    return alignedTime;
  });
  
  const [entryPrice, setEntryPrice] = useState<number | null>(null);
  const [showBetConfirmation, setShowBetConfirmation] = useState<boolean>(false);
  const [lastBet, setLastBet] = useState<{
    amount: string;
    token: string;
    prediction: "up" | "down";
    entryPrice: number;
    timeframe: string;
  } | null>(null);
  const [recentGames, setRecentGames] = useState<Array<{
    amount: string;
    token: string;
    prediction: "up" | "down";
    entryPrice: number;
    exitPrice: number;
    result: "win" | "lose" | "refund" | "pending";
    timestamp: number;
    // Add bet-specific timing information
    startTime: number;
    duration: number;
    // Store oracle prices at start and end of bet with Pyth normalization
    startOraclePrice: number | null;
    startOracleExpo: number | null;
    endOraclePrice: number | null;
    endOracleExpo: number | null;
    isOptimistic?: boolean; // Flag for optimistic updates
  }>>([]);

  // Get round duration based on timeframe
  const getRoundDuration = () => {
    // Only 1m timeframe now
    return 60;   // 60 seconds for 1-minute game
  };


  // Check if player already has a bet in current round
  const hasBetInCurrentRound = recentGames.some(game => {
    const currentRoundId = Math.floor(Date.now() / (getRoundDuration() * 1000)) * (getRoundDuration());
    return game.timestamp === currentRoundId && 
           (game.result === "pending" || game.result === "win" || game.result === "lose");
  });

  // Allow access even if wallet is not connected; gate actions instead of redirecting

  // Reset bet confirmation when wallet disconnects
  useEffect(() => {
    if (isConnected === false) {
      setShowBetConfirmation(false);
      setLastBet(null);
    }
  }, [isConnected]);
  
  // Reset bet confirmation on component mount
  useEffect(() => {
    setShowBetConfirmation(false);
    setLastBet(null);
  }, []);

  // Note: Wallet balance refresh removed - now using deposit balance only
  
  // Off-chain balance poller
  useEffect(() => {
    let timer: any;
    const fetchOffchain = async () => {
      try {
        if (!isConnected || !address) return;
        const { offchainGetProfile } = await import('../utils/offchainClient');
        const res = await offchainGetProfile(address);
        const weiStr = res?.balance?.available ?? '0';
        const pointsStr = res?.balance?.points ?? '0';
        const eth = Number(BigInt(weiStr)) / 1e18;
        const points = Number(BigInt(pointsStr)) / 1e18;
        setOffchainBalanceEth(isFinite(eth) ? eth.toFixed(4) : '0.0000');
        setPlayerPoints(isFinite(points) ? points.toFixed(4) : '0.0000');
      } catch {}
    };
    fetchOffchain();
    timer = setInterval(fetchOffchain, 30000); // Reduce frequency to save bandwidth
    return () => timer && clearInterval(timer);
  }, [isConnected, address]);
  
  // Removed periodic on-chain profile/house balance checks
  
  // Removed on-chain winnings listener (off-chain only)
  useEffect(() => { /* no-op */ }, [isConnected, address]);
  
  useEffect(() => { /* no-op */ }, [isConnected]);
  
  useEffect(() => { /* no-op */ }, [isConnected]);
  
  useEffect(() => { /* no-op */ }, [isConnected]);
  
  useEffect(() => { /* no-op */ }, [isConnected]);
  
  // Get cutoff time based on timeframe (when betting should be locked)
  const getCutoffTime = () => {
    // Only 1m timeframe now
    return 10;  // Lock at 10 seconds remaining for 1-minute game
  };

  // Calculate round ID (start time in seconds) from a timestamp that may be in ms or seconds
  const calculateRoundId = (betTimestamp: number): number => {
    const roundDuration = 60; // seconds
    // Heuristically detect units: if value is larger than 1e12, it's ms; if around 1e9, seconds
    const tsSeconds = betTimestamp > 1e12 ? Math.floor(betTimestamp / 1000) : Math.floor(betTimestamp);
    return Math.floor(tsSeconds / roundDuration) * roundDuration;
  };

  // Get current round ID (always current time)
  const getCurrentRoundId = (): number => {
    const roundDuration = 60; // seconds
    const nowSeconds = Math.floor(Date.now() / 1000);
    return Math.floor(nowSeconds / roundDuration) * roundDuration;
  };

  // Resolve round automatically via backend API (no user confirmation needed!)
  const resolveRoundOnChainLocal = async (roundId: number, winningPrediction: boolean): Promise<string | null> => {
    try {
      console.log(`🤖 Auto-resolving round ${roundId} with winning prediction: ${winningPrediction ? 'UP' : 'DOWN'}`);
      console.log('⚡ Backend will handle resolution - no user action needed!');
      
      // Call backend API to resolve round automatically
      const response = await fetch('/api/resolve-round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundId, winningPrediction })
      });

      const data = await response.json();

      if (data.success) {
        if (data.alreadyResolved) {
          console.log('✅ Round already resolved');
        } else {
          console.log(`✅ Round resolved automatically! Tx: ${data.txHash}`);
        }
        
        // Refresh player profile after resolution
        try {
          if (address) {
            const { offchainGetProfile } = await import('../utils/offchainClient');
            const profile = await offchainGetProfile(address);
            setPlayerProfile(profile);
            const weiStr = profile?.balance?.available ?? '0';
            const pointsStr = profile?.balance?.points ?? '0';
            const eth = Number(BigInt(weiStr)) / 1e18;
            const points = Number(BigInt(pointsStr)) / 1e18;
            setOffchainBalanceEth(isFinite(eth) ? eth.toFixed(4) : '0.0000');
            setPlayerPoints(isFinite(points) ? points.toFixed(4) : '0.0000');
            console.log('💰 Profile refreshed - check your updated balance and points!');
          }
        } catch {}
        
        return data.txHash;
      } else if (data.manual) {
        // Fallback to manual resolution if backend doesn't have private key
        console.log('⚠️ Backend auto-resolution not configured, using manual resolution');
        if (!isConnected || !address) {
          console.error('Wallet not connected for manual resolution');
          return null;
        }
        const txHash: string | null = await resolveRoundOnChainLocal(roundId, winningPrediction);
        console.log('Round resolved manually on-chain:', txHash);
        return txHash;
      } else {
        console.error('Failed to auto-resolve round:', data.error);
        return null;
      }
    } catch (error) {
      console.error('Error auto-resolving round:', error);
      
      // Fallback to manual resolution
      console.log('⚠️ Falling back to manual resolution');
      if (!isConnected || !address) {
        console.error('Wallet not connected for manual resolution');
        return null;
      }
      try {
        const txHash: string | null = await resolveRoundOnChainLocal(roundId, winningPrediction);
        console.log('Round resolved manually on-chain:', txHash);
        return txHash;
      } catch (manualError) {
        console.error('Manual resolution also failed:', manualError);
        return null;
      }
    }
  };

  // Countdown timer for UI display
  useEffect(() => {
    // Get the current round duration for this timeframe
    const roundDuration = getRoundDuration();
    
    // Calculate time left based on when the round started
    const calculateTimeLeft = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - roundStartTime) / 1000);
      const timeRemaining = roundDuration - (elapsed % roundDuration);
      return timeRemaining;
    };
    
    // Ensure round start time is properly aligned with round boundaries
    const alignedRoundStart = Math.floor(roundStartTime / (roundDuration * 1000)) * (roundDuration * 1000);
    if (alignedRoundStart !== roundStartTime) {
      setRoundStartTime(alignedRoundStart);
      if (typeof window !== 'undefined') {
        localStorage.setItem('roundStartTime', alignedRoundStart.toString());
      }
    }
    
    // Validate that the round start time is not in the future
    if (roundStartTime > Date.now() + 5000) { // 5 second buffer
      const correctedRoundStart = Math.floor(Date.now() / (roundDuration * 1000)) * (roundDuration * 1000);
      setRoundStartTime(correctedRoundStart);
      if (typeof window !== 'undefined') {
        localStorage.setItem('roundStartTime', correctedRoundStart.toString());
      }
    }
    
    // Set initial time left
    let initialTimeLeft = calculateTimeLeft();
    
    console.log('Round timing info:', {
      roundStartTime,
      currentTime: Date.now(),
      initialTimeLeft,
      roundDuration
    });
    
    setTimeLeft(initialTimeLeft);
    
    const timer = setInterval(() => {
      setTimeLeft(() => {
        const cutoffTime = getCutoffTime();
        const roundDuration = getRoundDuration();
        
        // Derive time remaining from current time only to avoid drift
        const nowSec = Math.floor(Date.now() / 1000);
        const elapsedInRound = nowSec % roundDuration;
        const timeRemaining = Math.max(0, roundDuration - elapsedInRound);
        
        // Set lock state every tick (React ignores no-op sets)
        setIsBettingLocked(timeRemaining < cutoffTime);
        
        // If round ended, resolve and move to next round boundary
        if (timeRemaining === 0) {
          console.log("Resolving bets and resetting for next round - time reached 1 second");
          
          // Resolve all pending bets before resetting the round
          const pendingBets = recentGames.filter(game => game.result === "pending");
          pendingBets.forEach(bet => {
            resolveIndividualBet(bet.timestamp);
          });
          
          // Reset for next round
          setIsBettingLocked(false);
          // Calculate the start time of the next round (aligned to duration)
          const nextRoundStart = Math.ceil(Date.now() / (roundDuration * 1000)) * (roundDuration * 1000);
          
          console.log('Round transition info:', {
            oldRoundStartTime: roundStartTime,
            newRoundStartTime: nextRoundStart,
            now: Date.now(),
            roundDuration
          });
          
          setRoundStartTime(nextRoundStart);
          // Clear resolved rounds memo for new round
          setResolvedRoundsMemo({});
          // Persist the new round start time
          if (typeof window !== 'undefined') {
            localStorage.setItem('roundStartTime', nextRoundStart.toString());
          }
          return roundDuration;
        }
        
        return Math.max(0, timeRemaining);
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeframe, roundStartTime, recentGames]); // Depend on timeframe, roundStartTime, and recentGames

  // Load history and initial prices
  useEffect(() => {
    const loadInitial = async () => {
      try {
        const priceData = await fetchCryptoPrices();
        setPrices({ ethereum: priceData.ethereum, hype: priceData.hype });

        const ethHistory = await fetchPriceHistory('ethereum', chartTimeframe);
        const hypeHistory = await fetchPriceHistory('hype', chartTimeframe);
        
        // Ensure we have valid arrays
        const safeEthHistory = Array.isArray(ethHistory) ? ethHistory : [];
        const safeHypeHistory = Array.isArray(hypeHistory) ? hypeHistory : [];
        
        setPriceHistory({ ethereum: safeEthHistory, hype: safeHypeHistory });
      } catch (error) {
        console.error("Failed to fetch crypto prices:", error);
      } finally {
        setLoading(false);
      }
    };

    loadInitial();

    // Refresh history every 5 minutes
    const historyInterval = setInterval(loadInitial, 300000);
    return () => clearInterval(historyInterval);
  }, [chartTimeframe]);

  // Live price ticker (throttled + visibility-aware)
  useEffect(() => {
    let stopped = false;
    let timer: any = null;

    const tick = async () => {
      if (stopped) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        timer = setTimeout(tick, 3000);
        return;
      }
      try {
        const [eth, hype] = await Promise.all([
          getCurrentPrice('ETHUSDT'),
          getCurrentPrice('HYPEUSDT')
        ]);

        const nextEth = typeof eth === 'number' ? eth : (prices.ethereum ?? null);
        const nextHype = typeof hype === 'number' ? hype : (prices.hype ?? null);

        if (nextEth !== prices.ethereum || nextHype !== prices.hype) {
          setPrices({ ethereum: nextEth, hype: nextHype });
        }

        setPriceDirection((dir) => ({
          ethereum:
            typeof eth === 'number' && prevPrices.ethereum !== null
              ? eth > prevPrices.ethereum
                ? 'up'
                : eth < prevPrices.ethereum
                  ? 'down'
                  : 'same'
              : dir.ethereum,
          hype:
            typeof hype === 'number' && prevPrices.hype !== null
              ? hype > prevPrices.hype
                ? 'up'
                : hype < prevPrices.hype
                  ? 'down'
                  : 'same'
              : dir.hype,
        }));

        const newPrev = {
          ethereum: typeof eth === 'number' ? eth : prevPrices.ethereum,
          hype: typeof hype === 'number' ? hype : prevPrices.hype,
        };
        if (newPrev.ethereum !== prevPrices.ethereum || newPrev.hype !== prevPrices.hype) {
          setPrevPrices(newPrev);
        }
      } catch {}
      finally {
        timer = setTimeout(tick, 5000); // Reduce frequency to save CPU
      }
    };

    tick();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [getCurrentPrice, prices, prevPrices]);

  // FAST RESOLUTION TIMER - Check every 1 second for pending bets
  useEffect(() => {
    if (!address) return;
    
    const checkAndResolveBets = () => {
      const now = Date.now();
      recentGames.forEach(game => {
        if (game.result === "pending") {
          const betEndTime = game.startTime + (game.duration * 1000);
          // Resolve 5 seconds early for faster feedback
          if (now >= betEndTime - 5000) {
            console.log(`Bet ${game.timestamp} is ready for resolution (early)`);
            resolveIndividualBet(game.timestamp);
          }
        }
      });
    };
    
    // Check every 2 seconds to reduce CPU usage
    const interval = setInterval(checkAndResolveBets, 2000);
    
    return () => clearInterval(interval);
  }, [recentGames, address]);

  // Get a fast current price with a strict timeout and safe fallback
  const getFastCurrentPrice = async (symbol: 'ETHUSDT' | 'HYPEUSDT', fallbackPrice: number | null): Promise<number | null> => {
    const timeoutMs = 1500;
    try {
      const pricePromise = getCurrentPrice(symbol);
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
      const priceOrNull = await Promise.race([pricePromise, timeoutPromise]);
      if (typeof priceOrNull === 'number' && isFinite(priceOrNull) && priceOrNull > 0) {
        return priceOrNull;
      }
    } catch {}
    return typeof fallbackPrice === 'number' && isFinite(fallbackPrice) && fallbackPrice > 0
      ? fallbackPrice
      : null;
  };

  // Resolve an individual bet based on its timestamp
  const resolveIndividualBet = async (betTimestamp: number) => {
    // Check if this bet is already being resolved to prevent duplicate resolution
    if (resolvingBets.has(betTimestamp)) {
      console.log(`Bet ${betTimestamp} is already being resolved, skipping`);
      return;
    }
    
    // Check if this bet has already been resolved
    const existingBet = recentGames.find(game => game.timestamp === betTimestamp);
    if (!existingBet || existingBet.result !== "pending") {
      console.log(`Bet ${betTimestamp} already resolved or not found, skipping`);
      return;
    }
    
    // Mark this bet as being resolved
    setResolvingBets(prev => new Set([...prev, betTimestamp]));
    
    // Off-chain rounds are 1 minute; keep in sync with roundId generator
    const timeframeSeconds = 60;
    console.log(`=== RESOLVING INDIVIDUAL BET: ${betTimestamp} ===`);
    
    // Find the specific bet to resolve
    const betToResolve = recentGames.find(game => game.timestamp === betTimestamp);
    
    if (!betToResolve || betToResolve.result !== "pending") {
      console.log("Bet not found or already resolved");
      return;
    }
    
    // INSTANT UI UPDATE - Mark as resolving
    setRecentGames(prev => prev.map(game => 
      game.timestamp === betTimestamp
        ? { ...game, result: "resolving" as any }
        : game
    ));
    
    // Get current price as end price quickly with timeout and fallback to last seen price
    let currentPrice: number | null = null;
    if (betToResolve.token === 'HYPE') {
      currentPrice = await getFastCurrentPrice('HYPEUSDT', prices.hype);
    } else if (betToResolve.token === 'ETH') {
      currentPrice = await getFastCurrentPrice('ETHUSDT', prices.ethereum);
    } else {
      // For other tokens, use the existing method
      currentPrice = betToResolve.token === 'ETH' ? prices.ethereum : prices.hype;
    }
    
    // If Hyperliquid service didn't provide a price, use existing method
    if (currentPrice === null) {
      const priceData = betToResolve.token === 'ETH' ? prices.ethereum : prices.hype;
      currentPrice = priceData !== null ? priceData : null;
    }
    
    console.log("Current price:", currentPrice);
    if (currentPrice === null) {
      console.log("Could not resolve bet - unable to fetch current price");
      // Treat as lose if we can't get current price (no refunds)
      const updatedGames = recentGames.map(game => 
        game.timestamp === betTimestamp
          ? { ...game, exitPrice: game.entryPrice, result: "lose" as "win" | "lose" | "refund" | "pending" }
          : game
      );
      
      setRecentGames(updatedGames);
      
      // Update betting history in localStorage
      if (typeof window !== 'undefined' && address) {
        try {
          const historyKey = `bettingHistory_${address}`;
          const existingHistory = localStorage.getItem(historyKey);
          if (existingHistory) {
            const history = JSON.parse(existingHistory);
            const updatedHistory = history.map((bet: any) => 
              bet.timestamp === betTimestamp
                ? { ...bet, exitPrice: betToResolve.entryPrice, result: "lose" }
                : bet
            );
            localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
          }
        } catch (err) {
          console.error("Failed to update bet in history:", err);
        }
      }
      
      return;
    }
    
    // Use higher precision for exit price recording
    const preciseExitPrice = Number(currentPrice.toFixed(6));
    
    // Get entry price (when player placed bet) and current price (when bet resolves)
    const entryPrice = betToResolve.entryPrice;
    const exitPrice = preciseExitPrice;
    
    console.log("Entry price (player bet):", entryPrice);
    console.log("Exit price (current):", exitPrice);
    
    // Calculate price difference with tolerance and determine result with tie/refund
    const priceDifference = exitPrice - entryPrice;
    const epsilon = 1e-6; // treat ultra-small moves as no movement
    console.log("Price difference:", priceDifference);
    
    let result: "win" | "lose" | "refund" = "lose";
    let payout = 0;

    if (Math.abs(priceDifference) <= epsilon) {
      result = "refund";
      payout = parseFloat(betToResolve.amount); // refund stake on tie
      console.log("↔️ BET REFUNDED - No meaningful price change");
    } else if ((priceDifference > 0 && betToResolve.prediction === "up") || (priceDifference < 0 && betToResolve.prediction === "down")) {
      result = "win";
      const grossPayout = parseFloat(betToResolve.amount) * 2;
      const commission = grossPayout * 0.05;
      payout = grossPayout - commission;
      console.log("✅ BET WON - Price moved in predicted direction");
    } else {
      result = "lose";
      payout = 0;
      console.log("❌ BET LOST - Price moved opposite to prediction");
    }
    
    console.log(`Final result for bet ${betTimestamp}:`, result);
    
    // FAST RESOLUTION - Update UI immediately, resolve backend in background
    // Use the original round id we stored on the bet (already seconds and aligned)
    const roundId = betToResolve.timestamp;
    console.log("Calculated round ID:", roundId);

    // Update UI with result immediately
    const updatedGames = recentGames.map(game => 
      game.timestamp === betTimestamp
        ? { 
            ...game, 
            exitPrice: exitPrice,
            result 
          }
        : game
    );
    
    setRecentGames(updatedGames);
    
    // Show result popup immediately for all results
    setBetResult({
      entryPrice: betToResolve.entryPrice,
      exitPrice: exitPrice,
      result,
      amount: parseFloat(betToResolve.amount),
      payout,
      pointsEarned: calculatePointsEarned(parseFloat(betToResolve.amount))
    });
    setShowResultPopup(true);
    
    // Update balance optimistically
    if (result === "win" && playerProfile?.balance) {
      const currentBalance = Number(BigInt(playerProfile.balance)) / 1e18;
      const newBalance = currentBalance + payout;
      setOffchainBalanceEth(newBalance.toFixed(4));
    }
    
    // Resolve backend in background (non-blocking)
    try {
      const winningSide = priceDifference > 0 ? "up" : "down";
      const nowSec = Math.floor(Date.now() / 1000);
      const roundEndSec = roundId + timeframeSeconds;
      
      // Always resolve immediately for better user experience
      console.log('🔄 Resolving bet immediately via backend...');
      const { offchainResolveRound, offchainGetProfile } = await import('../utils/offchainClient');
      
      try {
        const res = await offchainResolveRound(roundId, winningSide);
        console.log('✅ Off-chain resolution successful', res);
        setResolvedRoundsMemo(prev => ({ ...prev, [roundId]: true }));
        
        // Refresh balance from backend
        if (address) {
          console.log('🔄 Refreshing balance after resolution...');
          const oc = await offchainGetProfile(address);
          const weiStr = oc?.balance?.available ?? '0';
          const pointsStr = oc?.balance?.points ?? '0';
          const eth = Number(BigInt(weiStr)) / 1e18;
          const points = Number(BigInt(pointsStr)) / 1e18;
          console.log('💰 Updated balance from backend:', { eth, points });
          setOffchainBalanceEth(isFinite(eth) ? eth.toFixed(4) : '0.0000');
          setPlayerPoints(isFinite(points) ? points.toFixed(4) : '0.0000');
        }
      } catch (error: any) {
        console.error('❌ Failed to resolve off-chain:', error);
        // Mark as resolved to prevent infinite retries
        setResolvedRoundsMemo(prev => ({ ...prev, [roundId]: true }));
      }
    } catch (error) {
      console.error('Failed to resolve off-chain:', error);
    }
    
    console.log("=====================================");
    
    // Update betting history in localStorage
    if (typeof window !== 'undefined' && address) {
      try {
        const historyKey = `bettingHistory_${address}`;
        const existingHistory = localStorage.getItem(historyKey);
        if (existingHistory) {
          const history = JSON.parse(existingHistory);
          const updatedHistory = history.map((bet: any) => 
            bet.timestamp === betTimestamp
              ? { ...bet, exitPrice: exitPrice, result: result }
              : bet
          );
          localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
        }
      } catch (err) {
        console.error("Failed to update bet in history:", err);
      }
    }
    
    // Remove this bet from the resolving set
    setResolvingBets(prev => {
      const newSet = new Set(prev);
      newSet.delete(betTimestamp);
      return newSet;
    });
  };

  const handlePlaceBet = async () => {
    
    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }
    
    if (!prediction) {
      alert("Please select UP or DOWN");
      return;
    }
    
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    
    // Check if player has sufficient balance
    const currentBalance = parseFloat(offchainBalanceEth);
    const betAmount = parseFloat(amount);
    if (currentBalance < betAmount) {
      alert(`❌ INSUFFICIENT FUNDS\n\nYour balance: ${currentBalance.toFixed(6)} ETH\nRequired: ${betAmount.toFixed(6)} ETH\n\nPlease deposit more funds to continue betting.`);
      return;
    }
    
    if (isBettingLocked) {
      alert("Betting is currently locked. Please wait for the next round.");
      return;
    }
    
    // INSTANT UI FEEDBACK - Update UI immediately
    setIsPlacingBet(true);
    const currentPrice = token === 'ETH' ? prices.ethereum : prices.hype;
    
    if (currentPrice === null) {
      alert("Unable to fetch current price. Please try again.");
      setIsPlacingBet(false);
      return;
    }
    
    // Calculate roundId first for consistent timestamp
    const roundDuration = getRoundDuration();
    const roundId = Math.floor(Date.now() / (roundDuration * 1000)) * roundDuration;
    console.log('Calculated round ID for bet:', roundId, 'Current timestamp:', Math.floor(Date.now() / 1000));
    
    // Create optimistic bet entry immediately
    const optimisticBet = {
      amount,
      token,
      prediction,
      entryPrice: Number(currentPrice.toFixed(6)),
      exitPrice: 0,
      result: "pending" as const,
      timestamp: roundId, // Use roundId instead of Date.now()
      startTime: Date.now(),
      duration: 60,
      startOraclePrice: null,
      startOracleExpo: null,
      endOraclePrice: null,
      endOracleExpo: null,
      isOptimistic: true // Flag for optimistic updates
    };
    
    // Add to UI immediately for instant feedback
    setRecentGames(prev => [optimisticBet, ...prev].slice(0, 8));
    
    // Show instant confirmation
    setLastBet({
      amount,
      token,
      prediction,
      entryPrice: optimisticBet.entryPrice,
      timeframe: "1m"
    });
    setShowBetConfirmation(true);
    
    // Hide confirmation after 3 seconds (faster)
    setTimeout(() => {
      setShowBetConfirmation(false);
    }, 3000);
    
    // Reset form immediately
    setPrediction(null);
    setAmount("");
    
    // Update balance optimistically
    if (playerProfile?.balance) {
      const currentBalance = Number(BigInt(playerProfile.balance)) / 1e18;
      const newBalance = Math.max(0, currentBalance - betAmount);
      setOffchainBalanceEth(newBalance.toFixed(4));
    }
    
    try {
      // Get timeframe in seconds (only 1m timeframe now)
      const timeframeSeconds = 60;
      
      // Use the roundId we already calculated above
      const now = Math.floor(Date.now() / 1000);
      
      // Additional validation to ensure roundId is valid
      if (roundId <= 0) {
        console.error('Invalid round ID generated:', roundId);
        alert('Error: Invalid round ID generated. Please refresh the page.');
        setIsPlacingBet(false);
        return;
      }
      
      // Validate that the roundId is properly aligned with round boundaries
      if (roundId % roundDuration !== 0) {
        console.log('Round ID not aligned with boundaries:', { roundId, roundDuration });
        alert('Error: Round ID not aligned with boundaries. Please refresh the page.');
        setIsPlacingBet(false);
        return;
      }
      
      // Calculate time remaining in current round
      const elapsedInCurrentRound = Math.floor((Date.now() - (roundId * 1000)) / 1000);
      const timeRemainingInRound = roundDuration - elapsedInCurrentRound;
      const roundStartTime = roundId * 1000;
      
      console.log("Placing bet with parameters:", { 
        roundId, 
        prediction, 
        amount, 
        timeframeSeconds,
        currentTime: now,
        timeUntilRoundEnd: (roundId + timeframeSeconds) - now,
        roundStartTime: roundStartTime,
        elapsedInCurrentRound: elapsedInCurrentRound,
        timeRemainingInRound: timeRemainingInRound,
        currentRoundEnd: roundId + timeframeSeconds,
        actualCurrentTime: Date.now()
      });
      
      // Check if we're past the betting cutoff time
      if (timeRemainingInRound <= getCutoffTime()) {
        alert("Betting is currently locked. Please wait for the next round.");
        setIsPlacingBet(false);
        return;
      }

      // 🚨 CRITICAL: Check if player already has a bet in this round (client-side validation)
      const existingBet = recentGames.find(game => 
        game.timestamp === roundId && 
        (game.result === "pending" || game.result === "win" || game.result === "lose")
      );
      
      if (existingBet) {
        console.log('🚫 BLOCKED: Player already has bet in this round:', { roundId, existingBet });
        alert(`You already have a bet in this round. Only one bet per round is allowed.`);
        setIsPlacingBet(false);
        return;
      }
      
      // Additional check: prevent multiple bets within the same round window
      const currentTime = Date.now();
      const roundEndTime = roundStartTime + (roundDuration * 1000);
      
      const betsInCurrentRound = recentGames.filter(game => {
        const gameTime = game.timestamp * 1000; // Convert to milliseconds
        return gameTime >= roundStartTime && gameTime < roundEndTime && 
               (game.result === "pending" || game.result === "win" || game.result === "lose");
      });
      
      if (betsInCurrentRound.length > 0) {
        console.log('🚫 BLOCKED: Multiple bets detected in current round:', { 
          roundId, 
          roundStartTime, 
          roundEndTime, 
          currentTime,
          betsInCurrentRound 
        });
        alert(`You already have a bet in this round. Only one bet per round is allowed.`);
        setIsPlacingBet(false);
        return;
      }
      
      // Additional validation to ensure we're not trying to place a bet for a round that's already ended
      const currentRoundEnd = roundId + timeframeSeconds;
      if (now >= currentRoundEnd) {
        console.log('Attempted to place bet for ended round:', { roundId, currentRoundEnd, now });
        alert("This round has already ended. Please wait for the next round.");
        setIsPlacingBet(false);
        return;
      }
      
      // Ensure we're not placing a bet too early for a future round
      if (roundId * 1000 > Date.now() + 5000) { // 5 second buffer
        console.log('Attempted to place bet for future round:', { roundId, currentTime: Date.now() });
        alert("Invalid round timing. Please try again.");
        setIsPlacingBet(false);
        return;
      }
      
      // Log balances before betting
      console.log('💰 BEFORE BET:');
      console.log('  Deposit Balance:', playerProfile?.balance ? String(playerProfile.balance) : 'N/A', 'WEI');
      console.log('  Using mode:', 'DEPOSIT BALANCE');
      
      // OFF-CHAIN: place bet and await response for reliable UX
      const { offchainPlaceBet } = await import('../utils/offchainClient');
      const side = prediction === 'up' ? 'up' : 'down';

      try {
        const resp = await offchainPlaceBet({ address: address!, amount, side, roundId, timeframe: timeframeSeconds });
        console.log('✅ Off-chain bet placed:', resp);
        // Mark optimistic entry as confirmed
        setRecentGames(prev => prev.map(game =>
          game.timestamp === optimisticBet.timestamp && game.isOptimistic
            ? { ...game, isOptimistic: false }
            : game
        ));
      } catch (err) {
        console.error('❌ Off-chain bet failed:', err);
        const errorMessage = (err as any)?.message || 'Unknown error';
        
        // Check if it's a timeout/abort error (bet might have actually succeeded)
        if (errorMessage.includes('aborted') || errorMessage.includes('timeout') || errorMessage.includes('signal')) {
          console.log('⚠️ Bet request timed out - checking if bet actually succeeded...');
          // Don't remove the optimistic bet immediately - let the user check their balance
          // The bet might have actually succeeded on the backend
          
          // Try to refresh the user's balance to see if the bet actually succeeded
          try {
            const { offchainGetProfile } = await import('../utils/offchainClient');
            const profile = await offchainGetProfile(address!);
            const weiStr = profile?.balance?.available ?? '0';
            const pointsStr = profile?.balance?.points ?? '0';
            const eth = Number(BigInt(weiStr)) / 1e18;
            const points = Number(BigInt(pointsStr)) / 1e18;
            setOffchainBalanceEth(isFinite(eth) ? eth.toFixed(4) : '0.0000');
            setPlayerPoints(isFinite(points) ? points.toFixed(4) : '0.0000');
            console.log('💰 Balance refreshed after timeout - check if bet succeeded');
          } catch (refreshError) {
            console.error('Failed to refresh balance after timeout:', refreshError);
          }
          
          alert('⚠️ BET REQUEST TIMED OUT\n\nYour bet may have been placed successfully.\n\nPlease check your balance and recent games.\n\nIf the bet appears in your history, it was successful.');
        } else {
          // Remove optimistic bet on actual failure
          setRecentGames(prev => prev.filter(game =>
            !(game.timestamp === optimisticBet.timestamp && game.isOptimistic)
          ));
          // Revert balance
          if (playerProfile?.balance) {
            const currentBalance = Number(BigInt(playerProfile.balance)) / 1e18;
            setOffchainBalanceEth(currentBalance.toFixed(4));
          }
          
          if (errorMessage.includes('Insufficient balance')) {
            alert('❌ INSUFFICIENT FUNDS\n\nYou need to deposit ETH to your account before betting.\n\nGo to the Deposit page to add funds.');
          } else {
            alert('Bet failed: ' + errorMessage);
          }
        }
      } finally {
        setIsPlacingBet(false);
      }
      
      // Set entry price for display
      setEntryPrice(optimisticBet.entryPrice);
      
      // Save to betting history in localStorage
      if (typeof window !== 'undefined' && address) {
        try {
          const historyKey = `bettingHistory_${address}`;
          const existingHistory = localStorage.getItem(historyKey);
          const history = existingHistory ? JSON.parse(existingHistory) : [];
          
          // Add the new bet to history with a unique ID
          const betWithId = {
            ...optimisticBet,
            id: `${address}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            transactionHash: undefined
          };
          
          const updatedHistory = [betWithId, ...history].slice(0, 100); // Keep last 100 bets
          localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
        } catch (err) {
          console.error("Failed to save bet to history:", err);
        }
      }
    } catch (error: any) {
      console.error("Error placing bet:", error);
      
      // Provide more specific error messages to the user
      let errorMessage = "Failed to place bet. Please try again.";
      
      if (error.message) {
        if (error.message.includes("Wallet not connected")) {
          errorMessage = "Wallet not connected. Please connect your wallet and try again.";
        } else if (error.message.includes("Incorrect network")) {
          errorMessage = "Please switch to Sepolia testnet (chain ID: 11155111) and try again.";
        } else if (error.message.includes("Invalid bet amount")) {
          errorMessage = "Invalid bet amount. Please enter a valid amount.";
        } else if (error.message.includes("User denied transaction signature")) {
          errorMessage = "Transaction rejected. Please confirm the transaction in your wallet.";
        } else if (error.message.includes("insufficient funds")) {
          errorMessage = "Insufficient funds. Please check your wallet balance.";
        }
      }
      
      alert(errorMessage);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCutoffTimeDisplay = () => {
    const cutoffTime = getCutoffTime();
    const mins = Math.floor(cutoffTime / 60);
    const secs = cutoffTime % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Format timestamp for chart display
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Prepare chart data - with safety checks
  const chartData = (priceHistory.ethereum && Array.isArray(priceHistory.ethereum) ? priceHistory.ethereum : []).map((ethPoint, index) => {
    const hypePoint = priceHistory.hype && Array.isArray(priceHistory.hype) ? priceHistory.hype[index] : null;
    return {
      time: formatTimestamp(ethPoint.timestamp),
      ethereum: ethPoint.price,
      hype: hypePoint ? hypePoint.price : null
    };
  }).filter(point => point.hype !== null); // Only include points where both prices exist

  // Close result popup
  const closeResultPopup = () => {
    setShowResultPopup(false);
    setBetResult(null);
  };

  // Handle owner withdrawal (Note: This would need to be implemented in the contract)
  const handleOwnerWithdraw = async () => {
    if (!isConnected) return;
    
    try {
      setWithdrawError("");
      setWithdrawSuccess(false);
      
      // Note: Owner withdrawal functionality would need to be implemented in the contract
      // For now, we'll just show an error message
      setWithdrawError("Owner withdrawal functionality not implemented in contract");
      
    } catch (error: any) {
      console.error("Error withdrawing funds:", error);
      setWithdrawError(error.message || "Failed to withdraw funds");
    }
  };

  // Check if connected wallet is the contract owner
  useEffect(() => {
    if (!address) { setIsOwner(false); return; }
    setIsOwner(address.toLowerCase() === OWNER_ADDRESS);
  }, [address]);

  return (
    <div className="min-h-screen text-white pixel-font pixel-bg">
      {/* Navigation Loading Overlay */}
      {isNavigating && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="pixel-card p-6 text-center">
            <div className="pixel-dot w-8 h-8 animate-pulse mx-auto mb-4"></div>
            <div className="pixel-text text-white">Loading page...</div>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="flex justify-between items-center p-6">
        <div 
          className="pixel-logo cursor-pointer"
          onClick={() => window.location.href = '/'}
        >
          <span className="dot" />Kairos
        </div>
        <div className="flex items-center gap-3">
          {isConnected && address && (
            <>
              <div className="pixel-tag px-3 py-2 text-sm">
                <span className="text-gray-300 font-mono font-medium">
                  Deposit: {offchainBalanceEth} ETH
                </span>
              </div>
                     <div className="pixel-tag px-3 py-2 text-sm">
                       <span className="text-yellow-400 font-mono font-medium">
                         $Kai: {playerPoints}
                       </span>
                     </div>
            </>
          )}
          <div>
            {showWallet ? <EnhancedWalletConnect /> : null}
          </div>
        </div>
      </header>
      
      {/* Floating Bet Confirmation Box */}
      {showBetConfirmation && lastBet && (
        <div className="fixed top-20 right-4 z-50 animate-fadeIn">
          <div className="glass-card p-4 rounded-xl shadow-lg max-w-xs">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg mb-2">Bet Placed!</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Amount:</span>
                    <span className="font-medium">{lastBet.amount} ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Prediction:</span>
                    <span className={`font-medium ${lastBet.prediction === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                      {lastBet.prediction.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Entry Price:</span>
                    <span className="font-medium">${lastBet.entryPrice.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Timeframe:</span>
                    <span className="font-medium">{lastBet.timeframe}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setShowBetConfirmation(false)}
                className="text-gray-400 hover:text-white ml-2"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="pixel-title-animated block w-full text-center mb-2">Kairos</h1>
        <p className="text-gray-300 text-center mb-12">Predict cryptocurrency price movements and win crypto rewards</p>

        {!isConnected ? (
          <div className="pixel-card p-12 text-center">
            <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
            <p className="text-gray-300 mb-8">Connect your EVM wallet to start playing</p>
            <div className="mx-auto inline-block">
              {showWallet ? <EnhancedWalletConnect /> : null}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Left Column - Prediction Form and Price Info */}
            <div className="space-y-8 flex flex-col">
              {/* Live Price Display */}
              <div className="pixel-card pixel-card--soft p-6">
                <h2 className="text-2xl font-bold mb-4">Live Crypto Prices</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 pixel-card pixel-card--soft">
                    <div className="text-gray-400">Ethereum (ETH)</div>
                    {loading ? (
                      <div className="text-xl font-bold animate-pulse">Loading...</div>
                    ) : (
                      <div className={`text-xl font-bold ${priceDirection.ethereum === 'up' ? 'text-green-400' : priceDirection.ethereum === 'down' ? 'text-red-400' : ''}`}>
                        ${prices.ethereum?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    )}
                  </div>
                  <div className="p-4 pixel-card pixel-card--soft">
                    <div className="text-gray-400">HYPE Token</div>
                    {loading ? (
                      <div className="text-xl font-bold animate-pulse">Loading...</div>
                    ) : (
                      <div className={`text-xl font-bold ${priceDirection.hype === 'up' ? 'text-green-400' : priceDirection.hype === 'down' ? 'text-red-400' : ''}`}>
                        ${prices.hype?.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-xs text-yellow-400 mt-2">
                  * Using ETH tokens on Hyperliquid testnet
                </div>
              </div>

              {/* Prediction Form */}
              <div className="pixel-card pixel-card--soft p-6">
                <h2 className="pixel-text-large text-2xl font-bold mb-6 text-white">PLACE YOUR PREDICTION</h2>
                
                {/* Timeframe Selection - Only 1 minute option now */}
                <div className="mb-6">
                  <h3 className="pixel-text text-lg font-semibold mb-3 text-white">TIMEFRAME</h3>
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={() => setTimeframe("1m")}
                      className="pixel-button pixel-button--blue"
                    >
                      1 MIN
                    </button>
                  </div>
                </div>
                
                {/* Prediction Selection */}
                <div className="mb-6">
                  <h3 className="pixel-text text-lg font-semibold mb-3 text-white">YOUR PREDICTION</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setPrediction("up")}
                      aria-pressed={prediction === 'up'}
                      className={`pixel-button pixel-button--green flex flex-col items-center justify-center transition-transform ${prediction === 'up' ? 'ring-4 ring-green-400 scale-[1.02]' : ''}`}
                    >
                      <span className="text-xl font-bold">UP</span>
                    </button>
                    
                    <button
                      onClick={() => setPrediction("down")}
                      aria-pressed={prediction === 'down'}
                      className={`pixel-button pixel-button--red flex flex-col items-center justify-center transition-transform ${prediction === 'down' ? 'ring-4 ring-red-400 scale-[1.02]' : ''}`}
                    >
                      <span className="text-xl font-bold">DOWN</span>
                    </button>
                  </div>
                  <div className="mt-3 text-sm text-center">
                    {prediction === 'up' && <span className="text-green-400 font-semibold">Selected: UP</span>}
                    {prediction === 'down' && <span className="text-red-400 font-semibold">Selected: DOWN</span>}
                    {!prediction && <span className="text-gray-400">Choose UP or DOWN to continue</span>}
                  </div>
                </div>
                
                {/* Betting method toggle removed; always using off-chain deposit balance */}
                <div className="mb-4" />

                {/* Token and Amount */}
                <div className="mb-6">
                  <h3 className="pixel-text text-lg font-semibold mb-3 text-white">BET AMOUNT</h3>
                  <div className="flex gap-3">
                    <select
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      className="pixel-card pixel-card--soft p-3 w-24"
                    >
                      <option value="ETH">ETH</option>
                      <option value="USDC">USDC</option>
                    </select>
                    <input
                      type="number"
                      min={0}
                      step="0.0001"
                      inputMode="decimal"
                      onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                      onKeyDown={(e) => { if (["e","E","+","-"].includes(e.key)) e.preventDefault(); }}
                      value={amount}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "") { setAmount(""); return; }
                        const num = parseFloat(v);
                        if (Number.isNaN(num)) return;
                        const clamped = Math.max(0, num);
                        setAmount(clamped.toString());
                      }}
                      placeholder="0.00"
                      className="flex-1 pixel-card pixel-card--soft p-3"
                    />
                  </div>
                  <div className="pixel-text text-xs text-yellow-400 mt-2">
                    * Using test tokens on local testnet
                  </div>
                </div>
                
                {/* Place Bet Button */}
                <button
                  onClick={() => handlePlaceBet()}
                  disabled={!prediction || !amount || isBettingLocked || isPlacingBet || hasBetInCurrentRound || parseFloat(offchainBalanceEth) < parseFloat(amount || '0')}
                  className={`w-full pixel-button pixel-button--purple text-lg ${(isBettingLocked || isPlacingBet || hasBetInCurrentRound || parseFloat(offchainBalanceEth) < parseFloat(amount || '0')) ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {isPlacingBet ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      PLACING BET...
                    </div>
                  ) : hasBetInCurrentRound ? "ALREADY BET IN THIS ROUND" : isBettingLocked ? "BETTING LOCKED" : 
                    parseFloat(offchainBalanceEth) < parseFloat(amount || '0') ? "INSUFFICIENT FUNDS" : 
                    "PLACE BET"}
                </button>
                
              </div>
              
              {/* Recent Games */}
              <div className="pixel-card pixel-card--soft p-6 flex-shrink-0">
                <h2 className="pixel-text-large text-2xl font-bold mb-4 text-white">RECENT GAMES</h2>
                <div className="space-y-3">
                  {recentGames.length > 0 ? (
                    recentGames.map((game: any, index: number) => (
                      <div key={index} className="p-3 pixel-card pixel-card--soft">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium">
                              {game.amount} ETH on {game.prediction.toUpperCase()}
                            </div>
                            <div className="text-sm text-gray-400">
                              {new Date(game.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                          <div className={`font-bold ${game.result === 'win' ? 'text-green-400' : game.result === 'lose' ? 'text-red-400' : game.result === 'refund' ? 'text-yellow-400' : 'text-gray-400'}`}>
                            {game.result === 'win' ? 'WON' : game.result === 'lose' ? 'LOST' : game.result === 'refund' ? 'REFUND' : 'PENDING'}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Entry: ${game.entryPrice.toFixed(4)} | Exit: {game.result !== 'pending' ? `$${game.exitPrice.toFixed(4)}` : '...'}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-400">
                      No recent games. Place your first prediction!
                    </div>
                  )}
                </div>
                
                {/* Debug Info */}
                <div className="flex-shrink-0">
                  <DebugInfo recentGames={recentGames} />
                </div>
              </div>
              
              {/* Betting History */}
              <div className="flex-grow">
                <BettingHistory />
              </div>
            </div>
            
            {/* Right Column - Game Info and Charts */}
            <div className="space-y-8">
              {/* Countdown Timer */}
              <div className="pixel-card pixel-card--soft p-6 text-center">
                <h2 className="text-2xl font-bold mb-2">Round Status</h2>
                <div className="text-4xl font-mono font-bold">{formatTime(timeLeft)}</div>
                <p className="text-gray-400 mt-2">
                  {isBettingLocked 
                    ? "Betting locked - Round resolving soon" 
                    : `Betting closes at ${getCutoffTimeDisplay()}`}
                </p>
                <div className="mt-4 w-full pixel-card pixel-card--soft h-4">
                  <div 
                    className="bg-purple-500 h-4" 
                    style={{ width: `${((getRoundDuration() - timeLeft) / getRoundDuration()) * 100}%` }}
                  />
                </div>
              </div>
              
              {/* Candlestick Chart */}
              <div>
                <div className="flex justify-center mb-4">
                  <div className="inline-flex p-1 gap-2">
                    <button
                      onClick={() => setActiveChart('ethereum')}
                      className="pixel-button text-sm"
                    >
                      Ethereum (ETH)
                    </button>
                    <button
                      onClick={() => setActiveChart('hype')}
                      className="pixel-button text-sm"
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
              
              {/* Pools */}
              <div className="pixel-card pixel-card--soft p-6">
                <h2 className="text-2xl font-bold mb-4">Game Information</h2>
                
                <div className="space-y-4">
                  <div className="p-4 pixel-card pixel-card--soft">
                    <div className="flex justify-between">
                      <span className="font-semibold">UP Pool</span>
                      <span className="font-bold">{upPool.toFixed(2)} ETH</span>
                    </div>
                    <div className="w-full pixel-card pixel-card--soft h-3 mt-2">
                      <div className="bg-green-500 h-3" style={{ width: `${(upPool / (upPool + downPool)) * 100}%` }} />
                    </div>
                  </div>
                  
                  <div className="p-4 pixel-card pixel-card--soft">
                    <div className="flex justify-between">
                      <span className="font-semibold">DOWN Pool</span>
                      <span className="font-bold">{downPool.toFixed(2)} ETH</span>
                    </div>
                    <div className="w-full pixel-card pixel-card--soft h-3 mt-2">
                      <div className="bg-red-500 h-3" style={{ width: `${(downPool / (upPool + downPool)) * 100}%` }} />
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="flex justify-between">
                    <span className="font-semibold">Total Pool</span>
                    <span className="font-bold">{(upPool + downPool).toFixed(2)} ETH</span>
                  </div>
                </div>
              </div>


              {/* Owner Controls - Only visible to contract owner */}
              {isOwner && (
                <div className="glass-card p-6">
                  <h2 className="text-2xl font-bold mb-4">Owner Controls</h2>
                  
                  <div className="space-y-4">
                    <div className="p-4 glass-card">
                      <div className="flex justify-between">
                        <span className="font-semibold">House Wallet</span>
                        <span className="font-bold">{houseWalletBalance} ETH</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        All bets are held here until resolved
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-700">
                      <h3 className="text-lg font-semibold mb-3">Withdraw Funds</h3>
                      <div className="flex gap-3">
                        <input
                          type="number"
                          value={ownerWithdrawAmount}
                          onChange={(e) => setOwnerWithdrawAmount(e.target.value)}
                          placeholder="0.00"
                          className="flex-1 glass-card p-3"
                        />
                        <button
                          onClick={handleOwnerWithdraw}
                          disabled={!ownerWithdrawAmount || parseFloat(ownerWithdrawAmount) <= 0}
                          className="glass-button px-4 py-2 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Withdraw
                        </button>
                      </div>
                      
                      {withdrawSuccess && (
                        <div className="mt-3 text-green-400 text-sm">
                          Withdrawal successful!
                        </div>
                      )}
                      
                      {withdrawError && (
                        <div className="mt-3 text-red-400 text-sm">
                          Error: {withdrawError}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      
      {/* Result Popup - Pixel Art Retro Style */}
      {showResultPopup && betResult && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-md w-full mx-4">
            {/* Pixel Art Modal Background */}
            <div 
              className="relative p-6 border-4 border-white bg-gradient-to-b from-blue-900 to-blue-800"
              style={{
                backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.1) 0 2px, transparent 2px 4px)",
                imageRendering: 'pixelated'
              }}
            >
              {/* Close Button */}
              <button
                onClick={closeResultPopup}
                className="absolute top-2 right-2 w-8 h-8 bg-red-600 border-2 border-white text-white font-bold text-lg flex items-center justify-center hover:bg-red-700"
                style={{ imageRendering: 'pixelated' }}
              >
                ×
              </button>

              <div className="text-center">
                {/* Result Icon */}
                <div className="mb-4">
                  {betResult.result === 'win' ? (
                    <div className="text-6xl">🎉</div>
                  ) : betResult.result === 'lose' ? (
                    <div className="text-6xl">💀</div>
                  ) : (
                    <div className="text-6xl">🔄</div>
                  )}
                </div>

                {/* Title */}
                <h2 
                  className={`text-4xl font-bold mb-2 tracking-wider ${betResult.result === 'win' ? 'text-green-400' : betResult.result === 'lose' ? 'text-red-400' : 'text-yellow-400'}`}
                  style={{ 
                    textShadow: '2px 2px 0px #000',
                    fontFamily: 'monospace'
                  }}
                >
                  {betResult.result === 'win' ? 'YOU WON!' : betResult.result === 'lose' ? 'GAME OVER' : 'REFUNDED'}
                </h2>

                {/* Subtitle */}
                <div className="mb-6">
                  {betResult.result === 'win' && (
                    <p className="text-white text-lg" style={{ fontFamily: 'monospace' }}>
                      Congratulations! You doubled your bet.
                    </p>
                  )}
                  {betResult.result === 'lose' && (
                    <p className="text-white text-lg" style={{ fontFamily: 'monospace' }}>
                      Better luck next time!
                    </p>
                  )}
                  {betResult.result === 'refund' && (
                    <p className="text-white text-lg" style={{ fontFamily: 'monospace' }}>
                      Bet refunded due to insufficient price movement.
                    </p>
                  )}
                </div>

                {/* Game Stats */}
                <div className="space-y-2 my-6 bg-black/30 p-4 border-2 border-white">
                  <div className="flex justify-between py-1 border-b border-gray-400">
                    <span className="text-white font-mono">Entry Price:</span>
                    <span className="text-white font-mono font-bold">${betResult.entryPrice.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-400">
                    <span className="text-white font-mono">Exit Price:</span>
                    <span className="text-white font-mono font-bold">${betResult.exitPrice.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-400">
                    <span className="text-white font-mono">Amount:</span>
                    <span className="text-white font-mono font-bold">{betResult.amount.toFixed(4)} ETH</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-400">
                    <span className="text-white font-mono">Payout:</span>
                    <span className={`font-mono font-bold ${betResult.result === 'win' ? 'text-green-400' : betResult.result === 'refund' ? 'text-yellow-400' : 'text-gray-400'}`}>
                      {betResult.payout.toFixed(4)} ETH
                    </span>
                  </div>
                  {/* Points Earned */}
                  <div className="flex justify-between py-1">
                    <span className="text-yellow-400 font-mono">Points Earned:</span>
                    <span className="text-yellow-400 font-mono font-bold">
                      {betResult.pointsEarned ? betResult.pointsEarned.toFixed(4) : '0.0000'} $Kai
                    </span>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={closeResultPopup}
                  className="w-full bg-red-600 border-4 border-white text-white font-bold text-xl py-3 hover:bg-red-700 transition-colors"
                  style={{ 
                    fontFamily: 'monospace',
                    textShadow: '2px 2px 0px #000',
                    imageRendering: 'pixelated'
                  }}
                >
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Main component - directly render the game
export default function GamePage() {
  return <GamePageClient />;
}
