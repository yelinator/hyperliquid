// test-hyperliquid-service.ts
import { getCurrentPrice, fetchHistoricalCandles } from './src/app/utils/hyperliquidPriceService';

async function testHyperliquidService() {
  console.log('Testing Hyperliquid service...');
  
  try {
    // Test getCurrentPrice
    console.log('Testing getCurrentPrice for HYPEUSDT...');
    const price = await getCurrentPrice('HYPEUSDT');
    console.log('Current HYPE price:', price);
    
    // Test fetchHistoricalCandles
    console.log('Testing fetchHistoricalCandles for HYPEUSDT...');
    const candles = await fetchHistoricalCandles('HYPEUSDT', '1m', 10);
    console.log('Received candles:', candles.length);
    if (candles.length > 0) {
      console.log('Sample candle:', candles[0]);
    }
  } catch (error) {
    console.error('Error testing Hyperliquid service:', error);
  }
}

testHyperliquidService();