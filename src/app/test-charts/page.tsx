"use client";

import React, { useState, useEffect } from 'react';
import CandlestickChart from '../components/CandlestickChart';

export default function ChartTestPage() {
  const [activeChart, setActiveChart] = useState<'ethereum' | 'hype'>('ethereum');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Chart Test Page</h1>
        
        <div className="mb-6 flex justify-center">
          <div className="inline-flex rounded-lg p-1 bg-black/20">
            <button
              onClick={() => setActiveChart('ethereum')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                activeChart === 'ethereum' 
                  ? 'bg-purple-600' 
                  : 'hover:bg-black/30'
              }`}
            >
              Ethereum (ETH)
            </button>
            <button
              onClick={() => setActiveChart('hype')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                activeChart === 'hype' 
                  ? 'bg-purple-600' 
                  : 'hover:bg-black/30'
              }`}
            >
              HYPE Token
            </button>
          </div>
        </div>
        
        <div className="glass-card p-6 rounded-2xl">
          {activeChart === 'ethereum' ? (
            <CandlestickChart symbol="ETHUSDT" interval="1m" />
          ) : (
            <CandlestickChart symbol="HYPEUSDT" interval="1m" />
          )}
        </div>
      </div>
    </div>
  );
}