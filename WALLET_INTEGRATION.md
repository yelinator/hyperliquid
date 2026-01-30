# Hyperliquid Wallet Integration

Professional wallet connect system for the Kairos Prediction Game on Hyperliquid chain.

## Features

### WalletConnect v2 Integration
- Supports major wallets (MetaMask, Coinbase Wallet, WalletConnect)
- Dynamic loading of wallet logos & names
- Shows only wallets that support Hyperliquid or fallback via WalletConnect

### Hyperliquid Chain Support
- Custom chain configuration for Hyperliquid
- Auto-prompt to switch/add Hyperliquid chain if not already added
- Proper chain validation and switching

### UI/UX
- Modal interface with searchable wallets (RainbowKit/Web3Modal style)
- Loading states during connection
- Clear error messages for connection failures
- Post-connection display with wallet address, balance, and disconnect button

### Code Architecture
- Uses wagmi + viem for wallet connection
- Separate wallet configuration file for maintainability
- Future-proof design for adding more chains
- Mobile deep linking support

## Recent Fixes for Common Issues

### Wallet Injection Conflicts
- **Issue**: Multiple wallet extensions (MetaMask, Coinbase, Backpack, etc.) trying to redefine `window.ethereum`
- **Fix**: Added safe injection handling and conflict resolution in WalletProvider
- **Result**: Wallets no longer conflict when multiple extensions are installed

### Chain Switching Issues
- **Issue**: Auto-switch to Hyperliquid chain failing with user rejection errors
- **Fix**: Enhanced error handling with specific user feedback messages
- **Result**: Better user experience when chain switching is required

### Connection Stability
- **Issue**: Wallet disconnection causing UI glitches
- **Fix**: Added robust disconnect handling with fallback mechanisms
- **Result**: Smooth disconnection experience even when wallet extensions behave unexpectedly

### RPC Endpoint Handling
- **Issue**: Hyperliquid testnet RPC returning 404 errors
- **Fix**: Updated to use mainnet RPC endpoints and added fallback mechanisms
- **Result**: More stable connection to Hyperliquid network

## File Structure

```
src/
├── app/
│   ├── components/
│   │   ├── EnhancedWalletConnect.tsx    # Main wallet connect component
│   │   └── WalletProvider.tsx           # Wallet provider wrapper
│   ├── hooks/
│   │   └── useEnhancedWalletConnection.ts # Enhanced wallet hook
│   └── utils/
│       └── walletConfig.ts              # Wallet configuration
└── wallet-demo/
    └── page.tsx                         # Demo page
```

## Implementation Details

### Wallet Configuration (`walletConfig.ts`)
- Defines Hyperliquid chain configuration
- Lists supported wallets with metadata
- Contains WalletConnect project ID and metadata
- Handles wallet injection conflicts safely

### Enhanced Wallet Hook (`useEnhancedWalletConnection.ts`)
- Extends basic wallet functionality
- Handles auto-chain switching to Hyperliquid
- Provides wallet information including balances
- Includes utility functions for address formatting and wallet icons
- Enhanced error handling for connection issues

### Enhanced Wallet Component (`EnhancedWalletConnect.tsx`)
- Professional modal interface with search functionality
- Responsive design for all device sizes
- Loading states and error handling
- Post-connection dropdown with wallet info and actions
- Copy address feedback with visual confirmation

### Wallet Provider (`WalletProvider.tsx`)
- Wraps the application with Wagmi provider
- Handles wallet events (chain changes, account changes, disconnect)
- Proper cleanup of event listeners
- Conflict resolution for multiple wallet injections

## Usage

1. Import the `EnhancedWalletConnect` component:
```tsx
import { EnhancedWalletConnect } from '@/app/components/EnhancedWalletConnect';
```

2. Use it in your components:
```tsx
<EnhancedWalletConnect />
```

3. Access wallet information using the hook:
```tsx
import { useEnhancedWalletConnection } from '@/app/hooks/useEnhancedWalletConnection';

const { walletInfo, isConnected } = useEnhancedWalletConnection();
```

## Supported Wallets

- MetaMask
- Coinbase Wallet
- WalletConnect (for mobile wallets)

## Future Enhancements

- Add support for more wallets (Phantom, OKX, Keplr, etc.)
- Implement deep linking for mobile wallets
- Add more chain configurations
- Improve error handling and user feedback

## Dependencies

The implementation uses:
- wagmi v2.16.9
- viem v2.37.6
- @wagmi/connectors v5.9.9
- @coinbase/wallet-sdk

## Configuration

To use your own WalletConnect project ID:
1. Replace the `WALLET_CONNECT_PROJECT_ID` in `walletConfig.ts`
2. Update the `WALLET_CONNECT_METADATA` with your app information

## Testing

A demo page is available at `/wallet-demo` to test the wallet connect functionality.

## Troubleshooting

### Wallet Injection Conflicts
If you see "Cannot redefine property: ethereum" errors:
- This is normal when multiple wallet extensions are installed
- The system automatically handles the first available wallet
- No action needed from users

### Chain Switching Failures
If chain switching fails:
- Users will see a clear error message
- They can manually switch chains in their wallet
- The app will automatically detect when the correct chain is selected

### Connection Issues
If wallet connection fails:
- Users will see specific error messages
- They can try connecting again or use a different wallet
- The system includes automatic retry mechanisms