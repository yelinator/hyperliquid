'use client';

import React, { useState, useEffect } from 'react';
import CandlestickChart from '../components/CandlestickChart';

const TestRealTimeChartPage: React.FC = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // This page tests the real-time chart functionality with HYPE token
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Real-time HYPE Chart Test</h1>
        
        <div className="mb-8 p-4 bg-gray-800 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Testing Real-time HYPE Data</h2>
          <p className="mb-4">
            This page tests the real-time chart functionality for the HYPE token using Hyperliquid API.
            The chart should display real-time updates even when historical data is not available.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Current HYPE price should display correctly</li>
            <li>Real-time candle updates should appear in the chart</li>
            <li>If historical data is unavailable, the chart should still show real-time updates</li>
            <li>Mock data should only be used as a last resort</li>
          </ul>
        </div>

        {isClient && (
          <div className="mb-8">
            <CandlestickChart symbol="HYPEUSDT" interval="1m" />
          </div>
        )}

        <div className="mt-8 p-4 bg-gray-800 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Expected Behavior</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>The chart should show real-time updates as they arrive from Hyperliquid</li>
            <li>If the chart shows &quot;Showing simulated data&quot;, it means real-time data is not yet available</li>
            <li>Once real-time data starts flowing, the message should disappear</li>
            <li>The price display should update with each new candle</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TestRealTimeChartPage;