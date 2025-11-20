# Predictive Threat Suite - Deployment Guide

This guide covers deploying the Predictive Threat Suite in various environments.

## Deployment Options

1. **Docker Compose** (Development/Testing)
2. **Kubernetes** (Production)
3. **Manual Installation** (Development)

---

## 1. Docker Compose Deployment

### Prerequisites

- Docker Engine 20.10+
- Docker Compose v2.0+
- 2GB free RAM
- 5GB free disk space

### Steps

1. **Navigate to the directory:**

```bash
cd /home/user/summit/predictive_threat_suite
```

2. **Generate sample dataset (optional, for testing):**

```bash
python test_e2e.py
```

3. **Start all services:**

```bash
docker-compose up -d
```

4. **Verify deployment:**

```bash
# Check all containers are running
docker-compose ps

# Expected output:
# NAME                        STATUS              PORTS
# predictive-forecasting      Up 30 seconds       0.0.0.0:8091->8091/tcp
# predictive-prometheus       Up 30 seconds       0.0.0.0:9090->9090/tcp
# predictive-grafana          Up 30 seconds       0.0.0.0:3001->3000/tcp

# Test API
curl http://localhost:8091/health

# Test Prometheus
curl http://localhost:9090/-/healthy

# Test Grafana (web browser)
open http://localhost:3001
```

5. **View logs:**

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f predictive-forecasting
```

6. **Stop services:**

```bash
docker-compose down
```

7. **Stop and remove volumes:**

```bash
docker-compose down -v
```

### Configuration

Edit `docker-compose.yml` to customize:

- **Ports**: Change `8091:8091` to use different ports
- **Resources**: Add resource limits under each service
- **Environment**: Add environment variables

Example resource limits:

```yaml
services:
  predictive-forecasting:
    # ... other config
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

---

## 2. Kubernetes Deployment

### Prerequisites

- Kubernetes cluster 1.24+
- kubectl configured
- Helm 3.0+ (optional)

### Option A: Direct Kubernetes Manifests

1. **Create namespace:**

```bash
kubectl create namespace predictive-suite
```

2. **Create ConfigMap for Prometheus config:**

```bash
kubectl create configmap prometheus-config \
  --from-file=prometheus.yml \
  -n predictive-suite
```

3. **Create deployment manifest** (`k8s-deployment.yml`):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: predictive-forecasting
  namespace: predictive-suite
spec:
  replicas: 2
  selector:
    matchLabels:
      app: predictive-forecasting
  template:
    metadata:
      labels:
        app: predictive-forecasting
    spec:
      containers:
      - name: forecasting
        image: summit/predictive-suite:alpha
        ports:
        - containerPort: 8091
          name: http
        env:
        - name: LOG_LEVEL
          value: "INFO"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8091
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 8091
          initialDelaySeconds: 5
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: predictive-forecasting
  namespace: predictive-suite
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "8091"
    prometheus.io/path: "/metrics"
spec:
  selector:
    app: predictive-forecasting
  ports:
  - name: http
    port: 8091
    targetPort: 8091
  type: ClusterIP
```

4. **Apply manifests:**

```bash
kubectl apply -f k8s-deployment.yml
```

5. **Verify deployment:**

```bash
kubectl get pods -n predictive-suite
kubectl get svc -n predictive-suite
```

6. **Expose service (optional):**

```bash
# Port-forward for testing
kubectl port-forward svc/predictive-forecasting 8091:8091 -n predictive-suite

# Or create Ingress
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: predictive-forecasting
  namespace: predictive-suite
spec:
  rules:
  - host: predictive.summit.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: predictive-forecasting
            port:
              number: 8091
EOF
```

### Option B: Helm Chart (Recommended)

1. **Create Helm chart structure:**

```bash
cd /home/user/summit/helm
mkdir -p predictive-suite/templates
```

2. **Create `Chart.yaml`:**

```yaml
apiVersion: v2
name: predictive-suite
description: Predictive Threat Suite with forecasting and simulation
type: application
version: 0.1.0
appVersion: "0.1.0-alpha"
```

3. **Create `values.yaml`:**

```yaml
replicaCount: 2

image:
  repository: summit/predictive-suite
  tag: alpha
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 8091

resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 250m
    memory: 256Mi

prometheus:
  enabled: true
  scrape: true

grafana:
  enabled: true
  dashboards:
    enabled: true

env:
  LOG_LEVEL: INFO
```

4. **Install chart:**

```bash
helm install predictive-suite ./predictive-suite -n predictive-suite --create-namespace
```

5. **Upgrade:**

```bash
helm upgrade predictive-suite ./predictive-suite -n predictive-suite
```

6. **Uninstall:**

```bash
helm uninstall predictive-suite -n predictive-suite
```

### ServiceMonitor for Prometheus Operator

If using Prometheus Operator:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: predictive-forecasting
  namespace: predictive-suite
spec:
  selector:
    matchLabels:
      app: predictive-forecasting
  endpoints:
  - port: http
    path: /metrics
    interval: 15s
```

