# IntelGraph Production Deployment Guide

## 🚀 Complete Production Infrastructure Setup

This guide provides step-by-step instructions for deploying IntelGraph to production with full infrastructure automation, monitoring, and scaling capabilities.

## 📋 Prerequisites

### Required Software

- Docker & Docker Compose
- Kubernetes cluster (for production scaling)
- Git
- OpenSSL (for SSL certificates)
- curl, jq (for testing)

### Required Accounts/Services

- Container registry access (GitHub Container Registry)
- SSL certificate provider (Let's Encrypt recommended)
- Monitoring service (optional: New Relic, DataDog)
- Alert notification system (Slack, PagerDuty, etc.)

## 🔧 Step 1: Environment Setup

### 1.1 Clone Repository

```bash
git clone https://github.com/your-org/summit-server.git
cd intelgraph-server
```

### 1.2 Generate Production Secrets

```bash
# Generate secure secrets
./infrastructure/scripts/generate-secrets.sh

# Review generated secrets
cat .env.secrets

# Copy secrets to production environment file
cp .env.production .env
# Edit .env and replace placeholder values with generated secrets
```

### 1.3 Create SSL Certificates

```bash
# Create SSL directory
mkdir -p infrastructure/ssl

# Option A: Generate self-signed certificates (development)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout infrastructure/ssl/intelgraph.key \
  -out infrastructure/ssl/intelgraph.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=intelgraph.example.com"

# Option B: Use Let's Encrypt (production)
# Install certbot and generate certificates
sudo certbot certonly --standalone -d intelgraph.example.com
sudo cp /etc/letsencrypt/live/intelgraph.example.com/fullchain.pem infrastructure/ssl/intelgraph.crt
sudo cp /etc/letsencrypt/live/intelgraph.example.com/privkey.pem infrastructure/ssl/intelgraph.key
```

## 🗄️ Step 2: Database Setup

### 2.1 Start Production Databases

```bash
# Create external network
docker network create intelgraph-network

# Start production databases
docker-compose -f docker-compose.prod.yml up -d

# Verify database health
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs neo4j
docker-compose -f docker-compose.prod.yml logs postgres
docker-compose -f docker-compose.prod.yml logs redis
```

### 2.2 Initialize Databases

```bash
# Wait for databases to be ready
sleep 60

# Check database connectivity
docker exec intelgraph-postgres-prod pg_isready -U intelgraph
docker exec intelgraph-redis-prod redis-cli ping
docker exec intelgraph-neo4j-prod cypher-shell -u neo4j -p your_password "RETURN 'connected'"
```

### 2.3 Setup Database Backups

```bash
# Test backup system
docker-compose -f docker-compose.prod.yml exec db-backup /scripts/backup.sh

# Verify backup files
ls -la infrastructure/backups/
```

## 📊 Step 3: Monitoring Setup

### 3.1 Start Monitoring Stack

```bash
# Start monitoring services
docker-compose -f docker-compose.monitoring.yml up -d

# Verify monitoring services
docker-compose -f docker-compose.monitoring.yml ps
```

### 3.2 Configure Grafana

```bash
# Access Grafana at http://localhost:3001
# Login: admin / your_grafana_password (from .env.secrets)

# Import IntelGraph dashboards
curl -X POST http://admin:your_password@localhost:3001/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @infrastructure/monitoring/grafana/dashboards/intelgraph-overview.json
```

### 3.3 Test Alerting

```bash
# Test Prometheus alerts
curl http://localhost:9090/api/v1/alerts

# Test AlertManager
curl http://localhost:9093/api/v1/alerts
```

## ⚖️ Step 4: Load Balancer and Scaling

### 4.1 Deploy Scaled Application

```bash
# Build application image
docker build -f Dockerfile.prod -t intelgraph-server:latest .

# Start scaled deployment
docker-compose -f docker-compose.scale.yml up -d

# Verify all instances are running
docker ps | grep intelgraph-app
```

### 4.2 Test Load Balancer

```bash
# Test HTTP access
curl -H "Host: intelgraph.example.com" http://localhost/health

# Test HTTPS access (if SSL configured)
curl -k https://localhost/health

# Test WebSocket connection
curl -H "Host: intelgraph.example.com" \
     -H "Upgrade: websocket" \
     -H "Connection: Upgrade" \
     http://localhost/socket.io/

# Check NGINX status
curl http://localhost:8080/nginx_status
```

### 4.3 Test Auto-scaling

```bash
# Monitor auto-scaler logs
docker logs -f intelgraph-autoscaler

# Generate load to test scaling
# Install hey or ab for load testing
go install github.com/rakyll/hey@latest

# Generate load
hey -z 5m -c 50 http://localhost/api/healthz
```

## 🚀 Step 5: CI/CD Pipeline Setup

### 5.1 GitHub Actions Setup

```bash
# Add repository secrets in GitHub:
# - GHCR_TOKEN: GitHub Container Registry token
# - KUBE_CONFIG_STAGING: Base64 encoded kubeconfig for staging
# - KUBE_CONFIG_PRODUCTION: Base64 encoded kubeconfig for production
# - SLACK_WEBHOOK: Slack webhook URL for notifications
# - SNYK_TOKEN: Snyk security scanning token

# Test CI/CD pipeline
git add .
git commit -m "feat: production infrastructure setup"
git push origin main
```

### 5.2 Kubernetes Deployment (Production)

```bash
# Apply Kubernetes manifests
kubectl create namespace intelgraph-production

# Create secrets
kubectl apply -f kubernetes-secrets.yaml

# Deploy application
envsubst < k8s/production/deployment.yaml | kubectl apply -f -

# Verify deployment
kubectl get pods -n intelgraph-production
kubectl get services -n intelgraph-production
kubectl get ingress -n intelgraph-production
```

## 🔍 Step 6: Verification and Testing

### 6.1 Health Checks

```bash
# Application health
curl http://localhost/health
curl http://localhost/api/healthz
curl http://localhost/api/readyz

# Database health
curl http://localhost/api/db/postgres
curl http://localhost/api/db/redis
curl http://localhost/api/db/neo4j

# System metrics
curl http://localhost/metrics
```

### 6.2 Functional Testing

```bash
# Run end-to-end tests
npm run test:e2e -- --baseUrl=http://localhost

# Run performance tests
npm run test:performance

# Test GraphQL endpoint
curl -X POST http://localhost/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { types { name } } }"}'
```

### 6.3 Security Testing

```bash
# SSL/TLS testing
testssl.sh https://intelgraph.example.com

# Security headers
curl -I https://intelgraph.example.com

# Rate limiting
for i in {1..100}; do curl -w "%{http_code}\n" -o /dev/null -s http://localhost/api/healthz; done
```

## 📈 Step 7: Performance Optimization

### 7.1 Database Optimization

```bash
# PostgreSQL performance tuning
docker exec intelgraph-postgres-prod psql -U intelgraph -d intelgraph_prod \
  -c "SELECT name, setting FROM pg_settings WHERE name IN ('shared_buffers', 'effective_cache_size', 'work_mem');"

# Redis performance monitoring
docker exec intelgraph-redis-prod redis-cli info memory
docker exec intelgraph-redis-prod redis-cli info stats

# Neo4j performance monitoring
docker exec intelgraph-neo4j-prod cypher-shell -u neo4j -p your_password \
  "CALL dbms.listQueries() YIELD query, elapsedTimeMillis WHERE elapsedTimeMillis > 1000 RETURN query, elapsedTimeMillis;"
```

### 7.2 Application Performance

```bash
# Monitor application metrics
curl http://localhost/metrics | grep -E "(http_requests|response_time|memory_usage)"

# Check connection pools
curl http://localhost/api/system/stats
```

## 🔒 Step 8: Security Hardening

### 8.1 Network Security

```bash
# Configure firewall rules (example for Ubuntu)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw deny 4000/tcp   # Block direct app access
sudo ufw deny 5432/tcp   # Block direct DB access
sudo ufw deny 6379/tcp   # Block direct Redis access
sudo ufw deny 7687/tcp   # Block direct Neo4j access
sudo ufw enable
```

### 8.2 Container Security

```bash
# Scan container images for vulnerabilities
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image intelgraph-server:latest

# Check container security
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  docker/docker-bench-security
```

### 8.3 Backup and Recovery

```bash
# Test backup restoration
./infrastructure/scripts/restore-backup.sh backup_20240101_120000.tar.gz

# Verify backup integrity
tar -tzf infrastructure/backups/intelgraph_backup_latest.tar.gz
```

## 📞 Step 9: Monitoring and Alerting

### 9.1 Configure Alerts

```bash
# Test alert notifications
curl -X POST "$SLACK_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"text": "IntelGraph deployment test alert"}'

# Verify Prometheus targets
curl http://localhost:9090/api/v1/targets
```

### 9.2 Dashboard Setup

- **Grafana**: http://localhost:3001
- **Prometheus**: http://localhost:9090
- **AlertManager**: http://localhost:9093
- **Jaeger**: http://localhost:16686
- **Kibana**: http://localhost:5601

## 🔄 Step 10: Maintenance Procedures

### 10.1 Regular Maintenance

```bash
# Update application
docker-compose -f docker-compose.scale.yml pull
docker-compose -f docker-compose.scale.yml up -d

# Rotate logs
docker system prune -f
docker volume prune -f

# Update SSL certificates (if using Let's Encrypt)
sudo certbot renew
```

### 10.2 Scaling Operations

```bash
# Manual scaling
docker-compose -f docker-compose.scale.yml up -d --scale intelgraph-app=5

# Kubernetes scaling
kubectl scale deployment intelgraph-app --replicas=5 -n intelgraph-production
```

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Errors**

   ```bash
   # Check database logs
   docker-compose -f docker-compose.prod.yml logs postgres
   docker-compose -f docker-compose.prod.yml logs redis
   docker-compose -f docker-compose.prod.yml logs neo4j
   ```

2. **SSL Certificate Issues**

   ```bash
   # Verify certificate
   openssl x509 -in infrastructure/ssl/intelgraph.crt -text -noout
   ```

3. **High Memory Usage**

   ```bash
   # Check container stats
   docker stats

   # Restart services if needed
   docker-compose -f docker-compose.scale.yml restart
   ```

4. **Load Balancer Issues**

   ```bash
   # Check NGINX configuration
   docker exec intelgraph-nginx nginx -t

   # Reload NGINX
   docker exec intelgraph-nginx nginx -s reload
   ```

## 📞 Support

- **Documentation**: https://docs.intelgraph.com
- **Issues**: https://github.com/your-org/intelgraph-server/issues
- **Security**: security@intelgraph.com

## 🎯 Production Checklist

- [ ] SSL certificates configured and valid
- [ ] Database backups automated and tested
- [ ] Monitoring and alerting configured
- [ ] Load balancer configured with health checks
- [ ] Auto-scaling policies configured
- [ ] Security headers and firewall rules in place
- [ ] CI/CD pipeline tested and functional
- [ ] Performance benchmarks established
- [ ] Disaster recovery procedures documented
- [ ] Team trained on deployment and maintenance procedures

---

**Congratulations! Your IntelGraph production environment is now ready for enterprise deployment.**
