import type { NextConfig } from "next";

// ULTRA MINIMAL configuration - no webpack, no experimental features
const nextConfig: NextConfig = {
  // Disable all experimental features
  experimental: {},
  
  // Disable compression
  compress: false,
  
  // Skip all checks
  typescript: {
    ignoreBuildErrors: true,
  },
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // No webpack configuration at all
  webpack: undefined,
};

export default nextConfig;
