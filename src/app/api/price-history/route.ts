import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    // Update to use ethereum or hype instead of solana
    const coinId = searchParams.get('coinId') || 'ethereum';
    const days = searchParams.get('days') || '1';
    
    // Map coinId to CoinGecko IDs
    const coinGeckoId = coinId === 'ethereum' ? 'ethereum' : 
                        coinId === 'hype' ? 'hyperliquid' : 
                        coinId === 'eth' ? 'ethereum' : 'ethereum';
    
    // Fetch price history from CoinGecko
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinGeckoId}/market_chart?vs_currency=usd&days=${days}&interval=minutely`
    );
    
    if (!response.ok) {
      console.error(`Failed to fetch ${coinId} price history: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch ${coinId} price history from CoinGecko`);
    }
    
    const data = await response.json();
    
    // Check if we have the expected data structure
    if (!Array.isArray(data.prices)) {
      console.error(`Unexpected ${coinId} price history data structure:`, data);
      throw new Error(`Invalid ${coinId} price history data from CoinGecko`);
    }
    
    // Convert the data to our format
    const prices = data.prices.map(([timestamp, price]: [number, number]) => ({
      timestamp,
      price
    }));
    
    return NextResponse.json({
      prices,
      coinId,
      days
    });
  } catch (error) {
    console.error('Error fetching price history:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch price history',
        prices: [], // Return empty array as fallback
        coinId: 'ethereum',
        days: '1'
      },
      { status: 200 } // Still return 200 so the frontend can handle the empty data gracefully
    );
  }
}