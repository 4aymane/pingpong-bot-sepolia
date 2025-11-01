# Kleros Ping-Pong Bot

An Ethereum bot that monitors `Ping()` events and automatically submits `Pong()` transactions in response.

**Contract:** `0xa7f42ff7433cb268dd7d59be62b00c30ded28d3d` (Sepolia)  
**Built with:** TypeScript + ethers.js v6 + SQLite + Docker

---

## ✨ Features

- ✅ Real-time event listening via WebSocket
- ✅ Idempotent processing (no duplicate Pongs)
- ✅ Auto-recovery from crashes
- ✅ Gap scanning for missed events
- ✅ Persistent SQLite database
- ✅ Docker deployment with auto-restart

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Sepolia ETH ([get from faucet](https://sepoliafaucet.com/))

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp env.example .env
# Edit .env and add your PRIVATE_KEY
```

### 3. Run Bot
```bash
# Build
npm run build

# Start
npm start
```

---

## 🐳 Docker Deployment

### Build Image
```bash
docker build -t ping-pong-bot .
```

### Run Container
```bash
docker run -d \
  --name kleros-bot \
  --restart unless-stopped \
  -v bot-data:/app \
  --env-file .env \
  ping-pong-bot
```

### View Logs
```bash
docker logs -f kleros-bot
```

---

## ⚙️ Configuration

Required environment variables (see `env.example`):

```env
RPC_WSS_URL=wss://sepolia.infura.io/ws/v3/YOUR_KEY
PRIVATE_KEY=0x...
PING_PONG_CONTRACT=0xa7f42ff7433cb268dd7d59be62b00c30ded28d3d
```

Optional:
```env
STARTING_BLOCK=7000000  # Omit to use current block
DB_PATH=./bot.db
```

---

## 📊 How It Works

```
1. Listen for Ping() events via WebSocket
2. Check database (idempotency - skip if already processed)
3. Submit Pong(txHash) transaction
4. Wait for confirmation (5-minute timeout)
5. Save to database
```

### On Restart/Crash:
- Docker auto-restarts container (`--restart unless-stopped`)
- Bot scans for missed events since last processed block
- Database ensures no duplicate Pongs

---

## 🔍 Monitoring

### Check Status
```bash
docker ps | grep kleros-bot
```

### View Logs
```bash
# Real-time
docker logs -f kleros-bot

# Last 50 lines
docker logs --tail 50 kleros-bot

# Search for errors
docker logs kleros-bot | grep ERROR
```

### Database Stats
```bash
docker exec kleros-bot sqlite3 bot.db "SELECT COUNT(*) FROM ping_events;"
```

### Verify on Etherscan
View bot transactions: `https://sepolia.etherscan.io/address/YOUR_BOT_ADDRESS`

---

## 🏗️ Project Structure

```
exercise-k-bot-syncing/
├── src/
│   ├── index.ts         # Main entry point
│   ├── config.ts        # Environment validation
│   ├── database.ts      # SQLite operations
│   ├── eventHandler.ts  # Ping → Pong logic
│   ├── eventListener.ts # Real-time listener
│   ├── gapScanner.ts    # Missed event recovery
│   ├── setup.ts         # Provider/wallet setup
│   └── constants.ts     # Contract ABI
├── Dockerfile
├── package.json
├── tsconfig.json
└── env.example
```

---

## 🛡️ Error Handling

| Scenario | Behavior |
|----------|----------|
| WebSocket disconnection | Exit → Docker restarts → Gap scan |
| Transaction timeout (5 min) | Log warning → Retry on restart |
| Duplicate Ping | Skip (check database) |
| Insufficient funds | Log error and halt |
| Bot crash | Docker restarts → Resume from DB |

---

## 📦 AWS Lightsail Deployment

1. **Create instance:** $3.50/month Ubuntu 22.04
2. **Install Docker:** `curl -fsSL https://get.docker.com | sudo sh`
3. **Clone repo and build:** `docker build -t ping-pong-bot .`
4. **Run with auto-restart:** See Docker command above
5. **View logs:** `docker logs -f kleros-bot`

---

## 🎯 Key Concepts

### Idempotency
The bot checks the database before processing each Ping to ensure exactly one Pong per Ping, even if:
- Events arrive multiple times
- Bot crashes mid-processing
- Network glitches cause duplicates

### Nonce Management
Uses `getNonce('pending')` to include pending transactions, preventing nonce conflicts when submitting multiple Pongs quickly.

### Gap Scanning
On startup, the bot queries all missed Ping events since the last processed block and handles them sequentially.

---

## 📝 Deliverables

- ✅ Source code: [This repository]
- ✅ Bot address: [TBD after deployment]
- ✅ Starting block: [TBD after deployment]
- ✅ Live on Sepolia: Verifiable on Etherscan

---

## 🔐 Security

- Private key stored in `.env` (never committed)
- Use dedicated wallet with minimal Sepolia ETH
- Database contains only public transaction hashes
- Logs don't expose sensitive data

---

## 📄 License

MIT

---

**Author:** Aymane  
**Exercise:** Kleros Recruitment - Exercise K (Bot Syncing)

