#!/bin/bash
set -e

echo "🚀 Deploying to AWS Lightsail"
echo "=============================="

# Check .env first
if [ ! -f .env ]; then
    echo "❌ ERROR: .env file not found"
    exit 1
fi

# Load config from .env
source .env

# Get SSH key (from env or auto-detect)
SSH_KEY=${SSH_KEY_PATH:-$(ls LightsailDefaultKey*.pem 2>/dev/null | head -1)}
if [ -z "$SSH_KEY" ] || [ ! -f "$SSH_KEY" ]; then
    echo "❌ ERROR: SSH key not found"
    exit 1
fi

# Get server IP (from env or prompt)
SERVER_IP=${LIGHTSAIL_IP}
if [ -z "$SERVER_IP" ]; then
    read -p "Enter Lightsail PUBLIC IP: " SERVER_IP
fi

echo ""
echo "📤 Uploading files..."
ssh -i "$SSH_KEY" ubuntu@"$SERVER_IP" "mkdir -p ~/kleros-bot"

rsync -avz \
  -e "ssh -i $SSH_KEY" \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '*.db' \
  --exclude '.git' \
  --exclude '*.pem' \
  --exclude 'docs' \
  ./ ubuntu@"$SERVER_IP":~/kleros-bot/

echo ""
echo "🚀 Running deployment..."
ssh -i "$SSH_KEY" ubuntu@"$SERVER_IP" << 'EOF'
cd ~/kleros-bot
chmod +x deploy.sh
./deploy.sh
EOF

echo ""
echo "=============================================="
echo "✅ Deployment Complete!"
echo "=============================================="
echo ""
echo "📝 Useful commands:"
echo ""
echo "  # View logs:"
echo "  ssh -i $SSH_KEY ubuntu@$SERVER_IP"
echo "  docker logs -f kleros-bot"
echo ""
echo "  # Check status:"
echo "  ssh -i $SSH_KEY ubuntu@$SERVER_IP \"docker ps\""
echo ""
echo "  # Restart bot:"
echo "  ssh -i $SSH_KEY ubuntu@$SERVER_IP \"docker restart kleros-bot\""
echo ""
echo "🔗 Verify on Etherscan:"
echo "  https://sepolia.etherscan.io/address/YOUR_BOT_ADDRESS"
echo ""

