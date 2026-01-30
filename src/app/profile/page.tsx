"use client";

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useChainId } from 'wagmi';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { usePredictionGameContract } from '../utils/evmContract';
import { ConnectButton } from '@rainbow-me/rainbowkit';

interface PlayerProfile {
  balance: string;
  points: string;
  gamesPlayed: number;
  gamesWon: number;
  totalWagered: string;
  totalPayout: string;
}

interface BetHistory {
  timestamp: number;
  prediction: string;
  amount: string;
  result: string;
  entryPrice: number;
  exitPrice?: number;
  token: string;
}

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const router = useRouter();
  const { getPlayerProfile, formatEther } = usePredictionGameContract();
  
  // Prevent hydration mismatches by rendering only after mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [betHistory, setBetHistory] = useState<BetHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected && address) {
      // Quick fail if wrong network to avoid hanging UI
      if (chainId && chainId !== 11155111) {
        setError('Please switch network to Sepolia (chainId 11155111)');
        setLoading(false);
        return;
      }
      fetchProfileData();
    } else {
      setLoading(false);
    }
  }, [isConnected, address, chainId]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch player profile from off-chain API with real statistics
      const { offchainGetProfile } = await import('../utils/offchainClient');
      const oc = await offchainGetProfile(address!);
      const balEth = Number(BigInt(oc?.balance?.available ?? '0')) / 1e18;
      const pointsEth = Number(BigInt(oc?.balance?.points ?? '0')) / 1e18;
      const totalWageredEth = Number(BigInt(oc?.stats?.totalWagered ?? '0')) / 1e18;
      const totalPayoutEth = Number(BigInt(oc?.stats?.totalPayout ?? '0')) / 1e18;
      
      const formattedProfile: PlayerProfile = {
        balance: balEth.toFixed(6),
        points: pointsEth.toFixed(6),
        gamesPlayed: oc?.stats?.gamesPlayed ?? 0,
        gamesWon: oc?.stats?.gamesWon ?? 0,
        totalWagered: totalWageredEth.toFixed(6),
        totalPayout: totalPayoutEth.toFixed(6),
      };
      setProfile(formattedProfile);

      // Fetch bet history from localStorage
      if (typeof window !== 'undefined') {
        const historyKey = `bettingHistory_${address}`;
        const existingHistory = localStorage.getItem(historyKey);
        if (existingHistory) {
          const history = JSON.parse(existingHistory);
          // Normalize and defend against missing fields
          const normalized = Array.isArray(history) ? history.map((h: any) => ({
            timestamp: typeof h.timestamp === 'number' ? h.timestamp : Date.now(),
            prediction: typeof h.prediction === 'string' ? h.prediction : 'up',
            amount: typeof h.amount === 'string' ? h.amount : String(h.amount ?? '0'),
            result: typeof h.result === 'string' ? h.result : 'pending',
            entryPrice: typeof h.entryPrice === 'number' ? h.entryPrice : 0,
            exitPrice: typeof h.exitPrice === 'number' ? h.exitPrice : undefined,
            token: typeof h.token === 'string' ? h.token : 'ETH'
          })) : [];
          setBetHistory(normalized.reverse()); // Show most recent first
        }
      }
    } catch (err) {
      console.error('Error fetching profile data:', err);
      const msg = (err as Error)?.message === 'timeout' 
        ? 'Profile request timed out. Check network and try again.' 
        : 'Failed to load profile data';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const getWinRate = () => {
    if (!profile || profile.gamesPlayed === 0) return 0;
    return ((profile.gamesWon / profile.gamesPlayed) * 100).toFixed(1);
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case 'win': return 'text-green-400';
      case 'lose': return 'text-red-400';
      case 'refund': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'win': return '✅';
      case 'lose': return '❌';
      case 'refund': return '🔄';
      default: return '⏳';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Live refresh on on-chain events so profile updates automatically after wins/deposits
  useEffect(() => {
    if (!mounted || !isConnected || !address) return;
    const abi = [
      "event PlayerStatsUpdated(address indexed player, uint256 gamesPlayed, uint256 gamesWon, uint256 totalWagered, uint256 totalPayout)",
      "event BalanceUpdated(address indexed player, int256 delta, uint256 newBalance)",
    ];
    const CONTRACT_ADDRESS = "0x0F78Ac5c6Ce0973810e0A66a87bbb116Cb88eF59";

    const rpcUrl = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_SEPOLIA_RPC_URL) || 'https://ethereum-sepolia-rpc.publicnode.com';
    let contract: ethers.Contract | null = null;
    let poll: any;
    let active = true;

    const setup = async () => {
      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        if (!active) return;
        contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);

        const onStats = (player: string) => {
          if (player && address && player.toLowerCase() === address.toLowerCase()) {
            fetchProfileData();
          }
        };
        const onBalance = (player: string) => {
          if (player && address && player.toLowerCase() === address.toLowerCase()) {
            fetchProfileData();
          }
        };

        contract.on('PlayerStatsUpdated', onStats);
        contract.on('BalanceUpdated', onBalance);
        poll = setInterval(fetchProfileData, 12000);
      } catch {
        // ignore runtime setup errors
      }
    };

    setup();

    return () => {
      active = false;
      try {
        contract?.removeAllListeners?.('PlayerStatsUpdated');
        contract?.removeAllListeners?.('BalanceUpdated');
      } catch {}
      if (poll) clearInterval(poll);
    };
  }, [mounted, isConnected, address]);

  // Safety timeout to avoid infinite loading if something hangs
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => {
      if (loading) {
        setError('Loading took too long. Please retry.');
        setLoading(false);
      }
    }, 7000);
    return () => clearTimeout(t);
  }, [loading]);

  if (!mounted) {
    // Render nothing until client has mounted to avoid SSR/CSR divergence
    return null;
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen pixel-bg flex items-center justify-center">
        <div className="pixel-card p-8 text-center">
          <h1 className="pixel-text-large text-2xl font-bold text-white mb-4">PROFILE</h1>
          <p className="pixel-text text-gray-400 mb-6">Please connect your wallet to view your profile</p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen pixel-bg flex items-center justify-center">
        <div className="pixel-card p-8 text-center">
          <div className="pixel-dot w-12 h-12 mx-auto mb-4 animate-pulse"></div>
          <p className="pixel-text text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pixel-bg flex items-center justify-center">
        <div className="pixel-card p-8 text-center">
          <h1 className="pixel-text-large text-2xl font-bold text-white mb-4">ERROR</h1>
          <p className="pixel-text text-red-400 mb-6">{error}</p>
          <button
            onClick={fetchProfileData}
            className="pixel-button pixel-button--red"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Enhanced pixel/retro utility classes
  const pixelCard = "pixel-card pixel-card--soft p-6";
  const pixelHeader = "pixel-text-large text-3xl font-bold text-white tracking-widest";
  const pixelButton = "pixel-button pixel-button--purple";
  const pixelTableHead = "pixel-text text-left text-gray-300 py-3 px-4 text-xs tracking-widest";
  const pixelTableCell = "pixel-text py-3 px-4 text-white text-sm";
  const pixelLabel = "pixel-text text-gray-400 text-xs tracking-widest mb-2";
  const pixelValue = "pixel-text-large text-2xl font-bold text-white";
  const pixelValueGreen = "pixel-text-large text-2xl font-bold text-green-400";
  const pixelAddress = "pixel-text text-white break-all";

  return (
    <div className="min-h-screen pixel-bg" style={{ imageRendering: 'pixelated' }}>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className={pixelHeader}>PLAYER PROFILE</h1>
                 <button 
                   onClick={() => router.push('/game')} 
                   onMouseEnter={() => router.prefetch('/game')}
                   className={pixelButton}
                 >
                   Back to Game
                 </button>
        </div>

        {profile && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className={pixelCard}>
              <div className={pixelLabel}>DEPOSIT BALANCE</div>
              <div className={pixelValue}>{profile.balance} ETH</div>
            </div>
            <div className={pixelCard}>
              <div className={pixelLabel}>$KAI POINTS</div>
              <div className="pixel-text-large text-2xl font-bold text-yellow-400">{profile.points}</div>
            </div>
            <div className={pixelCard}>
              <div className={pixelLabel}>GAMES PLAYED</div>
              <div className={pixelValue}>{profile.gamesPlayed}</div>
            </div>
            <div className={pixelCard}>
              <div className={pixelLabel}>GAMES WON</div>
              <div className={pixelValueGreen}>{profile.gamesWon}</div>
            </div>
            <div className={pixelCard}>
              <div className={pixelLabel}>WIN RATE</div>
              <div className={pixelValue}>{getWinRate()}%</div>
            </div>
          </div>
        )}

        {profile && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className={pixelCard}>
              <div className={pixelLabel}>TOTAL WAGERED</div>
              <div className={pixelValue}>{profile.totalWagered} ETH</div>
            </div>
            <div className={pixelCard}>
              <div className={pixelLabel}>TOTAL PAYOUT</div>
              <div className={pixelValueGreen}>{profile.totalPayout} ETH</div>
            </div>
          </div>
        )}

        <div className={`${pixelCard} mb-8`}>
          <div className={pixelLabel}>WALLET ADDRESS</div>
          <div className={pixelAddress}>{address}</div>
        </div>

        <div className={pixelCard}>
          <h2 className="pixel-text-large text-lg font-bold text-white mb-6 tracking-widest">BET HISTORY</h2>
          {betHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-400 pixel-text">No betting history found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full pixel-border">
                <thead>
                  <tr className="border-b-2 border-gray-700 pixel-bg">
                    <th className={pixelTableHead}>DATE</th>
                    <th className={pixelTableHead}>TOKEN</th>
                    <th className={pixelTableHead}>PREDICTION</th>
                    <th className={pixelTableHead}>AMOUNT</th>
                    <th className={pixelTableHead}>ENTRY PRICE</th>
                    <th className={pixelTableHead}>EXIT PRICE</th>
                    <th className={pixelTableHead}>RESULT</th>
                  </tr>
                </thead>
                <tbody>
                  {betHistory.map((bet, index) => (
                    <tr key={index} className="border-b border-gray-800 hover:bg-gray-800/50 pixel-bg">
                      <td className={pixelTableCell}>{formatDate(bet.timestamp)}</td>
                      <td className={pixelTableCell}>{bet.token}</td>
                      <td className={`${pixelTableCell} capitalize`}>{bet.prediction}</td>
                      <td className={pixelTableCell}>{bet.amount} ETH</td>
                      <td className={pixelTableCell}>${typeof bet.entryPrice === 'number' ? bet.entryPrice.toFixed(6) : '0.000000'}</td>
                      <td className={pixelTableCell}>{bet.exitPrice ? `$${bet.exitPrice.toFixed(6)}` : '-'}</td>
                      <td className={pixelTableCell}>
                        <span className={`flex items-center gap-2 ${getResultColor(bet.result)} pixel-text`}>
                          <span>{getResultIcon(bet.result)}</span>
                          <span className="capitalize">{bet.result}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
