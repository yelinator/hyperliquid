import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch (parseError: any) {
    console.error('[resolve] Error parsing request body:', parseError);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    console.log(`[resolve] start`, body);
    const { roundId, winningSide } = body as { roundId?: number | string; winningSide?: string };
    if (!roundId || !winningSide) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      // Ensure round exists by upserting from timing if bets exist
      let round = await tx.round.findUnique({ where: { id: Number(roundId) } });
      if (!round) {
        const betsForRound = await tx.bet.findMany({ where: { roundId: Number(roundId) } });
        if (betsForRound.length > 0) {
          // Infer timeframe from any bet record (default to 60s)
          const inferredTimeframe = 60;
          const start = new Date(Number(roundId) * 1000);
          const end = new Date(start.getTime() + inferredTimeframe * 1000);
          round = await tx.round.upsert({
            where: { id: Number(roundId) },
            create: { id: Number(roundId), timeframe: inferredTimeframe, startAt: start, endAt: end },
            update: {},
          });
        }
      }
      if (!round) {
        console.log(`Round ${roundId} not found in database`);
        return { error: 'Round not found', roundId: Number(roundId) };
      }
      if (!round) {
        console.log(`Round ${roundId} not found in database`);
        return { error: 'Round not found', roundId: Number(roundId) };
      }
      if (round.status === 'resolved') return { already: true };

      const bets = await tx.bet.findMany({ where: { roundId: Number(roundId) } });
      const credits: Array<{ playerId: number; delta: string; status: string }>=[];

      for (const bet of bets) {
        const win = bet.side === winningSide;
        const bal = await tx.balance.findUnique({ where: { playerId: bet.playerId } });
        if (!bal) continue;

        // release locked
        let lockedAfter = bal.locked - bet.amount;
        let availableAfter = bal.available;

        if (win) {
          const gross = bet.amount * BigInt(2);
          const fee = (gross * BigInt(5)) / BigInt(100);
          const net = gross - fee;
          availableAfter += net;
          
          console.log(`🎯 Winner payout calculation:`);
          console.log(`  Player ID: ${bet.playerId}`);
          console.log(`  Bet amount: ${Number(bet.amount) / 1e18} ETH`);
          console.log(`  Gross (2x): ${Number(gross) / 1e18} ETH`);
          console.log(`  Fee (5%): ${Number(fee) / 1e18} ETH`);
          console.log(`  Net payout: ${Number(net) / 1e18} ETH`);
          console.log(`  Available before: ${Number(bal.available) / 1e18} ETH`);
          console.log(`  Available after: ${Number(availableAfter) / 1e18} ETH`);
          
          await tx.bet.update({ where: { id: bet.id }, data: { status: 'won' } });
          await tx.transfer.create({ data: { playerId: bet.playerId, type: 'payout', amount: net, meta: { roundId } } });
          credits.push({ playerId: bet.playerId, delta: net.toString(), status: 'won' });
        } else {
          await tx.bet.update({ where: { id: bet.id }, data: { status: 'lost' } });
          await tx.transfer.create({ data: { playerId: bet.playerId, type: 'bet_release', amount: bet.amount * BigInt(-1), meta: { roundId } } });
          credits.push({ playerId: bet.playerId, delta: (bet.amount * BigInt(-1)).toString(), status: 'lost' });
        }

        await tx.balance.update({ where: { playerId: bet.playerId }, data: { available: availableAfter, locked: lockedAfter } });
      }

      await tx.round.update({ where: { id: Number(roundId) }, data: { winningSide, status: 'resolved' } });
      return { resolved: true, credits };
    });

    console.log(`[resolve] result`, result);
    return NextResponse.json({ success: true, ...result });
  } catch (e: any) {
    console.error('[resolve] error', e); // Changed from error.message to e to log full error object
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}


