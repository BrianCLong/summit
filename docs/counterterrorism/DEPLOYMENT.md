# Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the Counterterrorism Intelligence Platform in various environments.

## Prerequisites

- Docker >= 20.10
- Docker Compose >= 2.0
- Node.js >= 18.18
- Kubernetes >= 1.24 (for production)
- kubectl configured (for production)
- Sufficient system resources:
  - Minimum: 8GB RAM, 4 CPU cores
  - Recommended: 16GB RAM, 8 CPU cores
  - Production: 32GB RAM, 16 CPU cores

## Quick Start (Development)

```bash
# Clone repository
git clone https://github.com/your-org/summit.git
cd summit/services/counterterrorism-service

# Install dependencies
npm install

# Build services
npm run build

# Start with Docker Compose
docker-compose up -d

# Check health
curl http://localhost:3020/health
curl http://localhost:3021/health
```

## Deployment Methods

### 1. Docker Compose (Development/Staging)

```bash
# Development environment
./scripts/deploy.sh development

# Staging environment
./scripts/deploy.sh staging

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 2. Kubernetes (Production)

#### Create Namespace

```bash
kubectl create namespace intelligence
```

#### Deploy Configurations

```bash
# Apply all configurations
kubectl apply -f k8s/

# Or apply individually
kubectl apply -f k8s/configmap.yml
kubectl apply -f k8s/deployment.yml
kubectl apply -f k8s/service.yml
kubectl apply -f k8s/ingress.yml
kubectl apply -f k8s/hpa.yml
```

#### Verify Deployment

```bash
# Check pods
kubectl get pods -n intelligence

# Check services
kubectl get svc -n intelligence

# Check deployments
kubectl get deployments -n intelligence

# View logs
kubectl logs -f deployment/counterterrorism-service -n intelligence
kubectl logs -f deployment/threat-assessment-service -n intelligence
```

### 3. Manual Deployment

```bash
# Build TypeScript
npm run build

# Start counterterrorism service
NODE_ENV=production PORT=3020 node dist/server.js &

# Start threat assessment service
cd ../threat-assessment-service
NODE_ENV=production PORT=3021 node dist/server.js &
```

## Configuration

### Environment Variables

#### Counterterrorism Service

```bash
NODE_ENV=production
PORT=3020
LOG_LEVEL=info
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://user:pass@localhost:5432/ct
```

#### Threat Assessment Service

```bash
NODE_ENV=production
PORT=3021
LOG_LEVEL=info
REDIS_URL=redis://localhost:6379
```

### Configuration Files

Create `.env` file:

```bash
# Service Configuration
NODE_ENV=production
PORT=3020

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/counterterrorism
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/counterterrorism/app.log

# Security
JWT_SECRET=your-secret-key
API_KEY=your-api-key
ENCRYPTION_KEY=your-encryption-key

# Monitoring
PROMETHEUS_ENABLED=true
METRICS_PORT=9090
```

## Security Configuration

### 1. Generate Secrets

```bash
# Generate JWT secret
openssl rand -base64 32

# Generate API key
openssl rand -hex 32

# Generate encryption key
openssl rand -base64 32
```

### 2. Create Kubernetes Secrets

```bash
kubectl create secret generic counterterrorism-secrets \
  --from-literal=jwt-secret=<jwt-secret> \
  --from-literal=api-key=<api-key> \
  --from-literal=encryption-key=<encryption-key> \
  --namespace=intelligence
```

### 3. TLS/SSL Configuration

```bash
# Create TLS certificate
kubectl create secret tls counterterrorism-tls \
  --cert=path/to/cert.pem \
  --key=path/to/key.pem \
  --namespace=intelligence
```

## Database Setup

### PostgreSQL

```sql
-- Create database
CREATE DATABASE counterterrorism;

-- Create user
CREATE USER ct_user WITH ENCRYPTED PASSWORD 'secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE counterterrorism TO ct_user;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

### Redis

```bash
# Start Redis with persistence
docker run -d \
  --name ct-redis \
  -p 6379:6379 \
  -v redis-data:/data \
  redis:7-alpine redis-server --appendonly yes
```

## Monitoring Setup

### Prometheus

Edit `monitoring/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'counterterrorism-service'
    static_configs:
      - targets: ['counterterrorism-service:3020']
```

### Grafana

```bash
# Access Grafana
open http://localhost:3000

# Default credentials
# Username: admin
# Password: admin
```

Import dashboards:
1. Navigate to Dashboards > Import
2. Upload dashboard JSON files from `monitoring/grafana/dashboards/`

## Load Balancing

### NGINX Configuration

