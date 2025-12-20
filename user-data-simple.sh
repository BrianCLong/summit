#!/bin/bash
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

echo "=== SIMPLE MAESTRO SETUP START ==="
date

# Update and install essentials
yum update -y
yum install -y docker nginx curl

# Start Docker
systemctl start docker
systemctl enable docker
usermod -aG docker ec2-user

# Simple Docker run (no compose needed)
docker pull ghcr.io/brianclong/maestro:latest
docker stop maestro-dev 2>/dev/null || true
docker rm maestro-dev 2>/dev/null || true

# Run container with restart policy
docker run -d \
  --name maestro-dev \
  --restart always \
  -p 8080:8080 \
  -e NODE_ENV=development \
  -e PORT=8080 \
  ghcr.io/brianclong/maestro:latest

# Simple nginx config
cat > /etc/nginx/nginx.conf << 'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    upstream maestro {
        server 127.0.0.1:8080;
    }

    server {
        listen 80 default_server;
        server_name _;
        
        location / {
            proxy_pass http://maestro;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
}
EOF

# Start nginx
systemctl start nginx
systemctl enable nginx

# Wait and test
echo "Waiting for container to start..."
sleep 60

echo "Container status:"
docker ps

echo "Testing connectivity:"
curl -s http://localhost:8080/healthz || echo "Direct connection failed"
curl -s http://localhost/healthz || echo "Nginx proxy failed"

echo "=== SIMPLE MAESTRO SETUP COMPLETE ==="
date