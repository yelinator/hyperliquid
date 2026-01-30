const { createChart } = require('lightweight-charts');

// Create a simple test to see if we can create a chart
console.log('Testing lightweight-charts...');

try {
  // Create a mock DOM element
  const mockElement = {
    clientWidth: 800,
    clientHeight: 400
  };
  
  console.log('Creating chart...');
  const chart = createChart(mockElement, {
    width: 800,
    height: 400
  });
  
  console.log('Chart created successfully');
  
  // Try to add a line series
  console.log('Adding line series...');
  const lineSeries = chart.addSeries(chart.LineSeries, {
    color: '#26a69a',
    lineWidth: 2,
  });
  
  console.log('Line series added successfully');
  
  // Try to set some data
  console.log('Setting data...');
  lineSeries.setData([
    { time: 1642425322, value: 0 },
    { time: 1642511722, value: 8 },
    { time: 1642598122, value: 10 },
    { time: 1642684522, value: 20 },
    { time: 1642770922, value: 3 },
    { time: 1642857322, value: 43 },
    { time: 1642943722, value: 41 },
    { time: 1643030122, value: 43 },
    { time: 1643116522, value: 56 },
    { time: 1643202922, value: 46 },
  ]);
  
  console.log('Data set successfully');
  
  console.log('Test completed successfully');
} catch (error) {
  console.error('Error testing lightweight-charts:', error);
}