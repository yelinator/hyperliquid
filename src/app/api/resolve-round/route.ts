import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x0F78Ac5c6Ce0973810e0A66a87bbb116Cb88eF59";
const PRIVATE_KEY = process.env.RESOLVER_PRIVATE_KEY; // House wallet private key for auto-resolution
const RPC_URL = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';

const CONTRACT_ABI = [
  "function resolveRoundOpen(uint256 roundId, bool winningPrediction) external",
  "function getRound(uint256 roundId) view returns (tuple(uint256 id, uint256 startTime, uint256 endTime, uint256 totalBets, uint256 upBets, uint256 downBets, bool resolved, bool winningPrediction, uint256 totalPayout, uint256 commissionAmount))",
];

/**
 * POST /api/resolve-round
 * Body: { roundId: number, winningPrediction: boolean }
 * 
 * This endpoint automatically resolves a round on behalf of players.
 * No user interaction needed - backend pays the gas fees.
 */
export async function POST(request: NextRequest) {
  try {
    const { roundId, winningPrediction } = await request.json();

    if (!roundId || typeof winningPrediction !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing roundId or winningPrediction' },
        { status: 400 }
      );
    }

    // Check if we have a resolver private key
    if (!PRIVATE_KEY) {
      console.log('⚠️ No RESOLVER_PRIVATE_KEY found. Resolution will be manual.');
      return NextResponse.json(
        { 
          error: 'Auto-resolution not configured', 
          message: 'Please set RESOLVER_PRIVATE_KEY in .env.local to enable automatic resolution',
          manual: true
        },
        { status: 503 }
      );
    }

    console.log(`🔄 Auto-resolving round ${roundId} with winning prediction: ${winningPrediction ? 'UP' : 'DOWN'}`);

    // Create provider and wallet
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

    // Check if round is already resolved
    const roundInfo = await contract.getRound(roundId);
    if (roundInfo.resolved) {
      console.log(`✅ Round ${roundId} already resolved`);
      return NextResponse.json({ 
        success: true, 
        alreadyResolved: true,
        txHash: null 
      });
    }

    // Check if round has ended
    const now = Math.floor(Date.now() / 1000);
    if (now < Number(roundInfo.endTime)) {
      return NextResponse.json(
        { 
          error: 'Round has not ended yet',
          endTime: Number(roundInfo.endTime),
          currentTime: now,
          timeRemaining: Number(roundInfo.endTime) - now
        },
        { status: 400 }
      );
    }

    // Resolve the round
    console.log(`📝 Calling resolveRoundOpen for round ${roundId}...`);
    const tx = await contract.resolveRoundOpen(roundId, winningPrediction);
    console.log(`⏳ Transaction sent: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`✅ Round ${roundId} resolved successfully in block ${receipt.blockNumber}`);

    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      roundId,
      winningPrediction
    });

  } catch (error: any) {
    console.error('❌ Error resolving round:', error);
    return NextResponse.json(
      { 
        error: 'Failed to resolve round', 
        message: error.message,
        details: error.reason || error.code
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/resolve-round?roundId=123
 * Check if a round needs resolution
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const roundId = searchParams.get('roundId');

    if (!roundId) {
      return NextResponse.json(
        { error: 'Missing roundId parameter' },
        { status: 400 }
      );
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

    const roundInfo = await contract.getRound(Number(roundId));
    const now = Math.floor(Date.now() / 1000);
    const hasEnded = now >= Number(roundInfo.endTime);

    return NextResponse.json({
      roundId: Number(roundId),
      resolved: roundInfo.resolved,
      endTime: Number(roundInfo.endTime),
      currentTime: now,
      hasEnded,
      needsResolution: hasEnded && !roundInfo.resolved,
      totalBets: ethers.formatEther(roundInfo.totalBets)
    });

  } catch (error: any) {
    console.error('Error checking round status:', error);
    return NextResponse.json(
      { error: 'Failed to check round status', message: error.message },
      { status: 500 }
    );
  }
}

