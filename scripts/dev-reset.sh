#!/bin/bash

echo "🚀 Starting aggressive development optimization..."

# Kill any existing processes
pkill -f "next dev" 2>/dev/null || true
pkill -f "node.*next" 2>/dev/null || true

# Clean everything
echo "🧹 Cleaning build artifacts..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .next/cache
rm -rf .turbo

# Clear npm cache
echo "🗑️ Clearing npm cache..."
npm cache clean --force

# Reinstall dependencies with aggressive caching
echo "📦 Reinstalling dependencies..."
npm install --prefer-offline --no-audit --no-fund

# Set environment variables for optimal performance
export NODE_ENV=development
export NEXT_TELEMETRY_DISABLED=1
export WATCHPACK_POLLING=false

# Start with Turbopack for maximum speed
echo "⚡ Starting development server with Turbopack..."
NEXT_PUBLIC_VAULT_ADDRESS="0x0F78Ac5c6Ce0973810e0A66a87bbb116Cb88eF59" \
NEXT_PUBLIC_SEPOLIA_RPC_URL="https://ethereum-sepolia-rpc.publicnode.com" \
npm run dev:fast