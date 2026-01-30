import type { NextConfig } from "next";

// MINIMAL configuration for maximum development speed
const nextConfig: NextConfig = {
  // Disable all experimental features
  experimental: {},
  
  // Disable compression in development
  compress: false,
  
  // Skip TypeScript checking
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Skip ESLint
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Minimal webpack config
  webpack: (config, { isServer, dev }) => {
    if (dev) {
      // Disable ALL optimizations for speed
      config.optimization = {
        minimize: false,
        splitChunks: false,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        usedExports: false,
        sideEffects: false,
        providedExports: false,
        concatenateModules: false,
      };
      
      // Disable file watching
      config.watchOptions = {
        poll: false,
        ignored: /.*/,
      };
      
      // Disable source maps
      config.devtool = false;
      
      // Disable caching to avoid memory issues
      config.cache = false;
    }
    
    return config;
  },
};

export default nextConfig;
