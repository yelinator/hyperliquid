import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Aggressive performance optimizations
  experimental: {
    optimizeCss: true,
    // Disable turbo for now to reduce complexity
    // turbo: {
    //   rules: {
    //     '*.svg': {
    //       loaders: ['@svgr/webpack'],
    //       as: '*.js',
    //     },
    //   },
    // },
  },
  // Enable compression for faster loading
  compress: true,
  // Improve compilation stability
  typescript: {
    ignoreBuildErrors: false,
  },
  // Remove deprecated swcMinify
  // swcMinify: true,
  webpack: (config, { isServer, dev }) => {
    // AGGRESSIVE optimization for development
    if (dev) {
      // Disable file watching completely for faster startup
      config.watchOptions = {
        poll: false,
        aggregateTimeout: 1000,
        ignored: [
          '**/node_modules/**',
          '**/.next/**',
          '**/dist/**',
          '**/.git/**',
          '**/coverage/**',
          '**/test/**',
          '**/tests/**',
          '**/__tests__/**',
          '**/*.test.*',
          '**/*.spec.*',
          '**/README.md',
          '**/CHANGELOG.md',
          '**/LICENSE',
          '**/package-lock.json',
          '**/yarn.lock',
          '**/pnpm-lock.yaml'
        ],
      };
      
      // Disable most optimizations for faster compilation
      config.optimization = {
        ...config.optimization,
        minimize: false,
        splitChunks: false,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        usedExports: false,
        sideEffects: false,
      };
      
      // Aggressive caching
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
        cacheDirectory: '.next/cache/webpack',
        maxMemoryGenerations: 1,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      };
      
      // Reduce module resolution overhead
      config.resolve.symlinks = false;
      config.resolve.cacheWithContext = false;
      
      // Disable source maps in development for speed
      config.devtool = false;
    }
    
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        util: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };
    }
    return config;
  },
};

export default nextConfig;
