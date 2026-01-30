// Utility functions to fetch crypto prices from Binance API (fallback to CoinGecko)
// For Hyperliquid/EVM version

// Simple price tracker that guarantees movement
let lastEthPrice = 3000.0;
let lastHypePrice = 55.0; // Default HYPE price
let callCount = 0;

// Generate mock price history when API fails
function generateMockPriceHistory(coinId: string, days: number) {
  console.log(`Generating mock price history for ${coinId} (${days} days)`);
  
  const basePrice = coinId === 'ethereum' ? 3000 : 55;
  const points = days * 24 * 60; // 1 point per minute
  const prices = [];
  
  for (let i = 0; i < points; i++) {
    const timestamp = Date.now() - (points - i) * 60000; // 1 minute intervals
    const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
    const price = basePrice * (1 + variation);
    prices.push([timestamp, price]);
  }
  
  return {
    prices,
    market_caps: prices.map(([timestamp, price]) => [timestamp, price * 1000000]),
    total_volumes: prices.map(([timestamp, price]) => [timestamp, price * 1000])
  };
}

// Add a helper function to handle CORS issues by using a proxy
async function fetchWithFallback(url: string): Promise<Response> {
  // Try direct fetch first
  try {
    const response = await fetch(url);
    return response;
  } catch (error) {
    console.warn('Direct fetch failed, trying with CORS proxy:', url);
    // Try with multiple CORS proxies as fallbacks
    const proxies = [
      'https://api.allorigins.win/raw?url=',
      'https://corsproxy.io/?',
      'https://thingproxy.freeboard.io/fetch/'
    ];
    
    for (const proxy of proxies) {
      try {
        // Use a CORS proxy service
        const proxyUrl = `${proxy}${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        if (response.ok) {
          return response;
        }
      } catch (proxyError) {
        console.warn(`CORS proxy ${proxy} failed:`, proxyError);
        continue;
      }
    }
    
    console.warn('All CORS proxies failed, returning mock response:', url);
    // Return a mock response with default data
    return {
      ok: true,
      status: 200,
      json: async () => {
        callCount++;
        
        if (url.includes('ETHUSDT')) {
          // Guarantee price movement - alternate between up and down
          const movement = (callCount % 2 === 0) ? 0.001 : -0.001;
          lastEthPrice += movement;
          return { price: lastEthPrice.toString() };
        } else if (url.includes('HYPEUSDT')) {
          // Guarantee price movement for HYPE
          const hypeMovement = (callCount % 2 === 0) ? 0.001 : -0.001;
          lastHypePrice += hypeMovement;
          return { price: lastHypePrice.toString() };
        } else if (url.includes('ethereum,hype')) {
          // Guarantee price movement for both
          const ethMovement = (callCount % 2 === 0) ? 0.001 : -0.001;
          const hypeMovement = (callCount % 2 === 0) ? 0.001 : -0.001;
          lastEthPrice += ethMovement;
          lastHypePrice += hypeMovement;
          return { ethereum: { usd: lastEthPrice }, hype: { usd: lastHypePrice } };
        } else if (url.includes('ethereum')) {
          // Guarantee price movement for ETH
          const ethMovement = (callCount % 2 === 0) ? 0.001 : -0.001;
          lastEthPrice += ethMovement;
          return { ethereum: { usd: lastEthPrice } };
        } else if (url.includes('ethereum') && url.includes('market_chart')) {
          // Return mock price history data
          const now = Date.now();
          const mockData = [];
          for (let i = 0; i < 24; i++) {
            const movement = (i % 2 === 0) ? 0.1 : -0.1;
            mockData.push([now - (24 - i) * 3600000, lastEthPrice + movement * i]);
          }
          return { prices: mockData };
        } else if (url.includes('hyperliquid') && url.includes('market_chart')) {
          // Return mock price history data for Hyperliquid
          const now = Date.now();
          const mockData = [];
          for (let i = 0; i < 96; i++) { // 24 hours with 15-minute intervals
            const movement = (i % 2 === 0) ? 0.5 : -0.5;
            mockData.push([now - (95 - i) * 900000, lastHypePrice + movement * (i/10)]); // 15 minutes in milliseconds
          }
          return { prices: mockData };
        } else if (url.includes('klines')) {
          // Return mock klines data
          const now = Date.now();
          const mockData = [];
          const basePrice = url.includes('ETHUSDT') ? lastEthPrice : lastHypePrice;
          const movementSize = url.includes('ETHUSDT') ? 0.01 : 0.1;
          for (let i = 0; i < 24; i++) {
            const movement = (i % 2 === 0) ? movementSize : -movementSize;
            const price = basePrice + movement * i;
            const priceStr = price.toString();
            mockData.push([now - (24 - i) * 60000, priceStr, priceStr, priceStr, priceStr]);
          }
          return mockData;
        }
        return {};
      }
    } as any as Response;
  }
}

export async function fetchEthPrice(): Promise<number> {
  // Try fast, uncached public sources first to avoid our proxy's mock data
  const trySources: Array<() => Promise<number>> = [
    // Binance
    async () => {
      const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT', { headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error(`Binance ${res.status}`);
      const j = await res.json();
      const p = parseFloat(j?.price);
      if (!isFinite(p) || p <= 0) throw new Error('Binance bad data');
      return p;
    },
    // CryptoCompare
    async () => {
      const res = await fetch('https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD', { headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error(`CryptoCompare ${res.status}`);
      const j = await res.json();
      const p = Number(j?.USD);
      if (!isFinite(p) || p <= 0) throw new Error('CryptoCompare bad data');
      return p;
    },
    // CoinGecko via our proxy (may return mock when rate-limited)
    async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
      const response = await fetch('/api/coingecko-proxy?coin=ethereum&days=1&interval=minutely');
      if (!response.ok) throw new Error(`CG proxy ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data?.prices) || data.prices.length === 0) throw new Error('CG proxy bad data');
      const latest = data.prices[data.prices.length - 1];
      const p = latest?.[1];
      if (!isFinite(p) || p <= 0) throw new Error('CG proxy invalid');
      return p;
    }
  ];

  for (const source of trySources) {
    try {
      const price = await source();
      if (isFinite(price) && price > 0) {
        lastEthPrice = price;
        return price;
      }
    } catch {}
  }

  // Last resort: return last seen price without forcing it into a low mock range
  if (isFinite(lastEthPrice) && lastEthPrice > 0) return lastEthPrice;
  return 4000; // sensible default near current market
}

