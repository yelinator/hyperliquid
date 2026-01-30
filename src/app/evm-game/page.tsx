"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useBalance, useAccount, useConnect, useDisconnect } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { EVMWalletButton } from "../components/EVMWalletButton";
import { fetchCryptoPrices, fetchPriceHistory, fetchHyperliquidOraclePrice, normalizeHyperliquidPrice, extractHyperliquidPriceData } from '../utils/hyperliquidPrice';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import CandlestickChart from "../components/CandlestickChart";
import { useRouter } from "next/navigation";
import DebugInfo from "../components/DebugInfo";
import { debugContractCall, debugTransaction } from './debug-utils';
import { useEnhancedWalletConnection } from "../hooks/useEnhancedWalletConnection";
import { testContract } from './test-contract';
import { verifyContractPayouts } from './contract-verification';

// KairosPredictionGame contract ABI
const KAIROS_CONTRACT_ABI = [
  "function placeBet(uint256 roundId, bool prediction, uint256 timeframe) payable public",
  "function resolveRound(uint256 roundId, uint256 timeframe) external",
  "function getRound(uint256 roundId) public view returns (tuple(uint256 id, uint256 startTime, uint256 endTime, uint256 totalBets, uint256 upBets, uint256 downBets, bool resolved, bool suspended, bool startRecorded, bool winningPrediction, int256 startPriceRaw, int256 startExpo, uint256 startTimestamp, int256 endPriceRaw, int256 endExpo, uint256 endTimestamp, uint256 totalPayout, uint256 commissionAmount))",
  "function getBet(uint256 roundId, address player) public view returns (tuple(address player, uint256 roundId, bool prediction, uint256 amount, bool claimed))",
  "function getRoundPlayers(uint256 roundId) public view returns (address[])",
  "function getHouseWalletBalance() external view returns (uint256)",
  "function owner() public view returns (address)",
  "function comparePrices(int256 startPrice, int256 startExpo, int256 endPrice, int256 endExpo) external pure returns (bool)",
  "function getStalenessThreshold(uint256 timeframe) public pure returns (uint256)"
];

// Contract address (EscrowPredictionGame contract)
const KAIROS_CONTRACT_ADDRESS = "0x0F78Ac5c6Ce0973810e0A66a87bbb116Cb88eF59";

// Add this helper function to interact with the Hyperliquid contract
const getContract = (provider: ethers.Provider | ethers.Signer) => {
  return new ethers.Contract(KAIROS_CONTRACT_ADDRESS, KAIROS_CONTRACT_ABI, provider);
};

// Choose a stable EVM provider from multiple injected wallets (prefer MetaMask)
const selectEthereumProvider = (): any | null => {
  if (typeof window === 'undefined') return null;
  const anyWindow: any = window as any;
  const eth = anyWindow.ethereum;
  if (!eth) return null;
  const providers = eth.providers || [];
  if (Array.isArray(providers) && providers.length > 0) {
    const metamask = providers.find((p: any) => p && p.isMetaMask);
    if (metamask) return metamask;
    // fallback to first EVM-capable provider (avoid non-EVM if present)
    const evm = providers.find((p: any) => p && (p.request || p.send));
    if (evm) return evm;
  }
  return eth;
};

