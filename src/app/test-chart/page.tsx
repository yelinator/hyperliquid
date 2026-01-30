"use client";

import dynamic from 'next/dynamic';

const SimpleChartTest = dynamic(() => import('../test-chart-simple'), {
  ssr: false,
  loading: () => <div className="text-white">Loading chart test...</div>
});

export default function TestChartPage() {
  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-white text-2xl mb-6">Chart Test Page</h1>
        <SimpleChartTest />
      </div>
    </div>
  );
}
