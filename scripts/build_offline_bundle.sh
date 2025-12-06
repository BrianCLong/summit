#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Project Ironclad: Summit Offline Bundle Generator
# ==============================================================================
# This script creates a self-contained .tar.gz artifact for air-gapped deployment.
# It builds all services, saves Docker images, and generates an installer.
#
# Usage: ./scripts/build_offline_bundle.sh [version]
# Example: ./scripts/build_offline_bundle.sh v1.0.0

VERSION=${1:-dev}
OUTPUT_DIR="build/summit-offline-${VERSION}"
ARCHIVE_NAME="summit-offline-${VERSION}.tar.gz"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() { echo -e "${BLUE}[IRONCLAD]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Ensure we are in the root
if [ ! -f "docker-compose.dev.yml" ]; then
    error "Must run from repository root."
fi

# Clean previous build
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR/images"
mkdir -p "$OUTPUT_DIR/configs"

log "Starting build for version ${VERSION}..."

# ------------------------------------------------------------------------------
# 1. Build Application Images
# ------------------------------------------------------------------------------
log "Building local application images (API, Web, etc.)..."
# We use the standard compose file to build "summit-api", "summit-web" etc.
docker compose -f docker-compose.dev.yml build api web gateway websocket-server ai-sandbox

# ------------------------------------------------------------------------------
# 2. Identify and Pull Vendor Images
# ------------------------------------------------------------------------------
log "Pulling vendor images..."
# Explicitly pull images defined in docker-compose to ensure we have them locally
docker pull postgres:16-alpine
docker pull redis:7-alpine
docker pull neo4j:5.24.0-community
docker pull docker.elastic.co/elasticsearch/elasticsearch:8.15.0
docker pull prom/prometheus:latest
docker pull grafana/grafana:10.4.7
# Add other observability images as needed

# ------------------------------------------------------------------------------
# 3. Save Images to Tarballs
# ------------------------------------------------------------------------------
save_image() {
    local img_name=$1
    local file_name=$2
    log "Saving image: $img_name -> $file_name"
    docker save "$img_name" | gzip > "$OUTPUT_DIR/images/$file_name.tar.gz" || error "Failed to save $img_name"
}

# Application Images (Tag them specifically if needed, here assuming 'latest' or 'dev' tags created by compose)
# Note: Docker Compose usually prefixes with directory name, e.g., 'summit_api'
PROJECT_NAME=$(basename "$(pwd)" | tr '[:upper:]' '[:lower:]' | tr -cd '[a-z0-9-_]')
# Adjust project name fallback if needed. Usually 'summit' or 'intelgraph-mvp'

# We need to find the actual image names.
# A robust way is to re-tag them for the bundle.
docker tag "${PROJECT_NAME}-api:latest" summit/api:${VERSION} 2>/dev/null || docker tag "${PROJECT_NAME}-api" summit/api:${VERSION}
docker tag "${PROJECT_NAME}-web:latest" summit/web:${VERSION} 2>/dev/null || docker tag "${PROJECT_NAME}-web" summit/web:${VERSION}
docker tag "${PROJECT_NAME}-gateway:latest" summit/gateway:${VERSION} 2>/dev/null || docker tag "${PROJECT_NAME}-gateway" summit/gateway:${VERSION}
docker tag "${PROJECT_NAME}-websocket-server:latest" summit/websocket-server:${VERSION} 2>/dev/null || docker tag "${PROJECT_NAME}-websocket-server" summit/websocket-server:${VERSION}
docker tag "${PROJECT_NAME}-ai-sandbox:latest" summit/ai-sandbox:${VERSION} 2>/dev/null || docker tag "${PROJECT_NAME}-ai-sandbox" summit/ai-sandbox:${VERSION}

save_image "summit/api:${VERSION}" "summit-api"
save_image "summit/web:${VERSION}" "summit-web"
save_image "summit/gateway:${VERSION}" "summit-gateway"
save_image "summit/websocket-server:${VERSION}" "summit-websocket-server"
save_image "summit/ai-sandbox:${VERSION}" "summit-ai-sandbox"

# Vendor Images
save_image "postgres:16-alpine" "postgres"
save_image "redis:7-alpine" "redis"
save_image "neo4j:5.24.0-community" "neo4j"
save_image "docker.elastic.co/elasticsearch/elasticsearch:8.15.0" "elasticsearch"

# ------------------------------------------------------------------------------
# 4. Generate Configuration
# ------------------------------------------------------------------------------
log "Generating offline configurations..."

cp .env.example "$OUTPUT_DIR/configs/.env.example"

# Generate docker-compose.offline.yml
cat > "$OUTPUT_DIR/docker-compose.offline.yml" <<EOF
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data

  neo4j:
    image: neo4j:5.24.0-community
    restart: unless-stopped
    ports:
      - '7474:7474'
      - '7687:7687'
    volumes:
      - neo4j_data:/data

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.15.0
    restart: unless-stopped
    ports:
      - '9200:9200'
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

  api:
    image: summit/api:${VERSION}
    restart: unless-stopped
    env_file: .env
    depends_on:
      - postgres
      - redis
      - neo4j
      - elasticsearch
    ports:
      - '4000:4000'

  web:
    image: summit/web:${VERSION}
    restart: unless-stopped
    env_file: .env
    depends_on:
      - api
    ports:
      - '3000:3000'

  gateway:
    image: summit/gateway:${VERSION}
    restart: unless-stopped
    ports:
      - '4100:4100'

  websocket-server:
    image: summit/websocket-server:${VERSION}
    restart: unless-stopped
    ports:
      - '9001:9001'

volumes:
  postgres_data:
  redis_data:
  neo4j_data:
  elasticsearch_data:
EOF

# ------------------------------------------------------------------------------
# 5. Generate Install Script
# ------------------------------------------------------------------------------
log "Generating install.sh..."

cat > "$OUTPUT_DIR/install.sh" <<'EOF'
#!/bin/bash
set -e

echo "==================================================="
echo "   Summit Platform - Air-Gap Installer ${VERSION}"
echo "==================================================="

if [ ! -f .env ]; then
    if [ -f configs/.env.example ]; then
        echo "Creating .env from example..."
        cp configs/.env.example .env
        echo "Please edit .env with your configuration and run this script again."
        exit 1
    else
        echo "ERROR: .env file missing."
        exit 1
    fi
fi

echo "Loading Docker images..."
for img in images/*.tar.gz; do
    echo "Loading $img..."
    docker load -i "$img"
done

echo "Starting services..."
docker compose -f docker-compose.offline.yml up -d

echo "Done! Summit is running."
EOF
chmod +x "$OUTPUT_DIR/install.sh"

# ------------------------------------------------------------------------------
# 6. Compress Bundle
# ------------------------------------------------------------------------------
log "Compressing bundle into $ARCHIVE_NAME..."
tar -czf "$ARCHIVE_NAME" -C "build" "summit-offline-${VERSION}"

success "Bundle created: $ARCHIVE_NAME"
success "Size: $(du -h $ARCHIVE_NAME | cut -f1)"
