import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

function toWei(amount: string | number) {
  return BigInt(Math.floor(Number(amount) * 1e18));
}

export async function POST(req: NextRequest) {
  try {
    const { address, amount, side, roundId, timeframe } = await req.json();

    if (!address || !amount || !side || !roundId || !timeframe) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const amountWei = toWei(amount);

    const result = await prisma.$transaction(async (tx) => {
      const addr = String(address).toLowerCase();
      let player = await tx.player.findUnique({ where: { address: addr } });
      if (!player) {
        player = await tx.player.create({ data: { address: addr } });
        await tx.balance.create({ data: { playerId: player.id } });
      }

      const bal = await tx.balance.findUnique({ where: { playerId: player.id } });
      if (!bal || bal.available < amountWei) {
        throw new Error('Insufficient internal balance');
      }

      // upsert round shell (off-chain)
      const now = new Date();
      const start = new Date(Math.floor(Number(roundId)) * 1000);
      const end = new Date(start.getTime() + Number(timeframe) * 1000);
      await tx.round.upsert({
        where: { id: Number(roundId) },
        create: { id: Number(roundId), timeframe: Number(timeframe), startAt: start, endAt: end },
        update: {},
      });

      await tx.balance.update({
        where: { playerId: player.id },
        data: { available: bal.available - amountWei, locked: bal.locked + amountWei },
      });

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

      return { betId: bet.id };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}


