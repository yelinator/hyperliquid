// DebugInfo.tsx - Component to display raw oracle fields for debugging
import React, { useState } from 'react';

interface DebugInfoProps {
  recentGames: Array<{
    amount: string;
    token: string;
    prediction: "up" | "down";
    entryPrice: number;
    exitPrice: number;
    result: "win" | "lose" | "refund" | "pending";
    timestamp: number;
    startOraclePrice: number | null;
    startOracleExpo: number | null;
    endOraclePrice: number | null;
    endOracleExpo: number | null;
  }>;
}

const DebugInfo: React.FC<DebugInfoProps> = ({ recentGames }) => {
  const [showDebug, setShowDebug] = useState(false);

  if (!showDebug) {
    return (
      <div className="text-center mt-4">
        <button 
          onClick={() => setShowDebug(true)}
          className="text-xs text-gray-500 hover:text-gray-300 underline"
        >
          Show Debug Info
        </button>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 rounded-xl mt-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-bold">Debug Info</h3>
        <button 
          onClick={() => setShowDebug(false)}
          className="text-gray-400 hover:text-white"
        >
          Hide
        </button>
      </div>
      
      <div className="space-y-2">
        {recentGames.map((game, index) => (
          <div key={index} className="p-2 bg-black/20 rounded-lg text-xs">
            <div className="font-bold">Bet #{index + 1}</div>
            <div>Entry Price: ${game.entryPrice.toFixed(6)}</div>
            <div>Exit Price: ${game.exitPrice.toFixed(6)}</div>
            <div>Start Price: {game.startOraclePrice?.toString() || 'N/A'}</div>
            <div>Start Expo: {game.startOracleExpo?.toString() || 'N/A'}</div>
            <div>End Price: {game.endOraclePrice?.toString() || 'N/A'}</div>
            <div>End Expo: {game.endOracleExpo?.toString() || 'N/A'}</div>
            <div>Result: {game.result}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DebugInfo;