---

## 3. Manual Installation

### Prerequisites

- Python 3.11+
- pip
- Prometheus (existing installation)
- Grafana (existing installation)

### Steps

1. **Install Python dependencies:**

```bash
cd /home/user/summit/predictive_threat_suite
pip install -r requirements.txt
```

2. **Run API service:**

```bash
# Development mode (with auto-reload)
uvicorn api_service:app --host 0.0.0.0 --port 8091 --reload

# Production mode
uvicorn api_service:app --host 0.0.0.0 --port 8091 --workers 4
```

3. **Configure Prometheus:**

Add to your existing `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'predictive-forecasting'
    scrape_interval: 15s
    static_configs:
      - targets:
          - 'localhost:8091'
    metrics_path: '/metrics'
```

Reload Prometheus:

```bash
# If using systemd
sudo systemctl reload prometheus

# If using kill signal
kill -HUP $(pgrep prometheus)

# If using API
curl -X POST http://localhost:9090/-/reload
```

4. **Import Grafana dashboards:**

```bash
# Via Grafana UI
# 1. Go to Dashboards → Import
# 2. Upload JSON files from:
#    - observability/grafana/dashboards/predictive-suite-platform-health.json
#    - observability/grafana/dashboards/predictive-suite-forecasts.json

# Via API
curl -X POST http://localhost:3000/api/dashboards/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GRAFANA_API_KEY" \
  -d @observability/grafana/dashboards/predictive-suite-platform-health.json
```

5. **Run as systemd service (optional):**

Create `/etc/systemd/system/predictive-suite.service`:

```ini
[Unit]
Description=Predictive Threat Suite API
After=network.target

[Service]
Type=simple
User=summit
WorkingDirectory=/home/user/summit/predictive_threat_suite
ExecStart=/usr/bin/uvicorn api_service:app --host 0.0.0.0 --port 8091 --workers 4
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable predictive-suite
sudo systemctl start predictive-suite
sudo systemctl status predictive-suite
```

---

## 4. Integration with Existing Summit Infrastructure

### Connecting to Summit's Prometheus

1. **Update Summit's Prometheus config** to scrape the predictive suite:

```yaml
# Add to /home/user/summit/observability/prometheus.yml
scrape_configs:
  # ... existing jobs

  - job_name: 'predictive-suite'
    scrape_interval: 15s
    static_configs:
      - targets:
          - 'predictive-forecasting:8091'  # If in same Docker network
          # OR
          - 'localhost:8091'  # If running on same host
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        replacement: 'predictive-suite'
```

2. **Reload Summit's Prometheus:**

```bash
cd /home/user/summit/observability
docker-compose restart prometheus
```

### Connecting to Summit's Grafana

1. **Copy dashboard files to Summit's Grafana:**

```bash
cp observability/grafana/dashboards/predictive-suite-*.json \
   /home/user/summit/observability/grafana/dashboards/
```

2. **Reload Grafana:**

```bash
cd /home/user/summit/observability
docker-compose restart grafana
```

3. **Or use Grafana's provisioning:**

Add to `/home/user/summit/observability/grafana/provisioning/dashboards/dashboard.yml`:

```yaml
apiVersion: 1

providers:
  - name: 'Predictive Suite'
    folder: 'Predictive Suite'
    type: file
    options:
      path: /etc/grafana/provisioning/dashboards/predictive-suite
```

---

## 5. Production Deployment Checklist

### Security

- [ ] Enable authentication (API keys or OAuth)
- [ ] Configure TLS/HTTPS
- [ ] Set up network policies (if Kubernetes)
- [ ] Enable firewall rules
- [ ] Configure CORS if needed

### Performance

- [ ] Set resource limits (CPU, memory)
- [ ] Configure horizontal pod autoscaling (HPA) if Kubernetes
- [ ] Enable caching for frequently-requested forecasts
- [ ] Tune worker count based on load

### Reliability

- [ ] Configure liveness and readiness probes
- [ ] Set up health check monitoring
- [ ] Configure automatic restarts on failure
- [ ] Set up log aggregation (ELK, Loki)
- [ ] Configure distributed tracing (Jaeger, Tempo)

### Observability

- [ ] Import Grafana dashboards
- [ ] Set up alerting rules
- [ ] Configure alert routing (PagerDuty, Slack)
- [ ] Enable query logging
- [ ] Set up SLO tracking

### Data Management

