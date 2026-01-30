import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { ethers } from 'ethers';

const VAULT_ABI = [
  'function withdraw(address payable to, uint256 amount)',
  'function owner() view returns (address)'
];

export async function POST(req: NextRequest) {
  try {
    const { address, amountWei, vaultAddress } = await req.json();
    if (!address || !amountWei) return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    const addr = String(address).toLowerCase();
    const amt = BigInt(amountWei);

    // 1) Pre-flight: ensure balance is sufficient, but DO NOT debit yet
    {
      const player = await prisma.player.findUnique({ where: { address: addr } });
      if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 400 });
      const bal = await prisma.balance.findUnique({ where: { playerId: player.id } });
      if (!bal || bal.available < amt) return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // 2) Send on-chain from house wallet (server key)
    const RPC_URL = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
    const PRIVATE_KEY = process.env.SERVER_VAULT_OWNER_KEY || process.env.RESOLVER_PRIVATE_KEY; // prefer server-scoped key to avoid shell overrides
    const VAULT = vaultAddress || process.env.NEXT_PUBLIC_VAULT_ADDRESS;
    if (!PRIVATE_KEY) throw new Error('Server key not configured');
    if (!VAULT) throw new Error('Vault address not configured');
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    // Check if vault has sufficient funds
    const vaultBalance = await provider.getBalance(VAULT);
    if (vaultBalance < amt) {
      return NextResponse.json({
        error: 'Insufficient vault funds',
        details: { 
          vaultAddress: VAULT, 
          required: amt.toString(), 
          available: vaultBalance.toString() 
        }
      }, { status: 400 });
    }

    // Attempt withdrawal as simple ETH transfer (not using Vault contract)
    try {
      const tx = await wallet.sendTransaction({
        to: addr,
        value: amt
      });
      const receipt = await tx.wait();

      // 3) Only after on-chain success: debit off-chain balance and record transfer with tx hash
      await prisma.$transaction(async (txDb) => {
        const player = await txDb.player.findUnique({ where: { address: addr } });
        if (!player) throw new Error('Player not found');
        const bal = await txDb.balance.findUnique({ where: { playerId: player.id } });
        if (!bal || bal.available < amt) throw new Error('Insufficient balance');
        await txDb.balance.update({ where: { playerId: player.id }, data: { available: bal.available - amt } });
        await txDb.transfer.create({ data: { playerId: player.id, type: 'withdraw', amount: amt * BigInt(-1), meta: { txHash: tx.hash } } });
      });

      return NextResponse.json({ success: true, txHash: tx.hash, blockNumber: receipt.blockNumber });
    } catch (err: any) {
      const msg: string = err?.message || 'Transaction failed';
      return NextResponse.json({
        error: 'Withdrawal reverted. Possible causes: not vault owner or insufficient vault funds.',
        reason: msg,
        hints: [
          'Ensure RESOLVER_PRIVATE_KEY matches the Vault owner',
          'Ensure NEXT_PUBLIC_VAULT_ADDRESS is correct',
          'Ensure the Vault has enough ETH to cover the withdrawal'
        ]
      }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}


