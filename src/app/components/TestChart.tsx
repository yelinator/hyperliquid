// TestChart.tsx
// Simple component to test the HYPE chart functionality

"use client";

import React, { useEffect, useState } from 'react';
import CandlestickChart from './CandlestickChart';

const TestChart: React.FC = () => {
  const [showChart, setShowChart] = useState(true);
  
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">HYPE Chart Test</h1>
      <button 
        onClick={() => setShowChart(!showChart)}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        {showChart ? 'Hide' : 'Show'} Chart
      </button>
      
      {showChart && (
        <div className="mt-4">
          <CandlestickChart symbol="HYPEUSDT" interval="1m" />
        </div>
      )}
      
      <div className="mt-8 p-4 bg-gray-800 rounded">
        <h2 className="text-xl font-semibold mb-2">Testing Notes:</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Chart should display real HYPE data from Hyperliquid when available</li>
          <li>If real data is unavailable, it will show realistic mock data</li>
          <li>Current HYPE price should be around $54-55 based on Hyperliquid data</li>
          <li>Mock data has been improved to look more realistic</li>
        </ul>
      </div>
    </div>
  );
};

export default TestChart;