# Fix for "Data must be asc ordered by time" Error

## Problem
The chart was showing an error: "Failed to initialize chart: Assertion failed: data must be asc ordered by time, index=1, time=1757844240, prev time=1757844240"

This error occurs because the lightweight-charts library requires candle data to be:
1. Sorted in ascending order by timestamp
2. Free of duplicate timestamps

## Solution
Implemented data sorting and deduplication at multiple levels:

### 1. In Hyperliquid Price Service
Modified `src/app/utils/hyperliquidPriceService.ts` to ensure data integrity:

- Added `deduplicateAndSortCandles()` helper function
- Enhanced `addCandleToCache()` to automatically sort and deduplicate when adding to cache
- Updated `fetchHistoricalCandles()` to sort and deduplicate data before returning

### 2. In CandlestickChart Component
Modified `src/app/components/CandlestickChart.tsx`:

- Added `sortAndDeduplicateCandles()` function to handle data preprocessing
- Applied sorting and deduplication before setting chart data
- Added type safety checks for time values

## Key Improvements

### Data Sorting
```typescript
// Sort by time
const sorted = [...candles].sort((a, b) => a.time - b.time);
```

### Duplicate Removal
```typescript
// Remove duplicates (same timestamp)
return sorted.filter((candle, index, self) => 
  index === 0 || candle.time !== self[index - 1].time
);
```

### Cache Management
Enhanced the in-memory cache to maintain sorted, deduplicated data automatically:
```typescript
// In addCandleToCache function
candleCache[key] = candleCache[key]
  .sort((a, b) => a.time - b.time)
  .filter((candle, index, self) => 
    index === 0 || candle.time !== self[index - 1].time
  );
```

## Testing
The fix has been verified to:
- Eliminate the "data must be asc ordered by time" error
- Maintain all chart functionality
- Preserve real-time updates
- Handle edge cases with duplicate timestamps
- Ensure proper data ordering for lightweight-charts

## Files Modified
1. `src/app/utils/hyperliquidPriceService.ts` - Added data sorting and deduplication
2. `src/app/components/CandlestickChart.tsx` - Added preprocessing function and applied before chart rendering

This fix ensures that chart data always meets the requirements of the lightweight-charts library, preventing initialization errors while maintaining all existing functionality.