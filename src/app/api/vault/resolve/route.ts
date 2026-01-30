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
    const { roundId, winningSide } = await req.json();

    if (!roundId || !winningSide) {
      return NextResponse.json({ error: 'Missing roundId or winningSide' }, { status: 400 });
    }

    if (!VAULT_ADDRESS || !PRIVATE_KEY) {
      return NextResponse.json({ error: 'Vault not configured' }, { status: 500 });
    }

    // 1) Fetch round and short-circuit if already resolved
    const round = await prisma.round.findUnique({ where: { id: Number(roundId) } });
    if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    if (round.status === 'resolved') return NextResponse.json({ already: true });

    // 2) Fetch bets for the round
    const bets = await prisma.bet.findMany({ where: { roundId: Number(roundId) } });

    const credits: Array<{ playerId: number; delta: string; status: string; txHash?: string }> = [];

    // 3) Process each bet in its own small atomic transaction to avoid long-running tx timeouts
    for (const bet of bets) {
      // eslint-disable-next-line no-await-in-loop
      await prisma.$transaction(async (tx) => {
        const currentBalance = await tx.balance.findUnique({ where: { playerId: bet.playerId } });
        if (!currentBalance) return;

        const win = bet.side === winningSide;
        const lockedAfter = currentBalance.locked - bet.amount;
        let availableAfter = currentBalance.available;

        if (win) {
          // For winners: return stake + winnings (2x bet amount) minus 5% fee
          const gross = bet.amount * BigInt(2); // 2x bet amount (stake + winnings)
          const fee = (gross * BigInt(5)) / BigInt(100); // 5% fee
          const net = gross - fee; // Net payout after fee
          availableAfter = currentBalance.available + net;

          console.log(`🎯 Winner payout calculation:`);
          console.log(`  Bet amount: ${Number(bet.amount) / 1e18} ETH`);
          console.log(`  Gross (2x): ${Number(gross) / 1e18} ETH`);
          console.log(`  Fee (5%): ${Number(fee) / 1e18} ETH`);
          console.log(`  Net payout: ${Number(net) / 1e18} ETH`);
          console.log(`  Available before: ${Number(currentBalance.available) / 1e18} ETH`);
          console.log(`  Available after: ${Number(availableAfter) / 1e18} ETH`);

          await tx.bet.update({ where: { id: bet.id }, data: { status: 'won' } });
          await tx.transfer.create({ data: { playerId: bet.playerId, type: 'bet_release', amount: bet.amount, meta: { roundId } } });
          await tx.transfer.create({ data: { playerId: bet.playerId, type: 'payout', amount: net, meta: { roundId, fromVault: true } } });
          await tx.balance.update({ where: { playerId: bet.playerId }, data: { available: availableAfter, locked: lockedAfter } });

          credits.push({ playerId: bet.playerId, delta: (net).toString(), status: 'won', txHash: 'vault-payout' });
        } else {
          // For losers: just unlock the bet amount (no payout)
          availableAfter = currentBalance.available; // No change to available balance
          
          console.log(`❌ Loser: ${Number(bet.amount) / 1e18} ETH lost`);
          console.log(`  Available before: ${Number(currentBalance.available) / 1e18} ETH`);
          console.log(`  Available after: ${Number(availableAfter) / 1e18} ETH`);

          await tx.bet.update({ where: { id: bet.id }, data: { status: 'lost' } });
          await tx.transfer.create({ data: { playerId: bet.playerId, type: 'bet_release', amount: bet.amount * BigInt(-1), meta: { roundId } } });
          await tx.balance.update({ where: { playerId: bet.playerId }, data: { available: availableAfter, locked: lockedAfter } });

          credits.push({ playerId: bet.playerId, delta: (bet.amount * BigInt(-1)).toString(), status: 'lost' });
        }
      }, { timeout: 8000 });
    }

    // 4) Mark round as resolved
    await prisma.round.update({ where: { id: Number(roundId) }, data: { winningSide, status: 'resolved' } });

    const result = { resolved: true, credits };

    // 3. NO ETH MOVEMENT - All funds stay in vault
    // The vault already contains player deposits
    // Winners get credited in off-chain database only
    // 5% commission stays in vault as house profit
    // Vault balance should NOT decrease when players win
    
    console.log(`🎯 Round ${roundId} resolved - NO ETH movement needed`);
    console.log(`💰 All funds remain in vault (${VAULT_ADDRESS})`);
    console.log(`🏠 5% commission stays in vault as house profit`);
    console.log(`📊 Winners credited in off-chain database only`);

    console.log(`🎯 Round ${roundId} resolved with winning side: ${winningSide}`);
    console.log(`💰 Credits:`, result.credits);

    return NextResponse.json({ success: true, ...result });

  } catch (error: any) {
    console.error('Vault resolve error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
