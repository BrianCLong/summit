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

# Create nginx configuration
cat > /etc/nginx/conf.d/maestro.conf << 'EOF'
server {
    listen 80;
    server_name dev.topicality.co;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name staging.topicality.co;
    
    location / {
        proxy_pass http://localhost:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name prod.topicality.co;
    
    location / {
        proxy_pass http://localhost:8082;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Fix ownership
chown -R ec2-user:ec2-user /home/ec2-user/

# Start services (run as ec2-user)
su - ec2-user -c 'cd /home/ec2-user && docker-compose up -d'

# Restart nginx
systemctl reload nginx

# Create status file
echo "Maestro deployment complete at $(date)" > /home/ec2-user/deployment-status.txt