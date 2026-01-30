import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

// Lightweight profile endpoint optimized for navigation latency
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address');
  if (!address) return NextResponse.json({ error: 'Missing address' }, { status: 400 });
  const addr = address.toLowerCase();

  // 1) Get player id and balances only (no heavy includes)
  const player = await prisma.player.findUnique({
    where: { address: addr },
    select: {
      id: true,
      address: true,
      createdAt: true,
      balances: {
        select: { available: true, locked: true, points: true }
      }
    }
  });

  if (!player) {
    return NextResponse.json({
      player: null,
      balance: { available: '0', locked: '0' },
      stats: {
        gamesPlayed: 0,
        gamesWon: 0,
        totalWagered: '0',
        totalPayout: '0',
        winRate: 0
      }
    });
  }

  // 2) Compute stats via targeted queries (avoid loading all bets/transfers)
  const [resolvedCounts, wonCounts, totalWageredAgg, totalPayoutAgg] = await Promise.all([
    prisma.bet.count({ where: { playerId: player.id, status: { in: ['won', 'lost'] } } }),
    prisma.bet.count({ where: { playerId: player.id, status: 'won' } }),
    prisma.bet.aggregate({
      where: { playerId: player.id },
      _sum: { amount: true }
    }),
    prisma.transfer.aggregate({
      where: { playerId: player.id, type: 'payout' },
      _sum: { amount: true }
    })
  ]);

  const gamesPlayed = resolvedCounts;
  const gamesWon = wonCounts;
  const totalWagered = totalWageredAgg._sum.amount ?? BigInt(0);
  const totalPayout = totalPayoutAgg._sum.amount ?? BigInt(0);
  const winRate = gamesPlayed > 0 ? Math.round(((gamesWon / gamesPlayed) * 100) * 100) / 100 : 0;

  return NextResponse.json({
    player: {
      id: player.id,
      address: player.address,
      createdAt: player.createdAt
    },
    balance: {
      available: (player.balances?.available ?? BigInt(0)).toString(),
      locked: (player.balances?.locked ?? BigInt(0)).toString(),
      points: (player.balances?.points ?? BigInt(0)).toString()
    },
    stats: {
      gamesPlayed,
      gamesWon,
      totalWagered: totalWagered.toString(),
      totalPayout: totalPayout.toString(),
      winRate
    }
  });
}


