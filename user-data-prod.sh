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

# Create docker-compose file for production (with high availability)
cat > /home/ec2-user/docker-compose.yml << 'EOF'
version: '3.8'
services:
  maestro-prod:
    image: ghcr.io/brianclong/maestro:latest
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - PORT=8080
    restart: always
    deploy:
      resources:
        limits:
          cpus: '1.5'
          memory: 1.5G
        reservations:
          memory: 1G
      replicas: 2
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/healthz"]
      interval: 15s
      timeout: 10s
      retries: 5
      start_period: 60s
EOF

# Create nginx configuration with load balancing
cat > /etc/nginx/conf.d/maestro.conf << 'EOF'
upstream maestro_backend {
    server localhost:8080;
    # Future: add more servers for load balancing
}

server {
    listen 80 default_server;
    server_name prod.topicality.co _;
    
    location / {
        proxy_pass http://maestro_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Production optimizations
        proxy_connect_timeout 5s;
        proxy_send_timeout 10s;
        proxy_read_timeout 10s;
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://maestro_backend/healthz;
        access_log off;
    }
}
EOF

# Fix ownership
chown -R ec2-user:ec2-user /home/ec2-user/

# Start services
su - ec2-user -c 'cd /home/ec2-user && docker-compose up -d'

# Restart nginx
systemctl reload nginx

echo "Production environment deployment complete at $(date)" > /home/ec2-user/deployment-status.txt