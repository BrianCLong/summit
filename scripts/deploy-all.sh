#!/usr/bin/env bash
set -euo pipefail

# Summit Multi-Environment Deployment Script
# Deploys to dev → stage → prod with health checks

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Configuration
ECR_REGISTRY=${ECR_REGISTRY:-"123456789012.dkr.ecr.us-east-2.amazonaws.com"}
IMAGE_NAME="summit"
TAG=${TAG:-$(git describe --tags --always)}
HEALTH_PATH="/healthz"
SSH_USER="ubuntu"
SSH_KEY="~/.ssh/maestro-keypair.pem"

# Environment hosts
DEV_HOSTS=("intelgraph-dev.topicality.co" "maestro-dev.topicality.co")
STAGE_HOSTS=("stage.topicality.co")
PROD_HOSTS=("prod.topicality.co" "www.topicality.co")

APP_IMAGE="$ECR_REGISTRY/$IMAGE_NAME:$TAG"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
  echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

health_check() {
  local host=$1
  local max_attempts=20
  local attempt=1

  log "🔍 Health checking $host..."

  while [ $attempt -le $max_attempts ]; do
    if curl -fsS --max-time 10 "https://$host$HEALTH_PATH" >/dev/null 2>&1; then
      success "✅ $host is healthy"
      return 0
    fi

    warn "⏳ Attempt $attempt/$max_attempts failed, waiting 15s..."
    sleep 15
    ((attempt++))
  done

  error "❌ $host failed health check after $max_attempts attempts"
  return 1
}

deploy_to_env() {
  local env_name=$1
  shift
  local hosts=("$@")

  log "🚀 Deploying to $env_name environment..."
  log "   Image: $APP_IMAGE"
  log "   Hosts: ${hosts[*]}"

  for host in "${hosts[@]}"; do
    log "📡 Deploying to $host..."

    # Create deployment script on remote host
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$host" bash << EOF
set -euo pipefail

# Update system packages
sudo apt-get update -qq

# Install Docker if not present
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker $USER
  sudo systemctl enable --now docker
fi

# Create app directory
sudo mkdir -p /opt/summit
sudo chown $USER:$USER /opt/summit
cd /opt/summit

# Stop existing containers
docker compose down 2>/dev/null || true
docker stop summit 2>/dev/null || true
docker rm summit 2>/dev/null || true

# AWS ECR login (if credentials available)
if command -v aws >/dev/null; then
  aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin $ECR_REGISTRY || true
fi

# Pull new image
docker pull $APP_IMAGE || {
  echo "⚠️  Could not pull from ECR, using local build"
  docker build -t $APP_IMAGE . || exit 1
}

# Create environment file
cat > .env << 'ENVEOF'
NODE_ENV=production
PORT=3000
PUBLIC_BASE_URL=https://$host
HEALTH_PATH=$HEALTH_PATH
DATABASE_URL=postgresql://intelgraph:password@localhost:5432/intelgraph
REDIS_URL=redis://localhost:6379
ENVEOF

# Create docker-compose file
cat > docker-compose.yml << 'COMPOSEEOF'
version: "3.9"
services:
  summit:
    image: $APP_IMAGE
    restart: always
    env_file: .env
    ports:
      - "127.0.0.1:3000:3000"
    healthcheck:
      test: ["CMD", "curl", "-sf", "http://localhost:3000$HEALTH_PATH"]
      interval: 15s
      timeout: 3s
      retries: 20
      start_period: 30s
    environment:
      - NODE_ENV=production
      - PUBLIC_BASE_URL=https://$host
COMPOSEEOF

# Start services
docker compose up -d

# Wait for service to be ready
sleep 30

echo "✅ Deployment to $host completed"
EOF

    if [ $? -eq 0 ]; then
      success "✅ Deployed to $host"
    else
      error "❌ Deployment to $host failed"
      return 1
    fi
  done

  # Health check all hosts in environment
  local all_healthy=true
  for host in "${hosts[@]}"; do
    if ! health_check "$host"; then
      all_healthy=false
    fi
  done

  if [ "$all_healthy" = true ]; then
    success "🎉 $env_name environment deployment successful!"
    return 0
  else
    error "💥 $env_name environment deployment failed health checks"
    return 1
  fi
}

rollback() {
  local env_name=$1
  shift
  local hosts=("$@")

  error "🔄 Rolling back $env_name environment..."

  for host in "${hosts[@]}"; do
    log "⏪ Rolling back $host..."
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$host" bash << 'EOF'
cd /opt/summit
docker compose down
docker compose up -d
EOF
  done
}

main() {
  log "🎯 Starting Summit multi-environment deployment"
  log "   Version: $TAG"
  log "   Image: $APP_IMAGE"

  # Check prerequisites
  if ! command -v ssh >/dev/null; then
    error "SSH is required but not installed"
    exit 1
  fi

  if [ ! -f "${SSH_KEY/#~/$HOME}" ]; then
    warn "SSH key not found at $SSH_KEY - deployments may fail"
  fi

  # Deploy to DEV
  if deploy_to_env "DEV" "${DEV_HOSTS[@]}"; then
    log "✅ DEV deployment successful, proceeding to STAGE..."
  else
    error "❌ DEV deployment failed, aborting"
    exit 1
  fi

  # Deploy to STAGE
  if deploy_to_env "STAGE" "${STAGE_HOSTS[@]}"; then
    log "✅ STAGE deployment successful, proceeding to PROD..."
  else
    error "❌ STAGE deployment failed, rolling back DEV..."
    rollback "DEV" "${DEV_HOSTS[@]}"
    exit 1
  fi

  # Deploy to PROD
  if deploy_to_env "PROD" "${PROD_HOSTS[@]}"; then
    success "🎉 ALL ENVIRONMENTS DEPLOYED SUCCESSFULLY! 🎉"
    log "🌐 Live at:"
    for host in "${PROD_HOSTS[@]}"; do
      log "   https://$host"
    done
  else
    error "❌ PROD deployment failed, rolling back STAGE and DEV..."
    rollback "STAGE" "${STAGE_HOSTS[@]}"
    rollback "DEV" "${DEV_HOSTS[@]}"
    exit 1
  fi
}

# Run main function
main "$@"