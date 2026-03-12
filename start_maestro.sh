#!/bin/bash
set -euo pipefail

echo "🔧 Starting Maestro development environment..."

# Ensure Docker is running
sudo systemctl start docker
sudo systemctl enable docker

# Add ec2-user to docker group if not already done
sudo usermod -aG docker ec2-user

# Defaults from environment with fallbacks
IMAGE="${IMAGE:-ghcr.io/brianclong/maestro:latest}"
PORT="${PORT:-8080}"
HEALTH_PATH="${HEALTH_PATH:-/healthz}"

# If GHCR creds provided, login for private images
if [[ -n "${GHCR_USERNAME:-}" && -n "${GHCR_TOKEN:-}" ]]; then
  echo "🔐 Logging into GHCR as ${GHCR_USERNAME}"
  echo -n "$GHCR_TOKEN" | sudo docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin || {
    echo "⚠️  GHCR login failed; will try anonymous pull" >&2
  }
fi

# Create docker-compose file if it doesn't exist
cat > /home/ec2-user/docker-compose.yml << 'COMPOSE_EOF'
version: '3.8'
services:
  maestro-dev:
    image: ${IMAGE}
    ports:
      - "${PORT}:${PORT}"
    environment:
      - NODE_ENV=development
      - PORT=${PORT}
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:${PORT}${HEALTH_PATH}"]
      interval: 30s
      timeout: 10s
      retries: 3
COMPOSE_EOF

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Stop any existing containers
docker-compose down 2>/dev/null || true

# Pull latest image and start
set +e
docker-compose pull
PULL_STATUS=$?
set -e
if [[ $PULL_STATUS -ne 0 ]]; then
  echo "❌ docker-compose pull failed (status $PULL_STATUS). Check GHCR credentials if image is private." >&2
fi
docker-compose up -d

echo "✅ Docker containers started"
docker-compose ps

# Configure nginx vhost for Maestro UI and API under /maestro
sudo tee /etc/nginx/conf.d/maestro.conf > /dev/null << NGINX_EOF
server {
    listen 80 default_server;
    server_name ${SERVER_NAME:-dev.topicality.co} _;

    # Redirect root to /maestro/
    location = / {
        return 302 /maestro/;
    }

    # Serve Maestro UI under /maestro/
    location /maestro/ {
        proxy_pass http://localhost:${PORT}/maestro/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
    }

    # Proxy Maestro API under /api/maestro/
    location /api/maestro/ {
        proxy_pass http://localhost:${PORT}/api/maestro/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    # Health endpoint (maps to container health path)
    location = /health {
        proxy_pass http://localhost:${PORT}${HEALTH_PATH};
        access_log off;
    }
}
NGINX_EOF

# Install nginx if needed
if ! command -v nginx &> /dev/null; then
    sudo yum install -y nginx
fi

# Start nginx
sudo systemctl start nginx
sudo systemctl enable nginx
sudo nginx -t && sudo systemctl reload nginx

echo "✅ Nginx configured and restarted"

# Wait for container to be healthy
echo "⏳ Waiting for Maestro to be ready..."
for i in {1..30}; do
    if curl -f -s "http://localhost:${PORT}${HEALTH_PATH}" >/dev/null 2>&1; then
        echo "✅ Maestro is healthy!"
        break
    fi
    echo "Waiting... ($i/30)"
    sleep 10
done

# Final status
echo ""
echo "🎯 Final Status Check:"
echo "Container status:"
docker-compose ps
echo ""
echo "Maestro health check:"
if ! curl -s "http://localhost:${PORT}${HEALTH_PATH}"; then
  echo "Health check failed; recent container logs:" >&2
  docker ps
  docker logs --tail=200 maestro-dev || true
fi
echo ""
echo "✅ Maestro development environment is ready!"
