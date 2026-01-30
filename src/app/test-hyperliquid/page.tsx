"use client";

import { useState, useEffect } from "react";
import { getCurrentPrice, fetchHistoricalCandles } from "../utils/hyperliquidPriceService";

export default function HyperliquidTest() {
  const [hypePrice, setHypePrice] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHypeData = async () => {
      try {
        setLoading(true);
        const price = await getCurrentPrice('HYPEUSDT');
        setHypePrice(price);
        
        if (price === null) {
          setError("Failed to fetch HYPE price");
        } else {
          setError(null);
        }
      } catch (err) {
        setError("Error fetching HYPE price: " + (err instanceof Error ? err.message : "Unknown error"));
      } finally {
        setLoading(false);
      }
    };

    fetchHypeData();
    
    // Refresh every 5 seconds
    const interval = setInterval(fetchHypeData, 5000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Hyperliquid API Test</h1>
        
        <div className="glass-card p-6 rounded-2xl">
          <h2 className="text-2xl font-semibold mb-4">HYPE Token Price</h2>
          
          {loading ? (
            <div className="text-xl animate-pulse">Loading...</div>
          ) : error ? (
            <div className="text-red-400">Error: {error}</div>
          ) : hypePrice !== null ? (
            <div className="text-4xl font-bold neon-text">${hypePrice.toFixed(4)}</div>
          ) : (
            <div className="text-gray-400">No price data available</div>
          )}
          
          <div className="mt-4 text-sm text-gray-400">
            <p>This page tests the Hyperliquid API integration for fetching real HYPE token prices.</p>
            <p>Price updates every 5 seconds.</p>
          </div>
        </div>
      </div>
    </div>
  );
}