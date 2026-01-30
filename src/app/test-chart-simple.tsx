"use client";

import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickSeries, UTCTimestamp } from 'lightweight-charts';

const SimpleChartTest: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [status, setStatus] = useState<string>('Initializing...');

  useEffect(() => {
    const initChart = async () => {
      try {
        setStatus('Creating chart...');
        
        if (!chartContainerRef.current) {
          setStatus('No container found');
          return;
        }

        // Create simple test data
        const testData = [
          { time: Math.floor(Date.now() / 1000) - 3600, open: 3200, high: 3250, low: 3180, close: 3220 },
          { time: Math.floor(Date.now() / 1000) - 1800, open: 3220, high: 3280, low: 3200, close: 3260 },
          { time: Math.floor(Date.now() / 1000), open: 3260, high: 3300, low: 3240, close: 3280 },
        ];

        const chart = createChart(chartContainerRef.current, {
          layout: {
            background: { type: ColorType.Solid, color: '#1a1a1a' },
            textColor: 'white',
          },
          width: 800,
          height: 400,
        });

        const series = chart.addSeries(CandlestickSeries, {
          upColor: '#26a69a',
          downColor: '#ef5350',
          borderVisible: false,
          wickUpColor: '#26a69a',
          wickDownColor: '#ef5350',
        });

        series.setData(testData);
        chart.timeScale().fitContent();

        chartRef.current = chart;
        seriesRef.current = series;

        setStatus('Chart loaded successfully!');

      } catch (error) {
        setStatus(`Error: ${error}`);
        console.error('Chart error:', error);
      }
    };

    initChart();

    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, []);

  return (
    <div className="p-4">
      <h3 className="text-white mb-4">Simple Chart Test</h3>
      <div className="text-white mb-2">Status: {status}</div>
      <div 
        ref={chartContainerRef} 
        className="w-full h-96 border border-gray-600 rounded"
        style={{ minHeight: '400px' }}
      />
    </div>
  );
};

export default SimpleChartTest;
