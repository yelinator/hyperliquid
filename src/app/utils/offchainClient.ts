export async function offchainDepositWebhook(address: string, amountEth: string) {
  const res = await fetch('/api/offchain/deposit-webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, amountEth })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function offchainGetProfile(address: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout to avoid blocking nav
  try {
    const res = await fetch(`/api/offchain/profile?address=${address.toLowerCase()}` as string, {
      signal: controller.signal,
      // Hint to Next/edge to allow caching per session
      headers: { 'Cache-Control': 'private, max-age=5' }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function offchainPlaceBet(params: { address: string; amount: string; side: 'up'|'down'; roundId: number; timeframe: number; }) {
  // Use PURE OFF-CHAIN betting system
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch('/api/offchain/bets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: controller.signal
    });
    if (!res.ok) {
      const errorText = await res.text();
      console.error('API Error Response:', errorText);
      throw new Error(errorText);
    }
    return res.json();
  } catch (error) {
    console.error('Network/API Error:', error);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function offchainResolveRound(roundId: number, winningSide: 'up'|'down') {
  // Use PURE OFF-CHAIN resolution system
  const res = await fetch('/api/offchain/resolve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roundId, winningSide })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}



