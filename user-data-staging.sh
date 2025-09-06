#!/bin/bash
yum update -y

# Install Docker
yum install -y docker
systemctl start docker
systemctl enable docker
usermod -aG docker ec2-user

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install nginx
yum install -y nginx
systemctl start nginx
systemctl enable nginx

# Create docker-compose file for staging (with more resources)
cat > /home/ec2-user/docker-compose.yml << 'EOF'
version: '3.8'
services:
  maestro-staging:
    image: ghcr.io/brianclong/maestro:latest
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=staging
      - PORT=8080
    restart: always
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          memory: 512M
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3
EOF

# Create nginx configuration
cat > /etc/nginx/conf.d/maestro.conf << 'EOF'
server {
    listen 80 default_server;
    server_name staging.topicality.co _;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Fix ownership
chown -R ec2-user:ec2-user /home/ec2-user/

# Start services
su - ec2-user -c 'cd /home/ec2-user && docker-compose up -d'

# Restart nginx
systemctl reload nginx

echo "Staging environment deployment complete at $(date)" > /home/ec2-user/deployment-status.txt