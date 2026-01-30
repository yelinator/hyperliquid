'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function NavigationOptimizer() {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const [prefetchedRoutes, setPrefetchedRoutes] = useState<Set<string>>(new Set());

  // Optimized prefetching - only prefetch on hover, not automatically
  const prefetchRoute = useCallback((route: string) => {
    if (!prefetchedRoutes.has(route)) {
      router.prefetch(route);
      setPrefetchedRoutes(prev => new Set([...prev, route]));
    }
  }, [router, prefetchedRoutes]);

  // Lightweight route change detection - only for back/forward navigation
  useEffect(() => {
    const handleRouteChange = () => {
      setIsNavigating(true);
      // Reduced timeout for faster perceived performance
      setTimeout(() => setIsNavigating(false), 150);
    };

    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  // Expose prefetch function globally for hover events
  useEffect(() => {
    (window as any).prefetchRoute = prefetchRoute;
    return () => {
      delete (window as any).prefetchRoute;
    };
  }, [prefetchRoute]);

  return (
    <>
      {/* Optimized loading overlay - only show for actual navigation delays */}
      {isNavigating && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center">
          <div className="pixel-card p-4 text-center">
            <div className="pixel-dot w-6 h-6 animate-pulse mx-auto mb-2"></div>
            <div className="pixel-text text-white text-sm">Loading...</div>
          </div>
        </div>
      )}
    </>
  );
}