```nginx
upstream counterterrorism {
    least_conn;
    server counterterrorism-1:3020;
    server counterterrorism-2:3020;
    server counterterrorism-3:3020;
}

server {
    listen 443 ssl http2;
    server_name counterterrorism.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://counterterrorism;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Backup and Recovery

### Database Backup

```bash
# Automated backup script
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/backups/counterterrorism

pg_dump -h localhost -U ct_user counterterrorism | \
  gzip > $BACKUP_DIR/backup_$TIMESTAMP.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
```

### Redis Backup

```bash
# Copy RDB file
docker exec ct-redis redis-cli BGSAVE
docker cp ct-redis:/data/dump.rdb /backups/redis/
```

## Scaling

### Horizontal Scaling

```bash
# Scale deployments
kubectl scale deployment counterterrorism-service \
  --replicas=5 -n intelligence

kubectl scale deployment threat-assessment-service \
  --replicas=5 -n intelligence
```

### Auto-scaling

HPA (Horizontal Pod Autoscaler) is configured in `k8s/hpa.yml`:
- Scales based on CPU (70%) and Memory (80%)
- Min replicas: 3
- Max replicas: 10

## Health Checks

### Service Health

```bash
# Counterterrorism service
curl http://localhost:3020/health

# Threat assessment service
curl http://localhost:3021/health
```

### Kubernetes Health

```bash
# Check pod health
kubectl get pods -n intelligence

# Check events
kubectl get events -n intelligence --sort-by='.lastTimestamp'
```

## Troubleshooting

### Common Issues

#### Service Won't Start

```bash
# Check logs
docker-compose logs counterterrorism-service
kubectl logs deployment/counterterrorism-service -n intelligence

# Check configuration
docker-compose config
kubectl get configmap counterterrorism-config -n intelligence -o yaml
```

#### Connection Issues

```bash
# Test connectivity
nc -zv localhost 3020
kubectl port-forward svc/counterterrorism-service 3020:3020 -n intelligence
```

#### Performance Issues

```bash
# Check resource usage
docker stats
kubectl top pods -n intelligence
kubectl top nodes
```

### Log Analysis

```bash
# View recent errors
docker-compose logs --tail=100 counterterrorism-service | grep ERROR

# Kubernetes logs
kubectl logs -f deployment/counterterrorism-service \
  -n intelligence --since=1h | grep ERROR
```

## Maintenance

### Update Deployment

```bash
# Build new image
docker build -t counterterrorism-service:v2 .

# Update deployment
kubectl set image deployment/counterterrorism-service \
  counterterrorism-service=counterterrorism-service:v2 \
  -n intelligence

# Monitor rollout
kubectl rollout status deployment/counterterrorism-service -n intelligence
```

### Rollback

```bash
# Rollback to previous version
kubectl rollout undo deployment/counterterrorism-service -n intelligence

# Rollback to specific revision
kubectl rollout undo deployment/counterterrorism-service \
  --to-revision=2 -n intelligence
```

## Security Hardening

### 1. Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: counterterrorism-network-policy
  namespace: intelligence
spec:
  podSelector:
    matchLabels:
      app: counterterrorism-service
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: api-gateway
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: postgres
```

### 2. Pod Security

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1001
  fsGroup: 1001
  seccompProfile:
    type: RuntimeDefault
  capabilities:
    drop:
      - ALL
```

### 3. Image Scanning

```bash
# Scan Docker images
docker scan counterterrorism-service:latest

# Trivy scan
trivy image counterterrorism-service:latest
```

## Performance Tuning

### Node.js Optimization

```bash
# Increase memory limit
NODE_OPTIONS="--max-old-space-size=4096" node dist/server.js

# Enable cluster mode
pm2 start dist/server.js -i max
```

### Database Optimization

```sql
-- Create indexes
CREATE INDEX idx_organizations_status ON organizations(status);
CREATE INDEX idx_attacks_severity ON attacks(severity);
CREATE INDEX idx_threats_date ON threats(detected_date);

-- Analyze tables
ANALYZE organizations;
ANALYZE attacks;
ANALYZE threats;
```

## Compliance and Auditing

### Audit Logging

```bash
# Enable audit logging
kubectl apply -f k8s/audit-policy.yml

# View audit logs
kubectl logs -n kube-system \
  $(kubectl get pods -n kube-system -l component=kube-apiserver -o name) \
  | grep counterterrorism
```

### Access Control

```bash
# Create RBAC roles
kubectl apply -f k8s/rbac.yml

# Verify permissions
kubectl auth can-i list pods \
  --as=system:serviceaccount:intelligence:ct-service
```

## Support

For deployment issues:
- Check logs and documentation
- Review health check endpoints
- Verify configuration
- Contact system administrators

**Security Notice**: All deployments must comply with applicable laws and regulations. Implement appropriate access controls, encryption, and audit logging.

