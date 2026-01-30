// Test page to verify HYPE chart fixes
"use client";

import React from "react";
import CandlestickChart from "../components/CandlestickChart";

export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">HYPE Chart Test</h1>
      
      <div className="mb-8 p-4 bg-gray-800 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Testing Notes:</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Chart should display real HYPE data from Hyperliquid when available</li>
          <li>If real data is unavailable, it will show realistic mock data</li>
          <li>Current HYPE price should be around $54-55 based on Hyperliquid data</li>
          <li>Mock data has been improved to look more realistic</li>
        </ul>
      </div>
      
      <div className="w-full">
        <CandlestickChart symbol="HYPEUSDT" interval="1m" />
      </div>
    </div>
  );
}