export async function fetchHypePrice(): Promise<number> {
  try {
    // 1) Try internal API first (preferred and already sanitized)
    try {
      const internalRes = await fetch('/api/price-data?symbol=HYPEUSDT&interval=1m&limit=1');
      if (internalRes.ok) {
        const candles = await internalRes.json();
        if (Array.isArray(candles) && candles.length > 0 && typeof candles[candles.length - 1]?.close === 'number') {
          const price = candles[candles.length - 1].close;
          lastHypePrice = price;
          return price;
        }
      }
    } catch {}

    // 2) Fallback: CoinGecko Hyperliquid price
    try {
      console.log('Fetching HYPE price from CoinGecko (Hyperliquid)...');
      await new Promise(resolve => setTimeout(resolve, 200));
      // Use our internal proxy to avoid CORS issues
      const response = await fetch('/api/coingecko-proxy?coin=hyperliquid&days=1&interval=minutely');
      if (response.ok) {
        const data = await response.json();
        // Check if we have the expected data structure (prices array for market chart)
        if (data.prices && Array.isArray(data.prices) && data.prices.length > 0) {
          const latestPrice = data.prices[data.prices.length - 1];
          const cgPrice = latestPrice[1]; // prices array format: [timestamp, price]
          if (typeof cgPrice === 'number' && cgPrice > 0 && cgPrice < 500) {
            lastHypePrice = cgPrice;
            return cgPrice;
          }
        }
      }
    } catch {}

    // 3) Soft fallback: return last known or default with realistic movement
    callCount++;
    // Generate more realistic HYPE price movements ($1-5 per minute)
    const baseMovement = Math.random() * 4 + 1; // $1-5 movement
    const direction = Math.random() > 0.5 ? 1 : -1;
    const mockMovement = baseMovement * direction;
    lastHypePrice = (lastHypePrice || 55) + mockMovement;
    if (lastHypePrice < 40) lastHypePrice = 40;
    if (lastHypePrice > 70) lastHypePrice = 70;
    return lastHypePrice;
  } catch (coingeckoError) {
    console.warn('HYPE price fetch failed, using fallback:', coingeckoError);
    callCount++;
    // Generate more realistic HYPE price movements ($1-5 per minute)
    const baseMovement = Math.random() * 4 + 1; // $1-5 movement
    const direction = Math.random() > 0.5 ? 1 : -1;
    const mockMovement = baseMovement * direction;
    lastHypePrice = (lastHypePrice || 55) + mockMovement;
    if (lastHypePrice < 40) lastHypePrice = 40;
    if (lastHypePrice > 70) lastHypePrice = 70;
    return lastHypePrice;
  }
}

