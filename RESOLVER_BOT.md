# Auto-Resolver Bot (Sepolia)

## Setup
1. Create a `.env` in `hyperliquid-predict/`:

```
RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
OWNER_PRIVATE_KEY=0xYOUR_OWNER_PRIVATE_KEY
CONTRACT_ADDRESS=0xbcE06b5E24aed4b99082810C69Cd5995ae179eC2
```

2. Install deps (from `hyperliquid-predict/`):

```
npm i ethers dotenv node-fetch@3
```

3. Run once:

```
node scripts/autoResolver.js
```

## PM2 (recommended)

```
npm i -g pm2
pm2 start scripts/autoResolver.js --name resolver-bot
pm2 save
pm2 startup
```

Notes:
- The bot resolves the previous minute's round roughly every 30s.
- Replace the sample price fetcher with your preferred data source for precise entry/exit handling.
- Ensure the owner key has minimal funds for gas on Sepolia.