- [ ] Configure data retention policies
- [ ] Set up backup/restore procedures
- [ ] Configure persistent storage (if needed)
- [ ] Implement data archival strategy

---

## 6. Scaling Considerations

### Horizontal Scaling

The service is stateless and can be scaled horizontally:

```bash
# Docker Compose
docker-compose up -d --scale predictive-forecasting=3

# Kubernetes
kubectl scale deployment predictive-forecasting --replicas=5 -n predictive-suite
```

### Load Balancing

- Use service mesh (Istio, Linkerd) for advanced routing
- Configure session affinity if needed (though service is stateless)
- Enable connection pooling

### Performance Tuning

```python
# In api_service.py, adjust:
- uvicorn workers (CPU-bound tasks)
- asyncio task concurrency
- Model caching TTL
- Batch processing size
```

---

## 7. Monitoring Deployment

### Key Metrics to Watch

```promql
# Request rate
rate(predictive_http_requests_total[5m])

# Error rate
rate(predictive_http_requests_total{status="500"}[5m]) / rate(predictive_http_requests_total[5m])

# Latency
histogram_quantile(0.95, rate(predictive_http_request_duration_seconds_bucket[5m]))

# Resource usage
process_resident_memory_bytes
process_cpu_seconds_total
```

### Alerts to Configure

```yaml
groups:
  - name: predictive-suite
    rules:
      - alert: PredictiveSuiteDown
        expr: up{job="predictive-forecasting"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Predictive Suite is down"

      - alert: HighErrorRate
        expr: rate(predictive_http_requests_total{status="500"}[5m]) / rate(predictive_http_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate in Predictive Suite"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(predictive_http_request_duration_seconds_bucket[5m])) > 1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High latency in Predictive Suite"
```

---

## 8. Troubleshooting Deployment

### Logs

```bash
# Docker Compose
docker-compose logs -f predictive-forecasting

# Kubernetes
kubectl logs -f deployment/predictive-forecasting -n predictive-suite

# Systemd
journalctl -u predictive-suite -f
```

### Common Issues

**Issue: Container won't start**
```bash
# Check logs
docker-compose logs predictive-forecasting

# Common causes:
# - Missing dependencies
# - Port conflicts
# - Volume mount issues
```

**Issue: Prometheus not scraping**
```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Verify metrics endpoint
curl http://localhost:8091/metrics

# Check network connectivity
docker-compose exec prometheus ping predictive-forecasting
```

**Issue: High memory usage**
```bash
# Monitor memory
docker stats predictive-forecasting

# Reduce workers or add memory limits
# Edit docker-compose.yml:
services:
  predictive-forecasting:
    mem_limit: 1g
```

---

## 9. Backup & Restore

### Backup

```bash
# Backup configuration
tar -czf predictive-suite-config-$(date +%Y%m%d).tar.gz \
  docker-compose.yml \
  prometheus.yml \
  grafana-provisioning/

# Backup Prometheus data (if using local volumes)
docker run --rm \
  -v predictive_threat_suite_prometheus-data:/data \
  -v $(pwd):/backup \
  alpine tar -czf /backup/prometheus-data-$(date +%Y%m%d).tar.gz /data

# Backup Grafana data
docker run --rm \
  -v predictive_threat_suite_grafana-data:/data \
  -v $(pwd):/backup \
  alpine tar -czf /backup/grafana-data-$(date +%Y%m%d).tar.gz /data
```

### Restore

```bash
# Restore configuration
tar -xzf predictive-suite-config-20251120.tar.gz

# Restore Prometheus data
docker run --rm \
  -v predictive_threat_suite_prometheus-data:/data \
  -v $(pwd):/backup \
  alpine tar -xzf /backup/prometheus-data-20251120.tar.gz -C /

# Restart services
docker-compose up -d
```

---

## 10. Upgrading

### Rolling Update (Kubernetes)

```bash
# Update image
kubectl set image deployment/predictive-forecasting \
  forecasting=summit/predictive-suite:beta \
  -n predictive-suite

# Check rollout status
kubectl rollout status deployment/predictive-forecasting -n predictive-suite

# Rollback if needed
kubectl rollout undo deployment/predictive-forecasting -n predictive-suite
```

### Blue-Green Deployment

```bash
# Deploy new version alongside old
kubectl apply -f k8s-deployment-green.yml

# Test new version
kubectl port-forward svc/predictive-forecasting-green 8092:8091

# Switch traffic
kubectl patch service predictive-forecasting \
  -p '{"spec":{"selector":{"version":"green"}}}'

# Remove old version
kubectl delete -f k8s-deployment-blue.yml
```

---

## Support

For deployment issues or questions, contact the observability team or refer to:
- [README.md](./README.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [Summit Observability Docs](../docs/observability/)
