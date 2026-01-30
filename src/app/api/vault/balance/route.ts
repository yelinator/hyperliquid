import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

let cached: { value: { balance: string; balanceWei: string; vaultAddress: string }; ts: number } | null = null;
const TTL_MS = 15_000; // 15s cache to avoid slow RPC on every nav

export async function GET(req: NextRequest) {
  try {
    if (cached && (Date.now() - cached.ts) < TTL_MS) {
      return NextResponse.json(cached.value, { headers: { 'Cache-Control': 'public, max-age=15' } });
    }
    const RPC_URL = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
    const VAULT_ADDRESS = process.env.NEXT_PUBLIC_VAULT_ADDRESS;
    
    if (!VAULT_ADDRESS) {
      return NextResponse.json({ error: 'Vault address not configured' }, { status: 400 });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const balance = await provider.getBalance(VAULT_ADDRESS);
    const balanceEth = ethers.formatEther(balance);
    
    const payload = {
      balance: balanceEth,
      balanceWei: balance.toString(),
      vaultAddress: VAULT_ADDRESS
    };
    cached = { value: payload, ts: Date.now() };
    return NextResponse.json(payload, { headers: { 'Cache-Control': 'public, max-age=15' } });
  } catch (error: any) {
    console.error('Error fetching vault balance:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
