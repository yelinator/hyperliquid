# Hyperliquid Prediction Game Frontend

This is a [Next.js](https://nextjs.org) project for the Hyperliquid Prediction Game.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Wallet Connection

The application supports multiple wallet connection methods:
- MetaMask and other injected wallets
- WalletConnect
- Coinbase Wallet

By default, the application is configured to use Sepolia testnet for testing with real testnet tokens.

## Testnet Configuration

### Sepolia Testnet (Default)

The application is configured to use Sepolia testnet by default. To use it:

1. Ensure you have Sepolia ETH in your wallet
2. Connect your wallet to the application
3. The wallet balance will display your actual Sepolia ETH balance

### Getting Sepolia ETH

To get Sepolia ETH for testing:
1. Visit https://sepoliafaucet.com/
2. Connect your wallet and request test ETH
3. Wait for the transaction to complete

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
