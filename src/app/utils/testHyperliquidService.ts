// testHyperliquidService.ts
// Simple test script to verify Hyperliquid price service functionality

import { fetchHistoricalCandles, subscribeToPriceUpdates, getCurrentPrice } from './hyperliquidPriceService';

async function testHyperliquidService() {
  console.log('Testing Hyperliquid price service...');
  
  // Test fetching current price
  console.log('Fetching current HYPE price...');
  const currentPrice = await getCurrentPrice('HYPEUSDT');
  console.log('Current HYPE price:', currentPrice);
  
  // Test fetching historical candles
  console.log('Fetching historical candles...');
  const candles = await fetchHistoricalCandles('HYPEUSDT', '1m', 10);
  console.log('Received candles:', candles.length);
  if (candles.length > 0) {
    console.log('Latest candle:', candles[candles.length - 1]);
  }
  
  // Test real-time updates (subscribe for 10 seconds then unsubscribe)
  console.log('Subscribing to real-time updates...');
  const unsubscribe = subscribeToPriceUpdates('HYPEUSDT', '1m', (candle) => {
    console.log('Real-time candle update:', candle);
  });
  
  // Wait 10 seconds to receive updates
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  // Unsubscribe
  console.log('Unsubscribing from real-time updates...');
  unsubscribe();
  
  console.log('Test completed.');
}

// Run the test if this file is executed directly
if (require.main === module) {
  testHyperliquidService().catch(console.error);
}

export default testHyperliquidService;