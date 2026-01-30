// comprehensiveTest.ts
// Comprehensive test to verify all Hyperliquid functionality

import { fetchHistoricalCandles, subscribeToPriceUpdates, getCurrentPrice, shutdown } from './hyperliquidPriceService.js';
import { fetchHypePrice } from './solPrice.js';

async function comprehensiveTest() {
  console.log('=== Comprehensive Hyperliquid Test ===');
  
  try {
    // Test 1: Current price fetching
    console.log('\n1. Testing current price fetching...');
    const currentPrice = await getCurrentPrice('HYPEUSDT');
    console.log('Current HYPE price:', currentPrice);
    
    // Test 2: Fallback price fetching
    console.log('\n2. Testing fallback price fetching...');
    const fallbackPrice = await fetchHypePrice();
    console.log('Fallback HYPE price:', fallbackPrice);
    
    // Test 3: Historical candles
    console.log('\n3. Testing historical candles...');
    const candles = await fetchHistoricalCandles('HYPEUSDT', '1m', 10);
    console.log('Received candles:', candles.length);
    if (candles.length > 0) {
      console.log('Sample candle:', candles[Math.max(0, candles.length - 3)]);
    } else {
      console.log('No candles received - this is expected if the API has limitations');
    }
    
    // Test 4: Real-time subscription (brief test)
    console.log('\n4. Testing real-time subscription (10 seconds)...');
    let updateCount = 0;
    const unsubscribe = subscribeToPriceUpdates('HYPEUSDT', '1m', (candle) => {
      updateCount++;
      console.log(`Real-time update #${updateCount}:`, {
        time: new Date(candle.time * 1000).toISOString(),
        open: candle.open,
        close: candle.close
      });
    });
    
    // Wait 10 seconds to receive updates
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Unsubscribe
    console.log('Unsubscribing from real-time updates...');
    unsubscribe();
    console.log(`Received ${updateCount} real-time updates`);
    
  } catch (error) {
    console.error('Error in comprehensive test:', error);
  } finally {
    console.log('\n=== Test Completed ===');
  }
}

comprehensiveTest().catch(console.error);