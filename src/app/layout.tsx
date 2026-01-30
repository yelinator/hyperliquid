import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientProviders from './components/ClientProviders';
import { Toaster } from 'react-hot-toast';
import VaultTicker from './components/VaultTicker';
import NavigationOptimizer from './components/NavigationOptimizer';
import PerformanceMonitor from './components/PerformanceMonitor';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kairos - Ethereum Price Prediction Game | Hyperliquid",
  description: "Predict Ethereum prices and win crypto rewards on Hyperliquid blockchain with Kairos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" 
          rel="stylesheet" 
        />
        <link 
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white`}
      >
        <ClientProviders>
          <VaultTicker />
          <NavigationOptimizer />
          <PerformanceMonitor />
          <Toaster position="top-right" />
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}