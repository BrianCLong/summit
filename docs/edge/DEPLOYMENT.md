# Edge Computing Platform Deployment Guide

## Prerequisites

### System Requirements

**Edge Orchestrator:**
- CPU: 2+ cores
- RAM: 4GB minimum, 8GB recommended
- Storage: 20GB+ for models and data
- OS: Linux (Ubuntu 20.04+ recommended)
- Docker 20.10+

**Edge Node:**
- CPU: 1+ cores
- RAM: 2GB minimum
- Storage: 10GB+
- OS: Linux, Windows, or macOS
- Docker (for container-based workloads)

### Software Dependencies

- Node.js 18+
- pnpm 9+
- Docker and Docker Compose
- kubectl (for Kubernetes deployments)
- Helm (optional, for Kubernetes package management)

## Installation

### 1. Clone and Build

```bash
# Clone repository
git clone https://github.com/yourusername/summit.git
cd summit

# Install dependencies
pnpm install

# Build packages
pnpm --filter @intelgraph/edge-computing build
pnpm --filter @intelgraph/edge-runtime build
pnpm --filter @intelgraph/edge-ai build
pnpm --filter @intelgraph/federated-learning build
pnpm --filter @intelgraph/edge-sync build

# Build services
pnpm --filter @intelgraph/edge-orchestrator build
pnpm --filter @intelgraph/edge-gateway build
```

### 2. Configuration

Create environment files for each service:

**services/edge-orchestrator/.env**
```env
PORT=8080
NODE_ENV=production
CLOUD_ENDPOINT=https://your-cloud-endpoint.com
LOG_LEVEL=info
```

**services/edge-gateway/.env**
```env
PORT=3000
NODE_ENV=production
ORCHESTRATOR_URL=http://localhost:8080
JWT_SECRET=your-secret-key-here
ALLOWED_ORIGINS=*
```

### 3. Docker Compose Deployment

```bash
cd infrastructure/edge-deployment

# Pull images (if using pre-built images)
docker-compose pull

# Build images locally
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

**Exposed Ports:**
- 3000: Edge Gateway
- 8080: Edge Orchestrator
- 9090: Prometheus
- 3001: Grafana

### 4. Kubernetes Deployment

#### Using kubectl

```bash
cd infrastructure/edge-deployment/kubernetes

# Create namespace
kubectl create namespace edge-computing

# Apply configurations
kubectl apply -f edge-orchestrator.yaml
kubectl apply -f edge-gateway.yaml

# Check deployment status
kubectl get pods -n edge-computing
kubectl get services -n edge-computing

# View logs
kubectl logs -f deployment/edge-orchestrator -n edge-computing
```

#### Using Helm (if available)

```bash
helm install edge-platform ./helm-chart \
  --namespace edge-computing \
  --create-namespace \
  --set gateway.replicas=2 \
  --set orchestrator.replicas=3
```

### 5. Verify Deployment

```bash
# Health check
curl http://localhost:3000/health
curl http://localhost:8080/health

# Check metrics
curl http://localhost:8080/metrics

# Grafana dashboard
# Navigate to http://localhost:3001
# Default credentials: admin/admin
```

## Edge Node Setup

### 1. Register Edge Node

```bash
# Using curl
curl -X POST http://localhost:3000/api/orchestrator/nodes/register \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {
      "name": "edge-node-01",
      "type": "edge_server",
      "status": "online",
      "health": "healthy",
      "version": "1.0.0",
      "location": {
        "latitude": 37.7749,
        "longitude": -122.4194,
        "city": "San Francisco",
        "region": "CA",
        "country": "US"
      },
      "capacity": {
        "cpu": { "cores": 4, "frequency": 2400, "utilization": 20 },
        "memory": { "total": 8589934592, "available": 6871947673, "utilization": 20 },
        "storage": { "total": 107374182400, "available": 85899345920, "utilization": 20 },
        "network": { "bandwidth": 1000000000, "latency": 5, "packetLoss": 0.1 }
      },
      "tags": { "environment": "production", "region": "us-west" }
    },
    "config": {
      "endpoints": {
        "api": "http://edge-node-01:8080",
        "metrics": "http://edge-node-01:9090",
        "logs": "http://edge-node-01:5000",
        "sync": "http://edge-node-01:7000"
      },
      "authentication": {
        "type": "jwt",
        "credentials": { "token": "node-token" }
      },
      "features": {
        "aiInference": true,
        "federatedLearning": true,
        "edgeAnalytics": true,
        "offline": true
      },
      "limits": {
        "maxConcurrentJobs": 10,
        "maxMemoryUsage": 6871947673,
        "maxStorageUsage": 85899345920
      },
      "sync": {
        "interval": 300,
        "priority": "medium",
        "bandwidth": 100000000
      }
    }
  }'
```

### 2. Deploy Container to Edge Node

```bash
curl -X POST http://localhost:3000/api/orchestrator/deployments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "image": "nginx:alpine",
    "name": "test-container",
    "ports": [{ "container": 80, "host": 8081 }],
    "env": { "ENV": "production" },
    "memory": 536870912,
    "cpus": 0.5,
    "restartPolicy": "unless-stopped",
    "healthCheck": {
      "test": ["CMD", "wget", "-q", "--spider", "http://localhost"],
      "interval": 30,
      "timeout": 5,
      "retries": 3
    }
  }'
