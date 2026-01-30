import { ethers } from 'ethers';

export const VAULT_ABI = [
  'function deposit() payable',
  'function withdraw(address to, uint256 amount)',
  'function getBalance() view returns (uint256)',
  'event Deposited(address indexed from, uint256 amount)',
  'event Withdrawn(address indexed to, uint256 amount)'
];

export function getVaultAddress(): string {
  // In Next.js, NEXT_PUBLIC_ variables are available on both server and client
  const addr = process.env.NEXT_PUBLIC_VAULT_ADDRESS || '';
  if (!addr) {
    console.error('NEXT_PUBLIC_VAULT_ADDRESS is not set in environment variables');
  }
  return addr;
}

export async function depositToVaultWithWallet(walletClient: any, amountEth: string) {
  if (!walletClient) throw new Error('No wallet client');
  const addr = getVaultAddress();
  if (!addr) throw new Error('Vault address not configured');
  const provider = new ethers.BrowserProvider(walletClient);
  const signer = await provider.getSigner();
  const contract = new ethers.Contract(addr, VAULT_ABI, signer);
  const value = ethers.parseEther(amountEth);
  const tx = await contract.deposit({ value });
  await tx.wait();
  return tx.hash;
}


