# Summit Deployment Guide

> **Version**: 1.0.0
> **Last Updated**: 2025-11-20
> **Audience**: DevOps Engineers, SREs, Platform Teams

## Table of Contents

1. [Overview](#overview)
2. [Deployment Strategies](#deployment-strategies)
3. [Infrastructure Setup](#infrastructure-setup)
4. [Docker Image Optimization](#docker-image-optimization)
5. [Kubernetes Deployment](#kubernetes-deployment)
6. [Helm Charts](#helm-charts)
7. [Blue-Green Deployments](#blue-green-deployments)
8. [Canary Deployments](#canary-deployments)
9. [Rollback Procedures](#rollback-procedures)
10. [Monitoring and Observability](#monitoring-and-observability)
11. [Troubleshooting](#troubleshooting)
12. [Best Practices](#best-practices)

---

## Overview

Summit/IntelGraph uses modern deployment strategies to ensure zero-downtime deployments, automated rollbacks, and high availability. This guide covers all aspects of deploying and operating the platform.

### Key Features

- ✅ **Zero-downtime deployments** with blue-green and canary strategies
- ✅ **Automated rollback** based on health checks and metrics
- ✅ **Optimized Docker images** with multi-stage builds and caching
- ✅ **Infrastructure as Code** with Terraform and Kubernetes
- ✅ **Comprehensive monitoring** with Prometheus and Grafana
- ✅ **Progressive delivery** with automated canary analysis

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Users                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   Ingress / Load Balancer                    │
│              (AWS ALB / Istio Gateway)                       │
└────────────────────┬────────────────────────────────────────┘
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
┌──────────────────┐  ┌──────────────────┐
│  Active/Stable   │  │  Preview/Canary  │
│   Deployment     │  │   Deployment     │
└──────┬───────────┘  └──────┬───────────┘
       │                     │
       └──────────┬──────────┘
                  │
       ┌──────────┴──────────┐
       │                     │
       ▼                     ▼
┌──────────────┐      ┌──────────────┐
│   Neo4j      │      │  PostgreSQL  │
│   Database   │      │   Database   │
└──────────────┘      └──────────────┘
```

---

## Deployment Strategies

Summit supports three deployment strategies:

### 1. Standard Deployment

- Traditional rolling update
- Simple and fast
- Minimal complexity
- Use for: Development environments

### 2. Blue-Green Deployment

- Two identical environments (blue and green)
- Instant traffic switch
- Easy rollback
- Use for: Production critical updates

### 3. Canary Deployment

- Progressive traffic shifting (5% → 10% → 25% → 50% → 75% → 100%)
- Automated analysis at each step
- Automatic rollback on failure
- Use for: Production regular updates

---

## Infrastructure Setup

### Prerequisites

```bash
# Required tools
- kubectl >= 1.28
- helm >= 3.13
- docker >= 24.0
- terraform >= 1.6 (optional)
- argo-rollouts CLI (for canary/blue-green)
```

### Install Argo Rollouts

```bash
# Install Argo Rollouts controller
kubectl create namespace argo-rollouts
kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml

# Install Argo Rollouts CLI
brew install argoproj/tap/kubectl-argo-rollouts  # macOS
# or
curl -LO https://github.com/argoproj/argo-rollouts/releases/latest/download/kubectl-argo-rollouts-linux-amd64
chmod +x kubectl-argo-rollouts-linux-amd64
sudo mv kubectl-argo-rollouts-linux-amd64 /usr/local/bin/kubectl-argo-rollouts
```

### Setup Kubernetes Cluster

```bash
# AWS EKS
eksctl create cluster -f infra/eks-baseline/cluster.yaml

# Verify cluster
kubectl cluster-info
kubectl get nodes
```

---

## Docker Image Optimization

### Building Optimized Images

Summit includes an optimized Dockerfile with the following features:

- **Multi-stage builds** for minimal image size
- **BuildKit cache mounts** for faster builds
- **pnpm caching** for dependency management
- **Distroless/Chainguard base** for security
- **Layer optimization** for better caching

#### Build Script

```bash
# Build optimized image
./scripts/build-optimized-docker.sh \
  --version v1.2.3 \
  --push

# Build for specific platform
./scripts/build-optimized-docker.sh \
  --version v1.2.3 \
  --platforms linux/amd64

# Build without cache (clean build)
./scripts/build-optimized-docker.sh \
  --version v1.2.3 \
  --no-cache

# Build with custom build args
./scripts/build-optimized-docker.sh \
  --version v1.2.3 \
  --build-arg API_BASE_URL=https://api.prod.example.com \
  --build-arg TURBO_TOKEN=$TURBO_TOKEN
```

#### Manual Docker Build

```bash
# With BuildKit
DOCKER_BUILDKIT=1 docker build \
  --build-arg API_BASE_URL=https://api.example.com \
  --target runtime \
  -t summit:latest \
  -f Dockerfile.optimized .

# With cache
docker buildx build \
  --cache-from type=registry,ref=ghcr.io/brianclong/summit:cache \
  --cache-to type=registry,ref=ghcr.io/brianclong/summit:cache,mode=max \
  -t summit:latest \
  -f Dockerfile.optimized .
```

### Image Size Comparison

| Build Type | Image Size | Build Time |
|-----------|-----------|------------|
| Original Dockerfile | ~2.5 GB | ~15 min |
| Optimized Multi-stage | ~450 MB | ~10 min |
| With BuildKit Cache | ~450 MB | ~3 min |

---

## Kubernetes Deployment

### Namespace Setup

```bash
# Create production namespace
kubectl create namespace intelgraph-prod

# Create secrets
kubectl create secret generic summit-secrets \
  --from-env-file=.env.production \
  -n intelgraph-prod

# Create configmap
kubectl create configmap summit-config \
  --from-file=config/ \
  -n intelgraph-prod
```

### Standard Deployment

```bash
# Apply standard deployment
kubectl apply -f k8s/deployments/standard-deployment.yaml

# Check status
kubectl get deployments -n intelgraph-prod
kubectl get pods -n intelgraph-prod

# Watch rollout
kubectl rollout status deployment/summit -n intelgraph-prod
```

---

## Helm Charts

### Install with Helm

```bash
# Add dependencies
helm repo add neo4j https://neo4j.github.io/helm-charts/
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Install Summit chart
helm install summit ./helm/summit \
  --namespace intelgraph-prod \
  --create-namespace \
  --values ./helm/summit/values-production.yaml

# Verify installation
helm status summit -n intelgraph-prod
helm get values summit -n intelgraph-prod
```

### Upgrade with Helm

```bash
# Standard upgrade
helm upgrade summit ./helm/summit \
  --namespace intelgraph-prod \
  --set image.tag=v1.2.3 \
  --wait

# With custom values
helm upgrade summit ./helm/summit \
  --namespace intelgraph-prod \
  --values ./helm/summit/values-production.yaml \
  --set image.tag=v1.2.3 \
  --wait
```

### Helm Values Configuration

Key configuration options in `values.yaml`:

```yaml
# Deployment strategy
deploymentStrategy: canary  # standard, blue-green, canary

# Image
image:
  repository: ghcr.io/brianclong/summit
  tag: v1.2.3

# Replicas
replicaCount: 5

# Resources
resources:
  requests:
    cpu: 500m
    memory: 1Gi
  limits:
    cpu: 2000m
    memory: 4Gi

# Autoscaling
autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 20

# Canary configuration
canary:
  enabled: true
  steps:
    - weight: 5
      pause: 5m
    - weight: 10
      pause: 5m
    - weight: 25
      pause: 10m
```

---

## Blue-Green Deployments

Blue-green deployment maintains two identical environments and switches traffic between them.

### Deploy Blue-Green

```bash
# Apply blue-green rollout
kubectl apply -f k8s/deployments/blue-green-strategy.yaml

# Check rollout status
kubectl argo rollouts get rollout summit-rollout -n intelgraph-prod

# Watch rollout
kubectl argo rollouts get rollout summit-rollout -n intelgraph-prod --watch
```

### Promote to Active

```bash
# Promote preview to active (manual)
kubectl argo rollouts promote summit-rollout -n intelgraph-prod

# Check active service
kubectl get svc summit-active -n intelgraph-prod
```

### Rollback Blue-Green

```bash
# Rollback to previous version
kubectl argo rollouts undo summit-rollout -n intelgraph-prod

# Verify rollback
kubectl argo rollouts status summit-rollout -n intelgraph-prod
```

### Blue-Green Flow

```
1. Deploy new version (green) → Preview service
2. Run automated analysis
   ├─ Health checks
   ├─ Error rate validation
   ├─ Latency checks
   └─ Smoke tests
3. Manual promotion decision
4. Switch traffic → Green becomes active
5. Keep blue for quick rollback
6. Scale down blue after delay
```

---

## Canary Deployments

Canary deployment gradually shifts traffic from stable to canary version with automated analysis.

### Deploy Canary

```bash
# Apply canary rollout
kubectl apply -f k8s/deployments/canary-strategy.yaml

# Update image to trigger canary
kubectl argo rollouts set image summit-canary-rollout \
  summit=ghcr.io/brianclong/summit:v1.2.3 \
  -n intelgraph-prod

# Watch canary progression
kubectl argo rollouts get rollout summit-canary-rollout -n intelgraph-prod --watch
```

### Canary Progression

The canary follows these steps:

1. **5% traffic** → 5 min pause → Analysis
2. **10% traffic** → 5 min pause → Analysis
3. **25% traffic** → 10 min pause → Analysis
4. **50% traffic** → 10 min pause → Analysis
5. **75% traffic** → 10 min pause → Analysis
6. **100% traffic** → Full rollout

### Manual Canary Control

```bash
# Promote canary (skip analysis)
kubectl argo rollouts promote summit-canary-rollout -n intelgraph-prod

# Abort canary (rollback immediately)
kubectl argo rollouts abort summit-canary-rollout -n intelgraph-prod

# Pause canary
kubectl argo rollouts pause summit-canary-rollout -n intelgraph-prod

# Resume canary
kubectl argo rollouts resume summit-canary-rollout -n intelgraph-prod
```

### Canary Analysis

Automated analysis checks at each step:

- **Health checks**: Endpoint availability
- **Error rate**: < 2% (5xx responses)
- **Latency**: P95 < 500ms, P99 < 1000ms
- **Comparison**: Canary vs Stable metrics
- **Business metrics**: API success rate, DB connections
- **Resource usage**: CPU and memory within limits

### Using the Rollback Script

```bash
# Deploy canary with script
./scripts/rollback-deployment.sh canary-deploy v1.2.3

# Promote canary
./scripts/rollback-deployment.sh canary-promote

# Abort canary
./scripts/rollback-deployment.sh canary-abort

# Check status
./scripts/rollback-deployment.sh status
```

---

## Rollback Procedures

### Automated Rollback

The automated rollback system continuously monitors deployments and rolls back on failure.

#### Start Monitoring

```bash
# Start automated monitoring
./scripts/automated-rollback-system.sh monitor \
  --namespace intelgraph-prod \
  --interval 30 \
  --error-threshold 0.05 \
  --slack-webhook $SLACK_WEBHOOK
```

#### Configuration

Key thresholds:

- **Error rate**: < 5% (configurable)
- **Latency**: P95 < 1000ms (configurable)
- **Consecutive failures**: 3 checks
- **Health check interval**: 30 seconds

#### Rollback Triggers

Automatic rollback occurs when:

- Health endpoint returns non-200 status
- Error rate exceeds threshold
- Latency exceeds threshold
- Pod restart count is high
- Consecutive health check failures

### Manual Rollback

#### Using Helm

```bash
# Rollback to previous release
helm rollback summit -n intelgraph-prod

# Rollback to specific revision
helm rollback summit 5 -n intelgraph-prod

# List revisions
helm history summit -n intelgraph-prod
```

#### Using Kubectl

```bash
# Rollback deployment
kubectl rollout undo deployment/summit -n intelgraph-prod

# Rollback to specific revision
kubectl rollout undo deployment/summit --to-revision=3 -n intelgraph-prod

# Check rollout history
kubectl rollout history deployment/summit -n intelgraph-prod
```

#### Using Argo Rollouts

```bash
# Undo rollout
kubectl argo rollouts undo summit-rollout -n intelgraph-prod

# Rollback to specific revision
kubectl argo rollouts undo summit-rollout --to-revision=5 -n intelgraph-prod
```

### Rollback Verification

After rollback, verify:

```bash
# Check deployment status
kubectl get deployment summit -n intelgraph-prod

# Check pod status
kubectl get pods -n intelgraph-prod -l app=summit

# Check health endpoint
curl https://api.summit.example.com/health

# Check metrics
./scripts/automated-rollback-system.sh check
```

---

## Monitoring and Observability

### Prometheus Metrics

Key metrics to monitor:

```promql
# Error rate
sum(rate(http_requests_total{service="summit",status=~"5.."}[5m])) /
sum(rate(http_requests_total{service="summit"}[5m]))

# P95 latency
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket{service="summit"}[5m])) by (le)
)

# Pod restart count
sum(kube_pod_container_status_restarts_total{namespace="intelgraph-prod",pod=~"summit-.*"})

# Memory usage
avg(container_memory_usage_bytes{pod=~"summit-.*",container="summit"}) / 1024 / 1024 / 1024
```

### Grafana Dashboards

Pre-built dashboards available:

- **Deployment Overview**: Replica count, status, uptime
- **Application Metrics**: Request rate, error rate, latency
- **Resource Usage**: CPU, memory, network
- **Canary Analysis**: Canary vs Stable comparison

### Alerts

Key alerts configured:

- **HighErrorRate**: Error rate > 5% for 5 minutes
- **HighLatency**: P95 latency > 1000ms for 5 minutes
- **DeploymentFailed**: Deployment not progressing
- **PodCrashLooping**: Pod restarting frequently
- **HighMemoryUsage**: Memory usage > 90%

### Viewing Logs

```bash
# View pod logs
kubectl logs -f deployment/summit -n intelgraph-prod

# View logs for specific pod
kubectl logs summit-xxx-yyy -n intelgraph-prod --tail=100

# View previous logs (after crash)
kubectl logs summit-xxx-yyy -n intelgraph-prod --previous
```

---

## Troubleshooting

### Common Issues

#### 1. Deployment Stuck in Progress

```bash
# Check rollout status
kubectl rollout status deployment/summit -n intelgraph-prod

# Check events
kubectl get events -n intelgraph-prod --sort-by='.lastTimestamp'

# Describe deployment
kubectl describe deployment summit -n intelgraph-prod

# Check pod errors
kubectl get pods -n intelgraph-prod -l app=summit
kubectl describe pod summit-xxx-yyy -n intelgraph-prod
```

**Solution**: Check image pull errors, resource constraints, or health check failures.

#### 2. High Error Rate

```bash
# Check application logs
kubectl logs -f deployment/summit -n intelgraph-prod | grep ERROR

# Check database connectivity
kubectl exec -it summit-xxx-yyy -n intelgraph-prod -- curl neo4j:7687

# Check prometheus metrics
./scripts/automated-rollback-system.sh check
```

**Solution**: Verify database connections, external service availability, or configuration issues.

#### 3. Canary Not Progressing

```bash
# Check rollout status
kubectl argo rollouts get rollout summit-canary-rollout -n intelgraph-prod

# Check analysis runs
kubectl get analysisrun -n intelgraph-prod

# Describe analysis run
kubectl describe analysisrun summit-canary-rollout-xxx -n intelgraph-prod
```

**Solution**: Check if analysis is failing due to high error rates or latency.

#### 4. Rollback Failed

```bash
# Check helm history
helm history summit -n intelgraph-prod

# Manual rollback to known good version
helm rollback summit 5 -n intelgraph-prod --force

# Verify rollback
helm status summit -n intelgraph-prod
```

### Debug Commands

```bash
# Get all resources
kubectl get all -n intelgraph-prod

# Check resource usage
kubectl top pods -n intelgraph-prod
kubectl top nodes

# Check network policies
kubectl get networkpolicy -n intelgraph-prod

# Check service endpoints
kubectl get endpoints summit -n intelgraph-prod

# Port forward for local testing
kubectl port-forward svc/summit 3000:80 -n intelgraph-prod
```

---

## Best Practices

### 1. Deployment Strategy Selection

- **Development**: Standard rolling update
- **Staging**: Canary with aggressive thresholds
- **Production**: Canary with conservative thresholds
- **Critical updates**: Blue-green with manual promotion

### 2. Image Management

- Always use specific version tags (not `latest`)
- Tag images with git SHA for traceability
- Use immutable tags in production
- Scan images for vulnerabilities before deployment

### 3. Resource Management

- Set appropriate resource requests and limits
- Use HPA for automatic scaling
- Configure PodDisruptionBudget for availability
- Use topology spread constraints for zone distribution

### 4. Health Checks

- Implement separate `/health/live`, `/health/ready`, `/health/startup`
- Keep health checks lightweight
- Set appropriate timeout values
- Monitor health check metrics

### 5. Monitoring

- Set up alerts for key metrics
- Use SLOs to define success criteria
- Monitor both technical and business metrics
- Set up dashboards for different audiences

### 6. Rollback Strategy

- Enable automated rollback in production
- Test rollback procedures regularly
- Keep rollback documentation updated
- Maintain deployment history

### 7. Security

- Use non-root containers
- Implement network policies
- Use read-only root filesystems
- Scan images for vulnerabilities
- Rotate secrets regularly

### 8. Testing

- Test deployments in staging first
- Run smoke tests after deployment
- Validate canary analysis thresholds
- Practice incident response

---

## Quick Reference

### Essential Commands

```bash
# Deploy new version
helm upgrade summit ./helm/summit --set image.tag=v1.2.3

# Rollback
helm rollback summit

# Check status
kubectl argo rollouts get rollout summit-rollout

# View logs
kubectl logs -f deployment/summit

# Run health check
./scripts/automated-rollback-system.sh check

# Start monitoring
./scripts/automated-rollback-system.sh monitor
```

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Deploy to Kubernetes
  run: |
    helm upgrade summit ./helm/summit \
      --namespace intelgraph-prod \
      --set image.tag=${{ github.sha }} \
      --set deploymentStrategy=canary \
      --wait --timeout 30m

- name: Monitor deployment
  run: |
    ./scripts/automated-rollback-system.sh check \
      --namespace intelgraph-prod
```

---

## Support and Resources

### Documentation

- [CLAUDE.md](../CLAUDE.md) - Project overview and conventions
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
- [DEVELOPER_ONBOARDING.md](DEVELOPER_ONBOARDING.md) - Developer guide

### External Resources

- [Argo Rollouts](https://argoproj.github.io/argo-rollouts/)
- [Kubernetes Docs](https://kubernetes.io/docs/)
- [Helm Docs](https://helm.sh/docs/)
- [Prometheus](https://prometheus.io/docs/)

### Getting Help

- GitHub Issues: https://github.com/BrianCLong/summit/issues
- Internal Slack: #summit-deployment
- Runbooks: [RUNBOOKS/](../RUNBOOKS/)

---

**Last Updated**: 2025-11-20
**Document Version**: 1.0.0
**Maintained By**: Summit Platform Team
