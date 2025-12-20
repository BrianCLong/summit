#!/bin/bash
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

echo "Starting Maestro Development Environment Setup"
date

# Update system
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

# Wait for Docker to be ready
sleep 10

# Create docker-compose file
cat > /home/ec2-user/docker-compose.yml << 'EOF'
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
      start_period: 60s
EOF

# Create nginx configuration
cat > /etc/nginx/conf.d/maestro.conf << 'EOF'
server {
    listen 80 default_server;
    server_name dev.topicality.co _;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Retry settings
        proxy_next_upstream error timeout http_502 http_503 http_504;
        proxy_next_upstream_tries 3;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://localhost:8080/healthz;
        access_log off;
    }
}
EOF

# Remove default nginx config
rm -f /etc/nginx/conf.d/default.conf

# Fix ownership
chown -R ec2-user:ec2-user /home/ec2-user/

# Start Docker Compose as ec2-user
echo "Starting Docker containers..."
su - ec2-user -c 'cd /home/ec2-user && docker-compose pull && docker-compose up -d'

# Wait for container to start
echo "Waiting for Maestro container to be ready..."
sleep 30

# Check container status
su - ec2-user -c 'cd /home/ec2-user && docker-compose ps'

# Test nginx config and reload
nginx -t && systemctl reload nginx

# Final health check
echo "Final health check..."
for i in {1..10}; do
    if curl -f -s http://localhost:8080/healthz; then
        echo "✅ Maestro is healthy!"
        break
    fi
    echo "Waiting for health check... ($i/10)"
    sleep 15
done

# Create status file
echo "Development environment deployment complete at $(date)" > /home/ec2-user/deployment-status.txt
echo "Container status:" >> /home/ec2-user/deployment-status.txt
su - ec2-user -c 'cd /home/ec2-user && docker-compose ps' >> /home/ec2-user/deployment-status.txt

echo "✅ User data script completed successfully"
date