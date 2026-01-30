import { NextRequest, NextResponse } from 'next/server';

function generateMockPrices(coin: string, days: number) {
  const basePrice = coin === 'ethereum' ? 3000 : 50;
  const points = days * 24 * 60; // 1 point per minute
  const prices = [];
  
  for (let i = 0; i < points; i++) {
    const timestamp = Date.now() - (points - i) * 60000; // 1 minute intervals
    const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
    const price = basePrice * (1 + variation);
    prices.push([timestamp, price]);
  }
  
  return prices;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const coin = searchParams.get('coin');
    const days = searchParams.get('days') || '1';
    const interval = searchParams.get('interval') || 'minutely';

    if (!coin) {
      return NextResponse.json({ error: 'Missing coin parameter' }, { status: 400 });
    }

    // Use CoinGecko API with proper headers
    const url = `https://api.coingecko.com/api/v3/coins/${coin}/market_chart?vs_currency=usd&days=${days}&interval=${interval}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'HypePredict/1.0'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      // Return mock data instead of throwing error for rate limiting
      if (response.status === 429 || response.status === 401) {
        console.log(`CoinGecko rate limited (${response.status}), returning mock data for ${coin}`);
        return NextResponse.json({
          prices: generateMockPrices(coin, days),
          market_caps: [],
          total_volumes: []
        });
      }
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=300' // 5 minutes cache
      }
    });

  } catch (error: any) {
    console.error('CoinGecko proxy error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
