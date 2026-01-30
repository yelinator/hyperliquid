const hl = require('@nktkas/hyperliquid');

async function testHyperliquid() {
  try {
    console.log('Testing Hyperliquid API...');
    
    const infoClient = new hl.InfoClient({
      transport: new hl.HttpTransport(),
    });
    
    console.log('Fetching all mids...');
    const allMids = await infoClient.allMids();
    console.log('All mids:', allMids);
    
    if (allMids && typeof allMids === 'object') {
      console.log('Available symbols:', Object.keys(allMids));
      
      // Check for HYPE or HYPEUSDT
      if ('HYPE' in allMids) {
        console.log('HYPE price:', allMids.HYPE);
      }
      if ('HYPEUSDT' in allMids) {
        console.log('HYPEUSDT price:', allMids.HYPEUSDT);
      }
    }
  } catch (error) {
    console.error('Error testing Hyperliquid API:', error);
  }
}

testHyperliquid();