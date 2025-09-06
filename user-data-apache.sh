#!/bin/bash
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

echo "=== ULTRA SIMPLE APACHE MAESTRO ==="
date

# Install Apache (httpd) - most reliable web server on Amazon Linux
yum update -y
yum install -y httpd

# Create Maestro API responses as static files
mkdir -p /var/www/html

# Health check endpoint
cat > /var/www/html/healthz << 'EOF'
{"status":"healthy","timestamp":"2025-09-05T13:00:00Z","environment":"development","service":"maestro-dev"}
EOF

# Root endpoint  
cat > /var/www/html/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Maestro Development</title>
    <meta charset="utf-8">
</head>
<body>
    <h1>🚀 Maestro Conductor - Development Environment</h1>
    <p><strong>Status:</strong> Running</p>
    <p><strong>Environment:</strong> Development</p>
    <p><strong>Version:</strong> 1.0.0</p>
    <p><strong>Platform:</strong> IntelGraph AI Platform</p>
    
    <h2>API Endpoints:</h2>
    <ul>
        <li><a href="/healthz">/healthz</a> - Health check</li>
        <li><a href="/api">/api</a> - API info</li>
    </ul>
    
    <h2>Server Info:</h2>
    <p>Timestamp: 2025-09-05T13:00:00Z</p>
    <p>Server: Apache/Amazon Linux 2023</p>
</body>
</html>
EOF

# API info endpoint
cat > /var/www/html/api << 'EOF'
{"message":"Maestro Conductor - IntelGraph AI Platform","version":"1.0.0","environment":"development","timestamp":"2025-09-05T13:00:00Z","endpoints":{"health":"/healthz","root":"/","api":"/api"}}
EOF

# Set correct content types
cat > /var/www/html/.htaccess << 'EOF'
<Files "healthz">
    Header set Content-Type "application/json"
</Files>
<Files "api">
    Header set Content-Type "application/json"
</Files>
EOF

# Set permissions
chown -R apache:apache /var/www/html
chmod -R 644 /var/www/html/*

# Start Apache
systemctl start httpd
systemctl enable httpd

# Test locally
sleep 2
echo "=== LOCAL TEST ==="
curl -s http://localhost/
echo ""
curl -s http://localhost/healthz
echo ""

echo "=== APACHE STATUS ==="
systemctl status httpd --no-pager

echo "=== PORT CHECK ==="
netstat -tulpn | grep :80

echo "=== APACHE MAESTRO READY ==="
date