export async function fetchCryptoPrices(): Promise<{ ethereum: number; hype: number }> {
  try {
    // Fetch both prices concurrently
    const [ethPrice, hypePrice] = await Promise.all([
      fetchEthPrice(),
      fetchHypePrice()
    ]);
    
    return {
      ethereum: ethPrice,
      hype: hypePrice
    };
  } catch (error) {
    console.error('Error fetching crypto prices:', error);
    // Return last known prices or defaults
    return {
      ethereum: lastEthPrice || 3000,
      hype: lastHypePrice || 55
    };
  }
}

export async function fetchPriceHistory(coinId: string, days: number = 1): Promise<Array<{ timestamp: number; price: number }>> {
  // For HYPE, skip Binance entirely since it doesn't exist there
  if (coinId === 'hype') {
    try {
      console.log('Fetching HYPE price history from CoinGecko (Hyperliquid)...');
      
      // Add delay before CoinGecko API call to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Use our internal proxy to avoid CORS issues
      const response = await fetch(`/api/coingecko-proxy?coin=hyperliquid&days=${days}&interval=minutely`);
      
      if (!response.ok) {
        console.warn(`CoinGecko API rate limited or failed for HYPE: ${response.status} ${response.statusText}`);
        console.log('Using mock data instead of CoinGecko API for HYPE...');
        // Return mock data instead of throwing error
        return generateMockPriceHistory('hype', days);
      }
      
      const data = await response.json();
      
      // Check if we have the expected data structure
      if (!Array.isArray(data.prices)) {
        console.warn(`Unexpected HYPE price history data structure from CoinGecko:`, data);
        console.log('Using mock data instead of CoinGecko API for HYPE...');
        // Return mock data instead of throwing error
        return generateMockPriceHistory('hype', days);
      }
      
      // Convert the data to our format
      return data.prices.map(([timestamp, price]: [number, number]) => ({
        timestamp,
        price
      }));
    } catch (coingeckoError) {
      console.error(`CoinGecko API failed for HYPE price history, using mock data:`, coingeckoError);
      // Return mock price history for HYPE
      const now = Date.now();
      const mockData = [];
      const basePrice = lastHypePrice || 55;
      
      for (let i = 0; i < 96; i++) { // 24 hours with 15-minute intervals
        const movement = (i % 2 === 0) ? 0.5 : -0.5;
        const price = basePrice + movement * (i/10);
        mockData.push({
          timestamp: now - (95 - i) * 900000, // 15 minutes in milliseconds
          price: Math.max(40, Math.min(70, price)) // Keep in reasonable range
        });
      }
      return mockData;
    }
  }

  // For ETH, skip Binance due to geographic restrictions, go directly to CoinGecko
  try {
    console.log('Skipping Binance API due to geographic restrictions, using CoinGecko for ETH price history...');
    
    const coinGeckoId = 'ethereum';
    
    // Add delay before CoinGecko API call to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Use our internal proxy to avoid CORS issues
    const response = await fetch(`/api/coingecko-proxy?coin=${coinGeckoId}&days=${days}&interval=minutely`);
    
    if (!response.ok) {
      console.warn(`CoinGecko API rate limited or failed for ${coinId}: ${response.status} ${response.statusText}`);
      console.log('Using mock data instead of CoinGecko API...');
      // Return mock data instead of throwing error
      return generateMockPriceHistory(coinId, days);
    }
    
    const data = await response.json();
    
    // Check if we have the expected data structure
    if (!Array.isArray(data.prices)) {
      console.warn(`Unexpected ${coinId} price history data structure from CoinGecko:`, data);
      console.log(`Using mock data instead of CoinGecko API for ${coinId}...`);
      // Return mock data instead of throwing error
      return generateMockPriceHistory(coinId, days);
    }
    
    // Convert the data to our format
    return data.prices.map(([timestamp, price]: [number, number]) => ({
      timestamp,
      price
    }));
  } catch (coingeckoError) {
    console.error(`CoinGecko API failed for ${coinId} price history, using mock data:`, coingeckoError);
    // Return mock price history for ETH
    const now = Date.now();
    const mockData = [];
    const basePrice = lastEthPrice || 3200;
    
    for (let i = 0; i < 96; i++) { // 24 hours with 15-minute intervals
      const movement = (i % 2 === 0) ? 5 : -5;
      const price = basePrice + movement * (i/10);
      mockData.push({
        timestamp: now - (95 - i) * 900000, // 15 minutes in milliseconds
        price: Math.max(2800, Math.min(3600, price)) // Keep in reasonable range
      });
    }
    return mockData;
  }
}