#!/bin/bash
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

echo "=== MAESTRO DEV SETUP START ==="
date

# Update system
yum update -y

# Install Docker (already installed, just start it)
systemctl start docker
systemctl enable docker
usermod -aG docker ec2-user

# Fix package conflicts and install nginx
yum remove -y curl-minimal
yum install -y curl nginx

# Create a simple test application since GHCR is private
cat > /home/ec2-user/app.js << 'EOF'
const http = require('http');

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  if (req.url === '/healthz' || req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: 'development'
    }));
  } else {
    res.writeHead(200);
    res.end(JSON.stringify({
      message: 'Maestro Conductor - IntelGraph AI Platform',
      version: '1.0.0',
      environment: 'development',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/healthz',
        root: '/'
      }
    }));
  }
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Maestro Dev Server listening on port ${PORT}`);
});
EOF

# Create systemd service for the app
cat > /etc/systemd/system/maestro-dev.service << 'EOF'
[Unit]
Description=Maestro Development Server
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user
ExecStart=/usr/bin/node app.js
Environment=NODE_ENV=development
Environment=PORT=8080
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Set ownership and permissions
chown ec2-user:ec2-user /home/ec2-user/app.js

# Start the Node.js service
systemctl daemon-reload
systemctl start maestro-dev
systemctl enable maestro-dev

# Configure nginx
cat > /etc/nginx/nginx.conf << 'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

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
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Health check settings
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }
    }
}
EOF

# Test nginx config and start
nginx -t
systemctl start nginx
systemctl enable nginx

# Wait a moment for services to start
sleep 10

echo "=== SERVICE STATUS ==="
systemctl status maestro-dev --no-pager
systemctl status nginx --no-pager

echo "=== CONNECTIVITY TEST ==="
curl -s http://localhost:8080/healthz && echo ""
curl -s http://localhost/healthz && echo ""

echo "=== PORT LISTENING ==="
netstat -tulpn | grep -E ":80|:8080"

echo "=== MAESTRO DEV SETUP COMPLETE ==="
date