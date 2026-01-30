import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

// Placeholder: deduct from internal balance and return intent; on-chain send can be integrated later.
export async function POST(req: NextRequest) {
  try {
    const { address, amountEth } = await req.json();
    if (!address || !amountEth) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    const amount = BigInt(Math.floor(Number(amountEth) * 1e18));
    const addr = String(address).toLowerCase();

    const result = await prisma.$transaction(async (tx) => {
      const player = await tx.player.findUnique({ where: { address: addr } });
      if (!player) throw new Error('Player not found');
      const bal = await tx.balance.findUnique({ where: { playerId: player.id } });
      if (!bal || bal.available < amount) throw new Error('Insufficient balance');

      const updated = await tx.balance.update({
        where: { playerId: player.id },
        data: { available: bal.available - amount },
      });
      await tx.transfer.create({ data: { playerId: player.id, type: 'withdraw', amount: amount * BigInt(-1), meta: {} } });
      return { available: updated.available.toString(), locked: updated.locked.toString() };
    });

    return NextResponse.json({ success: true, balance: result, txScheduled: false });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}


