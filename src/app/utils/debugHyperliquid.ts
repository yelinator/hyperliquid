// debugHyperliquid.ts
// Debug script to check Hyperliquid API functionality

import * as hl from "@nktkas/hyperliquid";

async function debugHyperliquid() {
  console.log('Debugging Hyperliquid API...');
  
  // Initialize client
  const infoClient = new hl.InfoClient({
    transport: new hl.HttpTransport(),
  });
  
  try {
    // Test 1: Check if we can get all mids
    console.log('Fetching all mids...');
    const allMids = await infoClient.allMids();
    console.log('All mids keys:', Object.keys(allMids).slice(0, 10)); // Show first 10 keys
    console.log('HYPE in mids:', 'HYPE' in allMids);
    if ('HYPE' in allMids) {
      console.log('HYPE price:', allMids['HYPE']);
    }
    
    // Test 2: Check if HYPEUSDT is in mids
    console.log('HYPEUSDT in mids:', 'HYPEUSDT' in allMids);
    if ('HYPEUSDT' in allMids) {
      console.log('HYPEUSDT price:', allMids['HYPEUSDT']);
    }
    
    // Test 3: Try candle snapshot with a smaller time range
    console.log('Fetching candle snapshot for HYPE...');
    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - 3600; // 1 hour ago
    
    try {
      const candles = await infoClient.candleSnapshot({
        coin: 'HYPE',
        interval: '1m',
        startTime: startTime,
        endTime: endTime,
      });
      
      console.log('Candle snapshot result:', candles.length, 'candles');
      if (candles.length > 0) {
        console.log('Latest candle:', candles[candles.length - 1]);
      }
    } catch (candleError) {
      console.error('Error fetching candle snapshot:', candleError);
    }
    
  } catch (error) {
    console.error('Error in Hyperliquid debug:', error);
  }
  
  console.log('Debug completed.');
}

debugHyperliquid().catch(console.error);