```

### 3. Run Inference

```bash
# Register model
curl -X POST http://localhost:3000/api/orchestrator/inference/models \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {
      "id": "model-001",
      "name": "image-classifier",
      "version": "1.0.0",
      "format": "onnx",
      "precision": "fp32",
      "inputShape": [1, 3, 224, 224],
      "outputShape": [1, 1000],
      "size": 102400000,
      "accelerator": "cpu"
    }
  }'

# Run inference
curl -X POST http://localhost:3000/api/orchestrator/inference/infer \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "modelId": "model-001",
    "input": { "data": "base64_encoded_image" },
    "options": { "priority": "high", "timeout": 5000 }
  }'
```

### 4. Start Federated Learning

```bash
# Initialize federated learning
curl -X POST http://localhost:3000/api/orchestrator/federated/initialize \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": { "weights": "initial_model_weights" }
  }'

# Start training round
curl -X POST http://localhost:3000/api/orchestrator/federated/rounds/start \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "availableNodes": ["node-01", "node-02", "node-03"]
  }'
```

## Monitoring and Observability

### Prometheus Metrics

Access Prometheus at http://localhost:9090

**Key Metrics:**
- `edge_nodes_total`: Total number of registered nodes
- `edge_nodes_online`: Number of online nodes
- `edge_inference_latency`: Inference latency histogram
- `edge_sync_operations_total`: Total sync operations
- `edge_container_cpu_usage`: Container CPU usage

### Grafana Dashboards

Access Grafana at http://localhost:3001

**Pre-configured Dashboards:**
1. Edge Infrastructure Overview
2. Node Health and Resources
3. Inference Performance
4. Federated Learning Progress
5. Sync Operations

### Log Aggregation

Logs are collected from:
- Edge Gateway: `/var/log/edge-gateway`
- Edge Orchestrator: `/var/log/edge-orchestrator`
- Edge Nodes: `/var/log/edge`

View logs:
```bash
# Docker Compose
docker-compose logs -f edge-orchestrator

# Kubernetes
kubectl logs -f deployment/edge-orchestrator -n edge-computing
```

## Backup and Recovery

### Backup Persistent Data

```bash
# Docker volumes
docker run --rm \
  -v edge-deployment_edge-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/edge-data-$(date +%Y%m%d).tar.gz -C /data .

# Kubernetes PVCs
kubectl exec -n edge-computing deployment/edge-orchestrator -- \
  tar czf - /var/lib/edge/data | \
  cat > edge-data-backup-$(date +%Y%m%d).tar.gz
```

### Restore from Backup

```bash
# Docker
docker run --rm \
  -v edge-deployment_edge-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/edge-data-20240101.tar.gz -C /data

# Kubernetes
kubectl exec -n edge-computing deployment/edge-orchestrator -- \
  tar xzf - -C /var/lib/edge/data < edge-data-backup-20240101.tar.gz
```

## Scaling

### Horizontal Scaling

**Add More Orchestrator Replicas:**
```bash
# Kubernetes
kubectl scale deployment edge-orchestrator --replicas=5 -n edge-computing

# Docker Compose
docker-compose up -d --scale edge-orchestrator=3
```

**Add More Edge Nodes:**
Simply register additional nodes using the registration API.

### Vertical Scaling

Update resource limits in deployment configurations:

```yaml
# Kubernetes
resources:
  requests:
    memory: "1Gi"
    cpu: "1000m"
  limits:
    memory: "4Gi"
    cpu: "4000m"
```

## Troubleshooting

### Common Issues

**1. Node Not Connecting**
- Check network connectivity
- Verify authentication credentials
- Check firewall rules
- Review node logs

**2. High Inference Latency**
- Check model size and optimization
- Verify available resources
- Monitor network latency
- Consider model quantization

**3. Sync Failures**
- Check network connectivity to cloud
- Verify bandwidth limits
- Review retry configuration
- Check disk space

**4. Container Deployment Failures**
- Verify Docker is running
- Check image availability
- Review resource limits
- Check container logs

### Debug Mode

Enable debug logging:
```bash
# Environment variable
export LOG_LEVEL=debug

# Or in .env file
LOG_LEVEL=debug
```

## Security Hardening

1. **Change Default Secrets**: Update JWT_SECRET and other credentials
2. **Enable TLS**: Configure HTTPS for all endpoints
3. **Restrict CORS**: Limit allowed origins
4. **Network Policies**: Use Kubernetes NetworkPolicies
5. **Regular Updates**: Keep dependencies and images updated
6. **Audit Logging**: Enable comprehensive audit logs

## Performance Tuning

1. **Adjust Worker Pool Size**: Tune concurrent operations
2. **Model Caching**: Configure appropriate cache sizes
3. **Batch Size**: Optimize inference batch sizes
4. **Sync Interval**: Balance freshness vs. bandwidth
5. **Resource Limits**: Set appropriate CPU/memory limits

## Support

For issues and questions:
- GitHub Issues: https://github.com/yourusername/summit/issues
- Documentation: https://docs.intelgraph.ai/edge
- Email: support@intelgraph.ai
