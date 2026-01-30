'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function PerformanceMonitor() {
  const pathname = usePathname();

  useEffect(() => {
    // Track navigation performance
    const startTime = performance.now();
    
    // Log navigation start
    console.log(`🚀 Navigation started to: ${pathname}`);
    
    // Track when page is fully loaded
    const handleLoad = () => {
      const endTime = performance.now();
      const navigationTime = endTime - startTime;
      
      console.log(`✅ Navigation completed to: ${pathname} in ${navigationTime.toFixed(2)}ms`);
      
      // Warn if navigation takes too long
      if (navigationTime > 1000) {
        console.warn(`⚠️ Slow navigation detected: ${navigationTime.toFixed(2)}ms to ${pathname}`);
      }
    };

    // Listen for page load completion
    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
    }
  }, [pathname]);

  // Monitor memory usage in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const logMemoryUsage = () => {
        if ('memory' in performance) {
          const memory = (performance as any).memory;
          console.log(`🧠 Memory usage: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB / ${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
        }
      };

      // Log memory usage every 30 seconds
      const interval = setInterval(logMemoryUsage, 30000);
      return () => clearInterval(interval);
    }
  }, []);

  return null; // This component doesn't render anything
}
