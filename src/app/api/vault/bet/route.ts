import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { prisma } from '../../../../lib/prisma';

const VAULT_ABI = [
  'function owner() view returns (address)',
  'function withdraw(address payable to, uint256 amount) external',
  'function getBalance() view returns (uint256)'
];

const VAULT_ADDRESS = process.env.NEXT_PUBLIC_VAULT_ADDRESS;
const RPC_URL = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
const PRIVATE_KEY = process.env.SERVER_VAULT_OWNER_KEY || process.env.RESOLVER_PRIVATE_KEY;

export async function POST(req: NextRequest) {
  try {
    // Better error handling for JSON parsing
    let requestData;
    try {
      requestData = await req.json();
    } catch (jsonError) {
      console.error('JSON parsing error:', jsonError);
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    
    const { address, amount, side, roundId, timeframe } = requestData;

    if (!address || !amount || !side || !roundId || !timeframe) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    if (!VAULT_ADDRESS || !PRIVATE_KEY) {
      return NextResponse.json({ error: 'Vault not configured' }, { status: 500 });
    }

    const amountWei = BigInt(Math.floor(Number(amount) * 1e18));
    const addr = String(address).toLowerCase();

    // 1. Check player has sufficient off-chain balance
    const result = await prisma.$transaction(async (tx) => {
      let player = await tx.player.findUnique({ where: { address: addr } });
      if (!player) {
        // Create player and balance record
        player = await tx.player.create({ data: { address: addr } });
        await tx.balance.create({ 
          data: { 
            playerId: player.id,
            available: BigInt(0),
            locked: BigInt(0),
            points: BigInt(0)
          } 
        });
      }

      const bal = await tx.balance.findUnique({ where: { playerId: player.id } });
      if (!bal) {
        throw new Error('Player balance not found');
      }
      
      // Check if player has sufficient available balance
      if (bal.available < amountWei) {
        const availableEth = Number(bal.available) / 1e18;
        const requiredEth = Number(amountWei) / 1e18;
        throw new Error(`Insufficient balance. Available: ${availableEth.toFixed(6)} ETH, Required: ${requiredEth.toFixed(6)} ETH`);
      }

      // 🚨 CRITICAL: Check if player already has a bet in this round
      const existingBet = await tx.bet.findFirst({
        where: {
          playerId: player.id,
          roundId: Number(roundId),
          status: { in: ['pending', 'won', 'lost'] } // Any active bet in this round
        }
      });

      if (existingBet) {
        throw new Error(`You already have a bet in round ${roundId}. Only one bet per round is allowed.`);
      }

      // 🚨 CRITICAL: Check if round has already ended
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const roundStartTime = Number(roundId);
      const roundEndTime = roundStartTime + Number(timeframe);
      
      if (currentTimestamp >= roundEndTime) {
        throw new Error(`Round ${roundId} has already ended. Please wait for the next round.`);
      }

      // 🚨 CRITICAL: Check if round is too far in the future (prevent future round betting)
      if (roundStartTime > currentTimestamp + 60) { // 60 second buffer
        throw new Error(`Invalid round timing. Round ${roundId} starts too far in the future.`);
      }

      // 2. Calculate points using tiered system
      const betAmountEth = Number(amountWei) / 1e18;
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
      
      const pointsEarned = (amountWei * BigInt(pointsMultiplier)) / BigInt(100);
      
             // 3. Lock the bet amount and award points in off-chain database
             await tx.balance.update({
               where: { playerId: player.id },
               data: { 
                 available: bal.available - amountWei, 
                 locked: bal.locked + amountWei,
                 points: bal.points + pointsEarned // Award $Kai points (re-enabled)
               },
             });

      // 4. Create round if it doesn't exist
      const roundStart = new Date(Math.floor(Number(roundId)) * 1000);
      const roundEnd = new Date(roundStart.getTime() + Number(timeframe) * 1000);
      await tx.round.upsert({
        where: { id: Number(roundId) },
        create: { id: Number(roundId), timeframe: Number(timeframe), startAt: roundStart, endAt: roundEnd },
        update: {},
      });

      // 5. Create bet record
      const bet = await tx.bet.create({
        data: {
          playerId: player.id,
          roundId: Number(roundId),
          amount: amountWei,
          side: side === true || side === 'up' ? 'up' : 'down',
        },
      });

      await tx.transfer.create({
        data: { playerId: player.id, type: 'bet_lock', amount: amountWei, meta: { roundId } },
      });

      return { betId: bet.id, playerId: player.id };
    });

    // 6. Bet funds stay in vault (NO ETH movement)
    // The vault already contains the player's deposited funds
    // We just lock the bet amount in the database - funds remain in vault
    
           // Calculate points using tiered system for console logging
           const betAmountEth = Number(amount);
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
           
           const pointsEarned = (BigInt(Math.floor(Number(amount) * 1e18)) * BigInt(pointsMultiplier)) / BigInt(100);
           console.log(`💰 Bet placed: ${amount} ETH locked in vault`);
           console.log(`🎯 Points earned: ${Number(pointsEarned) / 1e18} $Kai (${pointsMultiplier}% tier)`);
           console.log(`📊 Vault balance unchanged - funds stay in vault until resolution`);

    return NextResponse.json({ 
      success: true, 
      betId: result.betId,
      txHash: 'vault-locked',
      message: 'Bet placed successfully - funds locked in vault'
    });

  } catch (error: any) {
    console.error('Vault bet error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
