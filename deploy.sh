#!/bin/bash
set -e

echo "🚀 Kleros Ping-Pong Bot - Deployment"
echo "====================================="

# Update system
echo ""
echo "📦 Updating system..."
sudo apt update -y

# Install Docker
echo ""
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
    sudo usermod -aG docker ubuntu
    newgrp docker
fi
docker --version

# Check .env file
echo ""
echo "⚙️  Checking .env file..."
if [ ! -f .env ]; then
    echo "❌ ERROR: .env file not found"
    exit 1
fi

# Stop old container
if docker ps -a | grep -q kleros-bot; then
    docker stop kleros-bot 2>/dev/null || true
    docker rm kleros-bot 2>/dev/null || true
fi

# Build and run
echo ""
echo "🏗️  Building and starting bot..."
docker build -t ping-pong-bot .
docker volume create bot-data 2>/dev/null || true

# Load AWS credentials from .env for CloudWatch
source .env

# Configure AWS CLI for Docker daemon (runs as root)
# Docker's awslogs driver reads from /root/.aws/credentials (not environment variables)
if [ -n "$AWS_ACCESS_KEY_ID" ] && [ -n "$AWS_SECRET_ACCESS_KEY" ]; then
    echo "Configuring AWS credentials for Docker daemon..."
    sudo mkdir -p /root/.aws
    sudo bash -c "cat > /root/.aws/credentials << EOF
[default]
aws_access_key_id = $AWS_ACCESS_KEY_ID
aws_secret_access_key = $AWS_SECRET_ACCESS_KEY
EOF"
    sudo bash -c "cat > /root/.aws/config << EOF
[default]
region = $AWS_DEFAULT_REGION
EOF"
    sudo chmod 600 /root/.aws/credentials
    echo "✅ AWS credentials configured for Docker daemon"
fi

docker run -d \
  --name kleros-bot \
  --restart unless-stopped \
  --log-driver=awslogs \
  --log-opt awslogs-region=$AWS_DEFAULT_REGION \
  --log-opt awslogs-group=kleros-bot \
  --log-opt awslogs-create-group=true \
  -v bot-data:/data \
  --env-file .env \
  ping-pong-bot

echo ""
echo "✅ Deployment complete!"
echo ""
echo "View logs:"
echo "  docker logs -f kleros-bot"
echo "  OR CloudWatch: https://console.aws.amazon.com/cloudwatch/home?region=$AWS_DEFAULT_REGION#logsV2:log-groups/log-group/kleros-bot"

