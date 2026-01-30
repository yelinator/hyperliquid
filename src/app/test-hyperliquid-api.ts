import * as hl from "@nktkas/hyperliquid";

async function testHyperliquidAPI() {
  try {
    console.log("Testing Hyperliquid API...");
    
    // Initialize client
    const infoClient = new hl.InfoClient({
      transport: new hl.HttpTransport(),
    });
    
    // Test allMids endpoint
    console.log("Fetching all mids...");
    const allMids = await infoClient.allMids();
    console.log("All mids:", Object.keys(allMids).slice(0, 10)); // Show first 10 symbols
    
    // Check if HYPE is available
    if ('HYPE' in allMids) {
      console.log("HYPE price:", allMids.HYPE);
    } else {
      console.log("HYPE not found in allMids");
    }
    
    // Test candle data for HYPE
    console.log("Fetching HYPE candle data...");
    const now = Math.floor(Date.now() / 1000);
    const candles = await infoClient.candleSnapshot({
      coin: 'HYPE',
      interval: '1m',
      startTime: now - 3600, // 1 hour ago
      endTime: now,
    });
    
    console.log("Candle data received:", candles.length, "candles");
    if (candles.length > 0) {
      console.log("Sample candle:", candles[0]);
    }
    
  } catch (error) {
    console.error("Error testing Hyperliquid API:", error);
  }
}

testHyperliquidAPI();