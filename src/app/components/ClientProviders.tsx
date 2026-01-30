"use client";

import { useState, useEffect } from 'react';
import WalletProvider from './WalletProvider';
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "@/app/utils/wagmiConfig";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [isHydrated, setIsHydrated] = useState(false);

  // Prevent hydration errors by waiting for client-side hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Configurable switch: use RainbowKit or the existing custom WalletProvider
  const USE_RAINBOWKIT = true;

  // Show loading state during hydration to prevent setState during render
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center">
        <div className="pixel-card p-6 text-center">
          <div className="pixel-dot w-8 h-8 animate-pulse mx-auto mb-4"></div>
          <div className="pixel-text text-white">Loading...</div>
        </div>
      </div>
    );
  }

  if (USE_RAINBOWKIT) {
    return (
      <div suppressHydrationWarning>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider
              modalSize="compact"
              theme={darkTheme({
                accentColor: "#7c3aed",
                accentColorForeground: "white",
                borderRadius: "large",
              })}
            >
              {children}
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </div>
    );
  }

  return (
    <WalletProvider>
      {children}
    </WalletProvider>
  );
}