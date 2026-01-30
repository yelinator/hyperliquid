/*
  Auto-Resolver Bot (Sepolia)
  - Watches current/previous round
  - Computes winning side from price
  - Calls resolveRound(owner-only)
*/

const { ethers } = require('ethers');
// Load env from config.env if present; fallback to .env
try {
  require('dotenv').config({ path: 'config.env' });
} catch {}
require('dotenv').config();

const ABI = [
  "function resolveRound(uint256 roundId, uint256 timeframe) external",
  "function getRound(uint256 roundId) view returns (tuple(uint256 id,uint256 startTime,uint256 endTime,uint256 totalBets,uint256 upBets,uint256 downBets,bool resolved,bool suspended,bool startRecorded,bool winningPrediction,int256 startPriceRaw,int256 startExpo,uint256 startTimestamp,int256 endPriceRaw,int256 endExpo,uint256 endTimestamp,uint256 totalPayout,uint256 commissionAmount))",
  "function getRoundPlayers(uint256 roundId) view returns (address[])",
  "function getBet(uint256 roundId, address player) view returns (tuple(address player,uint256 roundId,bool prediction,uint256 amount,bool claimed))",
  "function comparePrices(int256 startPrice, int256 startExpo, int256 endPrice, int256 endExpo) external pure returns (bool)",
  "function getStalenessThreshold(uint256 timeframe) public pure returns (uint256)"
];

const RPC_URL = process.env.RPC_URL; // e.g. https://sepolia.infura.io/v3/...
const PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY; // owner key
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS; // KairosPredictionGame

if (!RPC_URL || !PRIVATE_KEY || !CONTRACT_ADDRESS) {
  console.error('Missing env: RPC_URL, OWNER_PRIVATE_KEY, CONTRACT_ADDRESS');
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

// naive price fetcher (replace with your production endpoint)
async function fetchPrice(symbol) {
  // Expect a local dev endpoint or fallback to no-change
  try {
    const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
    const json = await res.json();
    return parseFloat(json.price);
  } catch (e) {
    console.error('Price fetch failed, symbol:', symbol, e.message);
    return null;
  }
}

function calcRoundIdFromNow() {
  const now = Math.floor(Date.now() / 1000);
  const dur = 60;
  return Math.floor(now / dur) * dur;
}

function calcWinning(entry, exit, threshold = 0.001) {
  const diff = exit - entry;
  if (Math.abs(diff) < threshold) return null; // refund case -> treat as no-winner
  return diff > 0; // true=UP, false=DOWN
}

// The KairosPredictionGame contract automatically determines the winner based on price movement
// This function is no longer needed

async function resolveLoop() {
  try {
    const roundId = calcRoundIdFromNow() - 60; // resolve previous minute
    const round = await contract.getRound(roundId);
    if (round.id === 0n) return; // not created
    if (round.resolved) return; // already resolved

    // get entry approximation: use up vs down skew (or cache real entry elsewhere)
    // here we just compute winner using live price movement from entry snapshot idea
    const entry = Number(round.upBets + round.downBets) > 0 ? Number(round.upBets + round.downBets) : null;
    // better: store entry in an off-chain cache; for demo we fetch two close timestamps
    const pre = await fetchPrice('ETHUSDT');
    await new Promise(r=>setTimeout(r, 1500));
    const post = await fetchPrice('ETHUSDT');
    if (pre == null || post == null) return;
    const winningPrediction = calcWinning(pre, post);
    // For KairosPredictionGame, we don't need to handle the no-winner case explicitly
    // The contract will automatically handle this based on price movement

    // The KairosPredictionGame contract automatically determines the winner based on price movement
    // We just need to call resolveRound with the roundId and timeframe
    const timeframe = 60; // 1 minute rounds
    const tx = await contract.resolveRound(roundId, timeframe);
    await tx.wait();
    console.log('Resolved round', roundId, 'timeframe', timeframe, tx.hash);
  } catch (e) {
    console.error('resolveLoop error:', e.message);
  }
}

async function main() {
  console.log('Auto-resolver started. Contract:', CONTRACT_ADDRESS);
  // run every 30s
  await resolveLoop();
  setInterval(resolveLoop, 30000);
}

main();


