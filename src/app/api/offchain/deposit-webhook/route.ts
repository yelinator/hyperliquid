import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

// This simulates an on-chain deposit confirmation webhook.
// Body: { address, amountEth }
export async function POST(req: NextRequest) {
  try {
    const { address, amountEth } = await req.json();
    if (!address || !amountEth) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    const amount = BigInt(Math.floor(Number(amountEth) * 1e18));
    const addr = String(address).toLowerCase();

    const result = await prisma.$transaction(async (tx) => {
      let player = await tx.player.findUnique({ where: { address: addr } });
      if (!player) {
        player = await tx.player.create({ data: { address: addr } });
        await tx.balance.create({ data: { playerId: player.id } });
      }
      const bal = await tx.balance.findUnique({ where: { playerId: player.id } });
      const updated = await tx.balance.update({
        where: { playerId: player.id },
        data: { available: (bal?.available ?? BigInt(0)) + amount },
      });
      await tx.transfer.create({ data: { playerId: player.id, type: 'deposit', amount, meta: {} } });
      return { available: updated.available.toString(), locked: updated.locked.toString() };
    });

    return NextResponse.json({ success: true, balance: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}


