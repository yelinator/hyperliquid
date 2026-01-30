// Test file to verify our fixes for the Hyperliquid prediction game

import { fetchHistoricalCandles, getCurrentPrice } from './utils/hyperliquidPriceService';

async function testFixes() {
  console.log('Testing Hyperliquid price service fixes...');
  
  try {
    // Test getCurrentPrice for HYPEUSDT
    console.log('Testing getCurrentPrice for HYPEUSDT...');
    const hypePrice = await getCurrentPrice('HYPEUSDT');
    console.log('HYPE price:', hypePrice);
    
    // Test fetchHistoricalCandles for HYPEUSDT
    console.log('Testing fetchHistoricalCandles for HYPEUSDT...');
    const hypeCandles = await fetchHistoricalCandles('HYPEUSDT', '1m', 20);
    console.log('HYPE candles count:', hypeCandles.length);
    console.log('Sample HYPE candle:', hypeCandles[0]);
    
    // Test getCurrentPrice for ETHUSDT
    console.log('Testing getCurrentPrice for ETHUSDT...');
    const ethPrice = await getCurrentPrice('ETHUSDT');
    console.log('ETH price:', ethPrice);
    
    // Test fetchHistoricalCandles for ETHUSDT
    console.log('Testing fetchHistoricalCandles for ETHUSDT...');
    const ethCandles = await fetchHistoricalCandles('ETHUSDT', '1m', 20);
    console.log('ETH candles count:', ethCandles.length);
    console.log('Sample ETH candle:', ethCandles[0]);
    
    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Error in tests:', error);
  }
}

testFixes();