// Add this helper function to fetch player's bet history from the blockchain
const fetchPlayerBetHistory = async (playerAddress: string) => {
  // In a real implementation, this would fetch actual data from the Hyperliquid contract
  // For now, we'll use localStorage as a temporary solution
  // until we can implement the full on-chain integration
  
  try {
    // This is where we would query the contract for the player's bets
    // For now, we'll use localStorage as a temporary solution
    
    const storedHistory = localStorage.getItem(`betHistory_${playerAddress}`);
    if (storedHistory) {
      const history = JSON.parse(storedHistory);
      console.log("Loaded bet history for player:", playerAddress, history);
      // Ensure all items have the roundId property for backward compatibility
      return history.map((item: any) => ({
        ...item,
        roundId: item.roundId || "0" // Default to "0" if roundId is missing
      }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching bet history:", error);
    return [];
  }
};

// Add this helper function to store bet data
const storeBetData = async (playerAddress: string, betData: any) => {
  // In a real implementation, this would store data on the Hyperliquid blockchain
  // For now, we'll use localStorage as a temporary solution
  
  try {
    const storedHistory = localStorage.getItem(`betHistory_${playerAddress}`);
    const history = storedHistory ? JSON.parse(storedHistory) : [];
    
    // Add the new bet to the history
    const updatedHistory = [betData, ...history].slice(0, 20); // Keep only last 20 bets
    
    localStorage.setItem(`betHistory_${playerAddress}`, JSON.stringify(updatedHistory));
    return updatedHistory;
  } catch (error) {
    console.error("Error storing bet data:", error);
    return [];
  }
};

export default function EVMGamePage() {
  const router = useRouter();
  const { refetchEthBalance } = useEnhancedWalletConnection();
  const [account, setAccount] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [isClient, setIsClient] = useState(false);
  
  // Only use wagmi hooks on the client side
  const { data: walletBalanceData, refetch: refetchWalletBalance } = isClient && account 
    ? useBalance({
        address: account as `0x${string}` | undefined,
      })
    : { data: undefined, refetch: async () => {} };
    
  // Set isClient to true only on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const [prediction, setPrediction] = useState<"up" | "down" | null>(null);
  const [amount, setAmount] = useState<string>("");
  const [token, setToken] = useState<string>("ETH");
  const [timeframe, setTimeframe] = useState<string>("1m"); // Only 1m timeframe
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [upPool, setUpPool] = useState<number>(125.5);
  const [downPool, setDownPool] = useState<number>(89.3);
  const [prices, setPrices] = useState<{ ethereum: number | null; hype: number | null }>({ ethereum: null, hype: null });
  const [priceHistory, setPriceHistory] = useState<{ ethereum: any[]; hype: any[] }>({ ethereum: [], hype: [] });
  const [loading, setLoading] = useState<boolean>(true);
  const [chartTimeframe, setChartTimeframe] = useState<number>(1); // 1 day default
  const [activeChart, setActiveChart] = useState<'ethereum' | 'hype'>('ethereum');
  const [isBettingLocked, setIsBettingLocked] = useState<boolean>(false);
  const [showResultPopup, setShowResultPopup] = useState<boolean>(false);
  const [betResult, setBetResult] = useState<{
    entryPrice: number;
    exitPrice: number;
    result: "win" | "lose" | "refund";
    amount: number;
    payout: number;
  } | null>(null);
  
  // Initialize round start time from localStorage or current time
  const [roundStartTime, setRoundStartTime] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const storedStartTime = localStorage.getItem('roundStartTime');
      if (storedStartTime) {
        const parsedTime = parseInt(storedStartTime, 10);
        // Check if the stored time is reasonable (not too old)
        if (Date.now() - parsedTime < 24 * 60 * 60 * 1000) { // Less than 24 hours old
          return parsedTime;
        }
      }
    }
    // Default to current time if no valid stored time
    const currentTime = Date.now();
    if (typeof window !== 'undefined') {
      localStorage.setItem('roundStartTime', currentTime.toString());
    }
    return currentTime;
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
    // Store oracle prices at start and end of bet
    startOraclePrice: number | null;
    startOracleExpo: number | null;
    endOraclePrice: number | null;
    endOracleExpo: number | null;
    // Add round ID for proper tracking
    roundId: string;
  }>>([]);

  // Initialize wallet connection
  useEffect(() => {
    const initWallet = async () => {
      console.log('Initializing wallet...');
      const injected = selectEthereumProvider();
      if (typeof window !== "undefined" && injected) {
        try {
          const browserProvider = new ethers.BrowserProvider(injected);
          setProvider(browserProvider);
          console.log('Browser provider created');
          
          // Listen for account changes
          const handleAccountsChanged = async (accounts: string[]) => {
            console.log('Accounts changed:', accounts);
            if (accounts.length > 0) {
              setAccount(accounts[0]);
              setConnected(true);
              
              // Initialize contract
              const signer = await browserProvider.getSigner();
              const contractInstance = getContract(signer);
              setContract(contractInstance);
            } else {
              setAccount(null);
              setConnected(false);
              setContract(null);
            }
          };
          
          // Listen for chain changes
          const handleChainChanged = () => {
            console.log('Chain changed, reloading...');
            window.location.reload();
          };
          
          injected.on && injected.on('accountsChanged', handleAccountsChanged);
          injected.on && injected.on('chainChanged', handleChainChanged);
          
          const accounts = await browserProvider.send("eth_accounts", []);
          console.log('Current accounts:', accounts);
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            setConnected(true);
            
            // Initialize contract
            const signer = await browserProvider.getSigner();
            const contractInstance = getContract(signer);
            setContract(contractInstance);
          }
          
          // Cleanup listeners on unmount
          return () => {
            if (injected && injected.removeListener) {
              injected.removeListener('accountsChanged', handleAccountsChanged);
              injected.removeListener('chainChanged', handleChainChanged);
            }
          };
        } catch (error) {
          console.error("Error initializing wallet:", error);
        }
      } else {
        console.log('No ethereum provider found');
      }
    };
    
    initWallet();
  }, []);

  // Function to manually refresh wallet balance
  const refreshWalletBalance = async () => {
    console.log('Refreshing wallet balance...');
    // Refresh on-chain deposit balance (internal) and fallback to wallet ETH
    try {
      const r = await refetchEthBalance();
      if (r?.status !== 'ok') {
        await refetchWalletBalance();
      }
    } catch {
      await refetchWalletBalance();
    }
  };

  // Load player's bet history when they connect their wallet
  useEffect(() => {
    console.log('Wallet connection state changed:', { connected, account, provider });
    if (connected && account) {
      const loadBetHistory = async () => {
        try {
          const history = await fetchPlayerBetHistory(account);
          console.log("Setting recent games from loaded history:", history);
          setRecentGames(history);
        } catch (error) {
          console.error("Error loading bet history:", error);
        }
      };
      
      loadBetHistory();
      
      // Fetch wallet balance when account changes
      const fetchBalance = async () => {
        console.log('Fetching wallet balance in interval...');
        refetchWalletBalance();
      };
      
      // Add a small delay to ensure provider is ready
      const timer = setTimeout(() => {
        fetchBalance();
      }, 500);
      
      // Set up interval to refresh balance
      const balanceInterval = setInterval(fetchBalance, 10000); // Refresh every 10 seconds
      
      return () => {
        clearTimeout(timer);
        clearInterval(balanceInterval);
      };
    }
  }, [connected, account, refetchWalletBalance]);

  // Redirect to home page if wallet is not connected
  useEffect(() => {
    if (typeof window !== 'undefined' && !connected) {
      router.push('/');
    }
  }, [connected, router]);

  // Reset bet confirmation when wallet disconnects
  useEffect(() => {
    if (!connected) {
      setShowBetConfirmation(false);
      setLastBet(null);
    }
  }, [connected]);
  
  // Reset bet confirmation on component mount
  useEffect(() => {
    setShowBetConfirmation(false);
    setLastBet(null);
  }, []);

  // Get cutoff time based on timeframe (when betting should be locked)
  const getCutoffTime = () => {
    // Only 1m timeframe now
    return 10;  // Lock at 10 seconds remaining for 1-minute game
  };

  // Get round duration based on timeframe
  const getRoundDuration = () => {
    // Only 1m timeframe now
    return 60;   // 60 seconds for 1-minute game
  };

  // Get current round ID based on timestamp (consistent with contract expectations)
  const getCurrentRoundId = () => {
    // Create a round ID based on the current minute
    // This ensures each minute has a unique round ID
    const now = new Date();
    return BigInt(Math.floor(now.getTime() / 60000)); // Round ID based on minutes since epoch
  };

  // Get the round ID for the previous minute (for resolution)
  const getPreviousRoundId = () => {
    // Get the round ID for the previous minute
    const now = new Date();
    return BigInt(Math.floor(now.getTime() / 60000) - 1); // Previous round ID
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
    
    // Set initial time left
    const initialTimeLeft = calculateTimeLeft();
    
    console.log("Initializing countdown timer:", {
      roundDuration,
      roundStartTime,
      initialTimeLeft,
      currentTime: Date.now()
    });
    
    setTimeLeft(initialTimeLeft);
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const cutoffTime = getCutoffTime();
        const roundDuration = getRoundDuration();
        
        // Recalculate time left based on current time to stay synchronized
        const now = Date.now();
        const elapsed = Math.floor((now - roundStartTime) / 1000);
        const timeRemaining = roundDuration - (elapsed % roundDuration);
        
        // Check if we've reached the cutoff time (when to lock betting)
        if (timeRemaining <= cutoffTime && !isBettingLocked) {
          console.log(`Locking bets - reached cutoff time: ${cutoffTime}, time remaining: ${timeRemaining}`);
          setIsBettingLocked(true);
        }
        
        // Unlock betting if we're in a new round and past the cutoff time
        if (timeRemaining > cutoffTime && isBettingLocked) {
          console.log(`Unlocking bets - new round started, time remaining: ${timeRemaining}`);
          setIsBettingLocked(false);
        }
        
        // Check if we've reached the end of the round (when to reset for next round and resolve bets)
        if (timeRemaining <= 1) {
          console.log("Resolving bets and resetting for next round - time reached 1 second");
          
          // Add a small delay to ensure we're actually at the end of the round
          setTimeout(() => {
            // Resolve the previous round on the blockchain
            resolvePreviousRound();
            
            // Reset for next round
            setIsBettingLocked(false);
            const newRoundStartTime = Date.now();
            setRoundStartTime(newRoundStartTime);
            // Persist the new round start time
            localStorage.setItem('roundStartTime', newRoundStartTime.toString());
          }, 2000); // Wait 2 seconds to ensure round has actually ended
          return roundDuration;
        }
        
        return timeRemaining;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeframe, roundStartTime]); // Depend on timeframe and roundStartTime only

  // Resolve the previous round on the blockchain
  const resolvePreviousRound = async () => {
    console.log("Starting round resolution process...");
    if (!contract || !account) {
      console.log("Contract or account not available for resolution");
      return;
    }
    
    try {
      // Get the previous round ID (the one that just ended)
      const roundId = getPreviousRoundId();
      const duration = getRoundDuration();
      
      console.log("Attempting to resolve previous round on contract...");
      console.log("  Round ID:", roundId.toString());
      console.log("  Duration:", duration);
      
      // First, check if the round exists and hasn't been resolved yet
      const roundInfo = await contract.getRound(roundId);
      console.log("Round info:", roundInfo);
      
      // If round doesn't exist or already resolved, skip
      if (roundInfo.id.toString() === "0" || roundInfo.resolved) {
        console.log("Round doesn't exist or already resolved, skipping...");
        return;
      }
      
      // Verify that the round has actually ended
      const currentTime = Math.floor(Date.now() / 1000);
      if (currentTime < roundInfo.endTime) {
        console.log("Round has not ended yet, skipping resolution...");
        console.log("  Current time:", currentTime);
        console.log("  Round end time:", roundInfo.endTime);
        return;
      }
      
      // Resolve the round on the contract
      // For EscrowPredictionGame, we need to determine the winner and winning prediction
      
      // First, determine the winning prediction (this would normally come from price oracle)
      // For now, we'll simulate this by comparing start and end prices
      // In a real implementation, this would come from actual Hyperliquid oracle data
      
      // Since we don't have access to price oracle in frontend, we'll need to determine winner differently
      // Let's find the first player who made the correct prediction
      
      // For simplicity in this fix, we'll assume UP wins (true)
      // In a real implementation, this should come from oracle data
      const winningPrediction = true; // Simulate UP movement
      
      // Find the winner (first player who made the winning prediction)
      let winnerAddress = ethers.ZeroAddress; // Default to zero address (no winner)
      
      try {
        const roundPlayers = await contract.getRoundPlayers(roundId);
        console.log("Round players:", roundPlayers);
        
        // Find the first player who made the winning prediction
        for (let i = 0; i < roundPlayers.length; i++) {
          const playerAddress = roundPlayers[i];
          const playerBet = await contract.getBet(roundId, playerAddress);
          console.log(`Player ${playerAddress} bet:`, playerBet);
          
          if (playerBet.prediction === winningPrediction && playerBet.amount > 0) {
            winnerAddress = playerAddress;
            break;
          }
        }
      } catch (error) {
        console.error("Error finding winner:", error);
      }
      
      console.log("Winner address:", winnerAddress);
      console.log("Winning prediction:", winningPrediction);
      
      // The KairosPredictionGame contract automatically determines the winner based on price movement
      // We just need to call resolveRound with the roundId and timeframe
      const timeframe = 60; // 1 minute rounds
      const tx = await debugContractCall(contract, 'resolveRound', [
        roundId,
        timeframe
      ]);
      
      await debugTransaction(tx);
      console.log("Round resolved successfully on contract!");
      
      // Add a small delay to ensure the blockchain state is updated
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Refresh the round information to see the results
      const updatedRoundInfo = await contract.getRound(roundId);
      console.log("Round info after resolution:", updatedRoundInfo);
      
      // If there was a winner, show a notification
      if (updatedRoundInfo.resolved && updatedRoundInfo.totalPayout > 0) {
        console.log("Round had a winner, checking if current player won...");
        // Check if the current user is the winner
        let isCurrentPlayerWinner = false;
        let playerPayout = 0;
        
        if (account) {
          const betInfo = await contract.getBet(roundId, account);
          console.log("Player bet info:", betInfo);
          console.log("Player address:", account);
          console.log("Winning prediction:", updatedRoundInfo.winningPrediction);
          console.log("Player prediction:", betInfo.prediction);
          
          // Check if the player made a bet and if their prediction matched the winning prediction
          if (betInfo.amount > 0 && betInfo.prediction === updatedRoundInfo.winningPrediction) {
            console.log("Player made correct prediction, checking if they were first...");
            // This player won! But we need to check if they were the FIRST to make this prediction
            // Let's get the list of players in this round to determine the order
            const roundPlayers = await contract.getRoundPlayers(roundId);
            console.log("Round players:", roundPlayers);
            
            // Find the first player who made the winning prediction
            let firstWinner: string | null = null;
            for (let i = 0; i < roundPlayers.length; i++) {
              const playerAddress = roundPlayers[i];
              const playerBet = await contract.getBet(roundId, playerAddress);
              console.log(`Player ${playerAddress} bet:`, playerBet);
              
              if (playerBet.prediction === updatedRoundInfo.winningPrediction && playerBet.amount > 0) {
                firstWinner = playerAddress;
                break;
              }
            }
            
            console.log("First winner:", firstWinner);
            
            // Check if the current user is the first winner
            if (firstWinner && firstWinner.toLowerCase() === account.toLowerCase()) {
              // This player won!
              console.log("Current player is the winner!");
              isCurrentPlayerWinner = true;
              playerPayout = parseFloat(ethers.formatEther(updatedRoundInfo.totalPayout));
              
              setBetResult({
                entryPrice: 0, // We don't have this info on-chain
                exitPrice: 0,  // We don't have this info on-chain
                result: "win",
                amount: parseFloat(ethers.formatEther(betInfo.amount)),
                payout: playerPayout
              });
              setShowResultPopup(true);
              
              // Refresh wallet balance
              refreshWalletBalance();
            } else {
              // This player participated but didn't win (either wrong prediction or not first)
              console.log("Current player is not the first winner");
              // Even if they're not the first winner, we should still mark their game as resolved
              console.log("Marking player's game as resolved (lost)");
            }
          } else if (betInfo.amount > 0) {
            // This player participated but didn't win (wrong prediction)
            console.log("Current player made a bet but with wrong prediction");
          } else {
            console.log("Current player did not participate in this round");
          }
        }
        
        // Update the recent games list based on whether the current player won or not
        console.log("Updating recent games with results...");
        setRecentGames(prev => prev.map(game => {
          // Only update games that belong to this round
          if (game.result === "pending" && game.roundId === roundId.toString()) {
            console.log(`Updating game ${game.roundId} result to ${isCurrentPlayerWinner ? "win" : "lose"}`);
            // If the current player is the winner, mark as win with payout, otherwise mark as lose
            return { 
              ...game, 
              result: isCurrentPlayerWinner ? "win" : "lose",
              exitPrice: game.entryPrice // For simplicity, using entry price as exit price
            };
          }
          return game;
        }));
      } else if (updatedRoundInfo.resolved) {
        console.log("Round resolved but no payout (no winners or other reason)");
        // Round resolved but no payout (no winners or other reason)
        // Update all pending games for this round as lost
        setRecentGames(prev => prev.map(game => {
          // Only update games that belong to this round
          if (game.result === "pending" && game.roundId === roundId.toString()) {
            console.log(`Updating game ${game.roundId} result to lose (no winner)`);
            return { 
              ...game, 
              result: "lose",
              exitPrice: game.entryPrice // For simplicity, using entry price as exit price
            };
          }
          return game;
        }));
      }
    } catch (error: any) {
      console.error("Error resolving round on contract:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        data: error.data
      });
      // Don't show alert for this since it might be normal (round already resolved, etc.)
    }
  };

  const handlePlaceBet = async () => {
    if (!connected) {
      alert("Please connect your wallet first");
      return;
    }
    
    if (!contract) {
      alert("Contract not initialized. Please refresh the page and try again.");
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
    
    if (isBettingLocked) {
      alert("Betting is currently locked. Please wait for the next round.");
      return;
    }
    
    // Get current price as entry price (oracle price at start of bet)
    const currentPrice = activeChart === 'ethereum' ? prices.ethereum : prices.hype;
    if (currentPrice === null) {
      alert("Unable to fetch current price. Please try again.");
      return;
    }
    
    // Use higher precision for price recording
    const preciseEntryPrice = Number(currentPrice.toFixed(6));
    setEntryPrice(preciseEntryPrice);
    
    // Get the duration for this timeframe
    const duration = getRoundDuration();
    
    // Get current round ID
    const roundId = getCurrentRoundId();
    
    console.log("Placing bet for round:", roundId.toString());
    
    // Extract Hyperliquid-style price data and normalize it
    // In a real implementation, this would come from actual Hyperliquid oracle data on-chain
    const hyperliquidPriceData = extractHyperliquidPriceData(currentPrice);
    
    console.log("Placing bet with current price data:");
    console.log("  Current price:", currentPrice);
    console.log("  Precise entry price:", preciseEntryPrice);
    console.log("  Extracted Hyperliquid price data:", hyperliquidPriceData);
    console.log("  Normalized start price:", normalizeHyperliquidPrice(hyperliquidPriceData.price, hyperliquidPriceData.expo));
    console.log("  Round ID:", roundId.toString());
    
    // Actually interact with the contract to place the bet:
    try {
      if (contract && provider) {
        // Convert amount to wei for ETH or smallest unit for other tokens
        const amountInWei = ethers.parseEther(amount);
        
        console.log("Attempting to place bet on contract...");
        console.log("  Round ID:", roundId.toString());
        console.log("  Prediction:", prediction);
        console.log("  Duration:", duration);
        console.log("  Amount (wei):", amountInWei.toString());
        
        // Place bet on the contract
        const tx = await debugContractCall(contract, 'placeBet', [
          roundId, // Dynamic round ID
          prediction === "up", // prediction (true for UP, false for DOWN)
          BigInt(duration), // timeframe in seconds
          { value: amountInWei } // Send ETH with the transaction
        ]);
        
        await debugTransaction(tx);
        console.log("Bet placed successfully on contract!");
        
        // Add to recent games with timing information and oracle prices
        const newGame = {
          amount,
          token,
          prediction,
          entryPrice: preciseEntryPrice, // Use the precise entry price
          exitPrice: 0,
          result: "pending" as const,
          timestamp: Date.now(),
          startTime: Date.now(),
          duration, // Store the duration for this specific bet
          startOraclePrice: hyperliquidPriceData.price, // Store raw Hyperliquid price (simulated on-chain data)
          startOracleExpo: hyperliquidPriceData.expo,   // Store Hyperliquid exponent (simulated on-chain data)
          endOraclePrice: null,                  // Will be set at resolution (from on-chain data)
          endOracleExpo: null,                   // Will be set at resolution (from on-chain data)
          roundId: roundId.toString()  // Store the round ID as string for proper tracking
        };
        
        console.log("Adding new game to recent games:", newGame);
        
        setRecentGames(prev => [newGame, ...prev].slice(0, 8)); // Keep only last 8 games
        
        // Store bet data persistently (in a real implementation, this would be on-chain)
        if (account) {
          console.log("Storing bet data for account:", account);
          storeBetData(account, newGame);
        }
        
        // Refresh wallet balance after successful bet
        refreshWalletBalance();
      }
    } catch (error: any) {
      console.error("Error placing bet on contract:", error);
      alert(`Failed to place bet on contract: ${error.message || "Unknown error"}. Please try again.`);
      return; // Exit early if contract call fails
    }
    
    // Store last bet info for confirmation display
    setLastBet({
      amount,
      token,
      prediction,
      entryPrice: preciseEntryPrice, // Use the precise entry price
      timeframe: "1m" // Always store as 1m since that's the only option now
    });
    setShowBetConfirmation(true);
    
    // Hide confirmation after 5 seconds
    setTimeout(() => {
      setShowBetConfirmation(false);
    }, 5000);
    
    // Reset form
    setPrediction(null);
    setAmount("");
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

  // Prepare chart data
  const chartData = priceHistory.ethereum.map((ethPoint, index) => {
    const hypePoint = priceHistory.hype[index];
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white">
      {/* Header */}
      <header className="flex justify-between items-center p-6">
        <div 
          className="header-text cursor-pointer"
          onClick={() => window.location.href = '/'}
        >
          Kairos
        </div>
        <div className="flex items-center space-x-4">
          {connected && account && (
            <div className="text-sm bg-black/30 px-3 py-1 rounded-lg">
              {account.substring(0, 6)}...{account.substring(account.length - 4)}
              {walletBalanceData?.formatted ? ` (${parseFloat(walletBalanceData.formatted).toFixed(4)} ${walletBalanceData.symbol})` : walletBalanceData?.value ? ` (${ethers.formatEther(walletBalanceData.value)} ${walletBalanceData.symbol})` : ' (Loading balance...)'}
            </div>
          )}
          <EVMWalletButton 
            onConnect={(account) => {
              setAccount(account);
              setConnected(true);
            }}
            onDisconnect={() => {
              setAccount(null);
              setConnected(false);
              setContract(null);
            }}
          />
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
                    <span className="font-medium">{lastBet.amount} {lastBet.token}</span>
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
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-2 neon-text">Kairos - Crypto Price Prediction Game</h1>
        <p className="text-gray-400 text-center mb-12">Predict cryptocurrency price movements and win crypto rewards</p>

        {!connected ? (
          <div className="glass-card p-12 rounded-2xl text-center">
            <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
            <p className="text-gray-300 mb-8">Connect your EVM wallet to start playing</p>
            <div className="glass-button px-8 py-4 text-lg rounded-xl font-bold mx-auto">
              <EVMWalletButton />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Prediction Form and Price Info */}
            <div className="space-y-8">
              {/* Live Price Display */}
              <div className="glass-card p-6 rounded-2xl">
                <h2 className="text-2xl font-bold mb-4">Live Crypto Prices</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-black/30">
                    <div className="text-gray-400">Ethereum (ETH)</div>
                    {loading ? (
                      <div className="text-xl font-bold animate-pulse">Loading...</div>
                    ) : (
                      <div className="text-xl font-bold neon-text">
                        ${prices.ethereum?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    )}
                  </div>
                  <div className="p-4 rounded-xl bg-black/30">
                    <div className="text-gray-400">HYPE Token</div>
                    {loading ? (
                      <div className="text-xl font-bold animate-pulse">Loading...</div>
                    ) : (
                      <div className="text-xl font-bold neon-text">
                        ${prices.hype?.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Prediction Form */}
              <div className="glass-card p-6 rounded-2xl">
                <h2 className="text-2xl font-bold mb-6">Place Your Prediction</h2>
                
                {/* Asset Selection Toggle */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">Select Asset</h3>
                  <div className="flex bg-black/30 rounded-xl p-1 mb-2">
                    <button
                      onClick={() => setToken("ETH")}
                      className={`flex-1 py-3 rounded-lg transition-all ${
                        token === "ETH"
                          ? "bg-purple-600 text-white font-bold"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      ETH
                    </button>
                    <button
                      onClick={() => setToken("HYPE")}
                      className={`flex-1 py-3 rounded-lg transition-all ${
                        token === "HYPE"
                          ? "bg-purple-600 text-white font-bold"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      HYPE
                    </button>
                  </div>
                  <div className="text-center text-sm text-gray-400">
                    Current Price: {
                      token === "ETH" 
                        ? (prices.ethereum ? `$${prices.ethereum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Loading...")
                        : (prices.hype ? `$${prices.hype.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}` : "Loading...")
                    }
                  </div>
                </div>
                
                {/* Timeframe Selection - Only 1 minute option now */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">Timeframe</h3>
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={() => setTimeframe("1m")}
                      className={`p-3 rounded-xl transition-all ${
                        timeframe === "1m"
                          ? "bg-purple-600 border border-purple-400"
                          : "bg-black/30 border border-purple-500/30 hover:bg-purple-900/50"
                      }`}
                    >
                      1 Min
                    </button>
                  </div>
                </div>
                
                {/* Prediction Selection */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">Your Prediction</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setPrediction("up")}
                      className={`p-6 rounded-xl transition-all flex flex-col items-center justify-center ${
                        prediction === "up"
                          ? "bg-green-600/30 border-2 border-green-500"
                          : "bg-black/30 border border-purple-500/30 hover:bg-green-900/20"
                      }`}
                    >
                      <span className="text-2xl mb-2">📈</span>
                      <span className="text-xl font-bold">UP</span>
                    </button>
                    
                    <button
                      onClick={() => setPrediction("down")}
                      className={`p-6 rounded-xl transition-all flex flex-col items-center justify-center ${
                        prediction === "down"
                          ? "bg-red-600/30 border-2 border-red-500"
                          : "bg-black/30 border border-purple-500/30 hover:bg-red-900/20"
                      }`}
                    >
                      <span className="text-2xl mb-2">📉</span>
                      <span className="text-xl font-bold">DOWN</span>
                    </button>
                  </div>
                </div>
                
                {/* Bet Amount */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">Bet Amount</h3>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="flex-1 bg-black/30 border border-purple-500/30 rounded-xl p-3"
                    />
                  </div>
                </div>
                
                {/* Place Bet Button */}
                <button
                  onClick={handlePlaceBet}
                  disabled={!prediction || !amount || isBettingLocked}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                    isBettingLocked 
                      ? "bg-gray-600 cursor-not-allowed" 
                      : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  }`}
                >
                  {isBettingLocked ? "Betting Locked" : "Place Bet"}
                </button>
              </div>
              
              {/* Recent Games */}
              <div className="glass-card p-6 rounded-2xl">
                <h2 className="text-2xl font-bold mb-4">Recent Games</h2>
                <div className="space-y-3">
                  {recentGames.length > 0 ? (
                    recentGames.map((game: any, index: number) => (
                      <div key={index} className="p-3 rounded-xl bg-black/20 border border-purple-500/20">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium">
                              {game.amount} {game.token} on {game.prediction.toUpperCase()}
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
                <DebugInfo recentGames={recentGames} />
              </div>
            </div>
            
            {/* Right Column - Game Info and Charts */}
            <div className="space-y-8">
              {/* Countdown Timer */}
              <div className="glass-card p-6 rounded-2xl text-center">
                <h2 className="text-2xl font-bold mb-2">Round Status</h2>
                <div className="text-4xl font-mono font-bold neon-text">{formatTime(timeLeft)}</div>
                <p className="text-gray-400 mt-2">
                  {isBettingLocked 
                    ? "Betting locked - Round resolving soon" 
                    : `Betting closes at ${getCutoffTimeDisplay()}`}
                </p>
                <div className="mt-4 w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full" 
                    style={{ 
                      width: `${((getRoundDuration() - timeLeft) / getRoundDuration()) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>
              
              {/* Candlestick Chart */}
              <div>
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
              
              {/* Pools */}
              <div className="glass-card p-6 rounded-2xl">
                <h2 className="text-2xl font-bold mb-4">Current Pools</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-black/30">
                    <div className="text-gray-400">UP Pool</div>
                    <div className="text-xl font-bold neon-text">{upPool.toFixed(2)} ETH</div>
                  </div>
                  <div className="p-4 rounded-xl bg-black/30">
                    <div className="text-gray-400">DOWN Pool</div>
                    <div className="text-xl font-bold neon-text">{downPool.toFixed(2)} ETH</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      
      {/* Result Popup */}
      {showResultPopup && betResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-card p-6 rounded-2xl max-w-md w-full mx-4">
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-4">
                {betResult.result === 'win' ? '🎉 You Won!' : betResult.result === 'lose' ? '😔 You Lost' : '🔄 Refunded'}
              </h3>
              
              <div className="space-y-3 text-sm mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-400">Entry Price:</span>
                  <span className="font-medium">${betResult.entryPrice.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Exit Price:</span>
                  <span className="font-medium">${betResult.exitPrice.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Amount:</span>
                  <span className="font-medium">{betResult.amount} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Payout:</span>
                  <span className={`font-bold ${betResult.result === 'win' ? 'text-green-400' : betResult.result === 'lose' ? 'text-red-400' : 'text-yellow-400'}`}>
                    {betResult.payout} ETH
                  </span>
                </div>
              </div>
              
              <button 
                onClick={closeResultPopup}
                className="glass-button px-6 py-2 rounded-lg font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Test Contract Button - Only shown in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 flex gap-2">
          <button 
            onClick={testContract}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded"
          >
            Test Contract
          </button>
          <button 
            onClick={verifyContractPayouts}
            className="bg-green-500 hover:bg-green-600 text-black font-bold py-2 px-4 rounded"
          >
            Verify Payouts
          </button>
        </div>
      )}
    </div>
  );
}

