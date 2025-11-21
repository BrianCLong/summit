#!/usr/bin/env bash
set -euo pipefail

# Configuration
EC2_IP="18.221.122.73"
SSH_KEY="~/.ssh/maestro-keypair.pem"
DOMAIN="topicality.co"

echo "🚀 Deploying Maestro to AWS EC2: $EC2_IP"

# Install Docker and dependencies on EC2
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ec2-user@"$EC2_IP" 'bash -s' << 'EOF'
# Update system
sudo yum update -y

# Install Docker
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install nginx
sudo yum install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

echo "✅ System setup complete"
EOF

# Create docker-compose file for Maestro
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  maestro-dev:
    image: ghcr.io/brianclong/maestro:latest
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=development
      - PORT=8080
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3

  maestro-staging:
    image: ghcr.io/brianclong/maestro:latest
    ports:
      - "8081:8080"
    environment:
      - NODE_ENV=staging
      - PORT=8080
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3

  maestro-prod:
    image: ghcr.io/brianclong/maestro:latest
    ports:
      - "8082:8080"
    environment:
      - NODE_ENV=production
      - PORT=8080
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3
EOF

# Copy docker-compose file to EC2
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no docker-compose.yml ec2-user@"$EC2_IP":/home/ec2-user/

# Create nginx configuration
cat > nginx.conf << EOF
server {
    listen 80;
    server_name dev.topicality.co;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}

server {
    listen 80;
    server_name staging.topicality.co;
    
    location / {
        proxy_pass http://localhost:8081;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}

server {
    listen 80;
    server_name prod.topicality.co;
    
    location / {
        proxy_pass http://localhost:8082;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Copy nginx config to EC2
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no nginx.conf ec2-user@"$EC2_IP":/home/ec2-user/

# Deploy and start services
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ec2-user@"$EC2_IP" 'bash -s' << 'EOF'
# Start Maestro services
newgrp docker << 'DOCKEREOF'
docker-compose up -d
DOCKEREOF

# Configure nginx
sudo cp /home/ec2-user/nginx.conf /etc/nginx/conf.d/maestro.conf
sudo nginx -t
sudo systemctl reload nginx

echo "✅ Maestro deployment complete!"
echo "🌐 Access URLs:"
echo "   Development: http://dev.topicality.co (port 8080)"
echo "   Staging:     http://staging.topicality.co (port 8081)" 
echo "   Production:  http://prod.topicality.co (port 8082)"
echo ""
echo "📋 Next steps:"
echo "1. Configure DNS records to point to this server: $EC2_IP"
echo "2. Set up SSL certificates with Let's Encrypt"
EOF

echo "🎉 Maestro AWS deployment complete!"
echo "Server IP: $EC2_IP"
echo "Configure DNS records to point topicality.co subdomains to this IP"

# Cleanup temporary files
rm -f docker-compose.yml nginx.conf