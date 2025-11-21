# Container Best Practices and Orchestration Guide

> **Last Updated**: 2025-11-20
> **Purpose**: Comprehensive guide for container optimization, security, and orchestration in the Summit/IntelGraph platform

## Table of Contents

1. [Overview](#overview)
2. [Dockerfile Best Practices](#dockerfile-best-practices)
3. [Container Security](#container-security)
4. [Kubernetes Orchestration](#kubernetes-orchestration)
5. [Health Checks](#health-checks)
6. [Autoscaling Strategies](#autoscaling-strategies)
7. [Resource Management](#resource-management)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [CI/CD Integration](#cicd-integration)

---

## Overview

This document provides best practices for containerization and orchestration of the Summit/IntelGraph platform. Our container strategy focuses on:

- **Multi-stage builds** for minimal image sizes
- **Security hardening** with non-root users and distroless images
- **Layer caching optimization** for faster builds
- **Comprehensive health checks** for reliability
- **Advanced autoscaling** with custom metrics
- **Resource quotas and limits** for stability

---

## Dockerfile Best Practices

### 1. Multi-Stage Builds

**Why**: Reduce image size, separate build and runtime dependencies, improve security.

**Example**:
```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
```

### 2. Layer Caching Optimization

**Why**: Faster builds by reusing cached layers.

**Best Practices**:
- Copy `package.json` and lock files **before** source code
- Combine RUN commands where possible
- Put frequently changing files at the end

**Example**:
```dockerfile
# ✅ Good - leverages cache
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .

# ❌ Bad - invalidates cache on every source change
COPY . .
RUN pnpm install
```

### 3. Security Hardening

**Best Practices**:

#### Use Specific Version Tags
```dockerfile
# ✅ Good
FROM node:20.11.0-alpine3.19

# ❌ Bad
FROM node:latest
```

#### Run as Non-Root User
```dockerfile
# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001 -G nodejs

# Switch to non-root user
USER 1001:1001
```

#### Use Distroless Images for Production
```dockerfile
FROM gcr.io/distroless/nodejs20-debian12:nonroot
USER 65532:65532
COPY --from=builder --chown=65532:65532 /app /app
CMD ["index.js"]
```

#### Read-Only Root Filesystem
```dockerfile
# In Dockerfile
RUN chmod -R 555 /app

# In Kubernetes
securityContext:
  readOnlyRootFilesystem: true
```

### 4. Image Metadata and Labels

```dockerfile
LABEL org.opencontainers.image.source="https://github.com/BrianCLong/summit" \
      org.opencontainers.image.title="intelgraph-api" \
      org.opencontainers.image.version="1.24.0" \
      org.opencontainers.image.description="AI-augmented intelligence analysis platform" \
      security.scan="trivy" \
      security.distroless="true" \
      security.nonroot="true"
```

### 5. Health Checks in Dockerfile

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:4000/health || exit 1
```

### 6. Minimize Layer Count

```dockerfile
# ✅ Good - single layer
RUN apk add --no-cache curl wget && \
    wget https://example.com/file && \
    tar xzf file && \
    rm file

# ❌ Bad - multiple layers
RUN apk add --no-cache curl
RUN apk add --no-cache wget
RUN wget https://example.com/file
RUN tar xzf file
RUN rm file
```

### 7. Use .dockerignore

Always include a comprehensive `.dockerignore` file to:
- Reduce build context size
- Speed up builds
- Avoid including secrets

**Example** `.dockerignore`:
```
node_modules/
.git/
.env
*.md
!README.md
tests/
coverage/
.vscode/
.idea/
```

---

## Container Security

### 1. Security Scanning

#### Automated Scanning in CI/CD

We use multiple scanning tools:

**Trivy** (vulnerability scanning):
```yaml
- name: Run Trivy
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ env.IMAGE }}
    format: 'sarif'
    severity: 'CRITICAL,HIGH'
```

**Grype** (additional vulnerability scanning):
```yaml
- name: Scan with Grype
  uses: anchore/scan-action@v3
  with:
    image: ${{ env.IMAGE }}
    severity-cutoff: high
```

**Hadolint** (Dockerfile linting):
```bash
docker run --rm -i hadolint/hadolint < Dockerfile
```

#### Local Scanning

```bash
# Scan with Trivy
trivy image ghcr.io/brianclong/summit/api:latest

# Generate SBOM
syft ghcr.io/brianclong/summit/api:latest -o cyclonedx-json > sbom.json

# Scan SBOM with Grype
grype sbom:sbom.json
```

### 2. Runtime Security

#### Pod Security Standards

We enforce **Restricted** Pod Security Standard in production:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: intelgraph-production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

#### Security Context

```yaml
securityContext:
  # Pod-level
  runAsNonRoot: true
  runAsUser: 1001
  fsGroup: 1001
  seccompProfile:
    type: RuntimeDefault

  # Container-level
  allowPrivilegeEscalation: false
  capabilities:
    drop:
    - ALL
  readOnlyRootFilesystem: true
```

### 3. Network Policies

Restrict pod-to-pod communication:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-server-netpol
spec:
  podSelector:
    matchLabels:
      app: api-server
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: gateway
    ports:
    - protocol: TCP
      port: 4000
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
```

### 4. Image Signing and Verification

#### Signing with Cosign

```bash
# Sign image
cosign sign ghcr.io/brianclong/summit/api:latest

# Verify signature
cosign verify --key cosign.pub ghcr.io/brianclong/summit/api:latest
```

#### Policy Enforcement with Kyverno

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-image-signature
spec:
  validationFailureAction: enforce
  rules:
  - name: verify-signature
    match:
      resources:
        kinds:
        - Pod
    verifyImages:
    - imageReferences:
      - "ghcr.io/brianclong/summit/*"
      attestors:
      - count: 1
        entries:
        - keys:
            publicKeys: |-
              -----BEGIN PUBLIC KEY-----
              ...
              -----END PUBLIC KEY-----
```

---

## Kubernetes Orchestration

### 1. Pod Disruption Budgets (PDB)

Ensure high availability during voluntary disruptions:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-server-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: api-server
  unhealthyPodEvictionPolicy: IfHealthyBudget
```

**Key Configurations**:
- **minAvailable**: Minimum pods that must remain available
- **maxUnavailable**: Maximum pods that can be unavailable
- **unhealthyPodEvictionPolicy**: How to handle unhealthy pods

**Guidelines**:
- Critical services: `minAvailable: 2` or `maxUnavailable: 1`
- Worker services: `maxUnavailable: "25%"`
- Databases: `minAvailable: 1`

### 2. Resource Quotas

Prevent resource exhaustion at namespace level:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-quota
  namespace: intelgraph-production
spec:
  hard:
    requests.cpu: "100"
    requests.memory: 200Gi
    limits.cpu: "200"
    limits.memory: 400Gi
    pods: "200"
    services: "50"
    persistentvolumeclaims: "100"
```

### 3. Limit Ranges

Set default limits for containers:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: production-limits
  namespace: intelgraph-production
spec:
  limits:
  - type: Container
    default:
      cpu: "1000m"
      memory: "2Gi"
    defaultRequest:
      cpu: "250m"
      memory: "512Mi"
    max:
      cpu: "8000m"
      memory: "16Gi"
    min:
      cpu: "100m"
      memory: "128Mi"
```

---

## Health Checks

### 1. Types of Probes

#### Startup Probe
**Purpose**: Give slow-starting containers time to initialize

```yaml
startupProbe:
  httpGet:
    path: /health/startup
    port: 4000
  initialDelaySeconds: 0
  periodSeconds: 10
  failureThreshold: 30  # 30 * 10s = 5 minutes
```

#### Liveness Probe
**Purpose**: Restart container if it's in a broken state

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 4000
  initialDelaySeconds: 30
  periodSeconds: 20
  timeoutSeconds: 10
  failureThreshold: 3
```

#### Readiness Probe
**Purpose**: Remove pod from service if it can't handle traffic

```yaml
readinessProbe:
  httpGet:
    path: /health/ready
    port: 4000
  initialDelaySeconds: 10
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

### 2. Probe Mechanisms

#### HTTP Probes
```yaml
httpGet:
  path: /health
  port: 4000
  scheme: HTTP
  httpHeaders:
  - name: X-Probe-Type
    value: Readiness
```

#### TCP Probes
```yaml
tcpSocket:
  port: 5432
```

#### Exec Probes
```yaml
exec:
  command:
  - /bin/sh
  - -c
  - pg_isready -U postgres
```

#### gRPC Probes
```yaml
grpc:
  port: 9000
  service: health
```

### 3. Health Check Implementation

#### Node.js/Express Example

```javascript
// /health/startup
app.get('/health/startup', (req, res) => {
  if (global.appReady) {
    res.status(200).json({ status: 'started' });
  } else {
    res.status(503).json({ status: 'starting' });
  }
});

// /health/live
app.get('/health/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    uptime: process.uptime()
  });
});

// /health/ready
app.get('/health/ready', async (req, res) => {
  try {
    await db.ping();
    await redis.ping();
    res.status(200).json({
      status: 'ready',
      checks: {
        database: 'healthy',
        redis: 'healthy'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error.message
    });
  }
});
```

### 4. Best Practices

- **Startup probe**: Check minimal initialization, not dependencies
- **Liveness probe**: Check if app is deadlocked (don't check dependencies)
- **Readiness probe**: Check all critical dependencies
- **Timeouts**: Set appropriate timeouts (5-10s typical)
- **Failure thresholds**: 3 failures typical, 30+ for startup
- **Don't check external APIs** in liveness probes
- **Log probe failures** for debugging

---

## Autoscaling Strategies

### 1. Horizontal Pod Autoscaling (HPA)

#### Basic CPU/Memory Scaling

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-server-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

#### Custom Metrics with Prometheus

```yaml
metrics:
- type: Pods
  pods:
    metric:
      name: http_requests_per_second
    target:
      type: AverageValue
      averageValue: "1000"
- type: Pods
  pods:
    metric:
      name: graphql_query_rate
    target:
      type: AverageValue
      averageValue: "500"
```

#### Scaling Behavior

```yaml
behavior:
  scaleDown:
    stabilizationWindowSeconds: 300
    policies:
    - type: Percent
      value: 50
      periodSeconds: 60
    - type: Pods
      value: 2
      periodSeconds: 60
    selectPolicy: Min
  scaleUp:
    stabilizationWindowSeconds: 60
    policies:
    - type: Percent
      value: 100
      periodSeconds: 30
    - type: Pods
      value: 4
      periodSeconds: 30
    selectPolicy: Max
```

### 2. Custom Metrics with Prometheus Adapter

#### Install Prometheus Adapter

```bash
helm install prometheus-adapter prometheus-community/prometheus-adapter \
  --namespace monitoring \
  --values prometheus-adapter-values.yaml
```

#### Configure Custom Metrics

```yaml
# prometheus-adapter-values.yaml
rules:
- seriesQuery: 'http_requests_total{namespace!="",pod!=""}'
  resources:
    overrides:
      namespace: {resource: "namespace"}
      pod: {resource: "pod"}
  name:
    matches: "^(.*)_total$"
    as: "${1}_per_second"
  metricsQuery: 'rate(<<.Series>>{<<.LabelMatchers>>}[2m])'
```

### 3. KEDA (Event-Driven Autoscaling)

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: worker-scaledobject
spec:
  scaleTargetRef:
    name: worker
  minReplicaCount: 2
  maxReplicaCount: 50
  triggers:
  - type: prometheus
    metadata:
      serverAddress: http://prometheus:9090
      metricName: kafka_consumer_lag
      query: sum(kafka_consumergroup_lag{group="worker-group"})
      threshold: "1000"
  - type: kafka
    metadata:
      bootstrapServers: kafka:9092
      consumerGroup: worker-group
      topic: worker-tasks
      lagThreshold: "500"
```

### 4. Vertical Pod Autoscaling (VPA)

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-server-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: api-server
      minAllowed:
        cpu: 100m
        memory: 128Mi
      maxAllowed:
        cpu: 4000m
        memory: 8Gi
```

---

## Resource Management

### 1. Resource Requests and Limits

```yaml
resources:
  requests:
    cpu: 250m
    memory: 512Mi
    ephemeral-storage: 1Gi
  limits:
    cpu: 2000m
    memory: 4Gi
    ephemeral-storage: 5Gi
```

**Guidelines**:
- **Requests**: Minimum resources guaranteed
- **Limits**: Maximum resources allowed
- **CPU**: Compressible resource (throttled, not killed)
- **Memory**: Incompressible resource (pod killed if exceeded)

**Best Practices**:
- Set requests based on baseline usage
- Set limits to prevent resource hogging
- Monitor actual usage and adjust
- Use VPA to help determine optimal values

### 2. Quality of Service (QoS) Classes

#### Guaranteed QoS
```yaml
# requests == limits for all resources
resources:
  requests:
    cpu: 1000m
    memory: 2Gi
  limits:
    cpu: 1000m
    memory: 2Gi
```

#### Burstable QoS
```yaml
# requests < limits
resources:
  requests:
    cpu: 250m
    memory: 512Mi
  limits:
    cpu: 2000m
    memory: 4Gi
```

#### BestEffort QoS
```yaml
# No requests or limits specified
```

**Use Cases**:
- **Guaranteed**: Critical services (API, databases)
- **Burstable**: Most services (default)
- **BestEffort**: Non-critical batch jobs

### 3. Priority Classes

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority
value: 1000000
globalDefault: false
description: "High priority for critical services"
```

```yaml
# In Pod spec
spec:
  priorityClassName: high-priority
```

---

## Troubleshooting Guide

### 1. Container Won't Start

#### Check Pod Status
```bash
kubectl get pods -n intelgraph-production
kubectl describe pod <pod-name> -n intelgraph-production
```

#### Check Logs
```bash
kubectl logs <pod-name> -n intelgraph-production
kubectl logs <pod-name> -n intelgraph-production --previous
```

#### Common Issues

**ImagePullBackOff**:
```bash
# Check image exists
docker pull ghcr.io/brianclong/summit/api:tag

# Check image pull secrets
kubectl get secrets -n intelgraph-production
kubectl describe secret <secret-name>
```

**CrashLoopBackOff**:
- Check application logs
- Verify health check endpoints
- Check resource limits
- Review startup probe configuration

**Pending**:
- Insufficient cluster resources
- Node selector/affinity not satisfied
- PVC not bound
- Pod Disruption Budget preventing scheduling

### 2. Health Check Failures

#### Debug Health Checks
```bash
# Execute health check manually
kubectl exec -it <pod-name> -- curl http://localhost:4000/health

# Check probe configuration
kubectl get pod <pod-name> -o yaml | grep -A 10 "livenessProbe"
```

#### Common Issues
- **Timeout too short**: Increase timeoutSeconds
- **Too aggressive**: Increase periodSeconds or failureThreshold
- **Wrong endpoint**: Verify path and port
- **Dependencies failing**: Check readiness vs liveness logic

### 3. Performance Issues

#### Check Resource Usage
```bash
# CPU and memory usage
kubectl top pods -n intelgraph-production

# Detailed metrics
kubectl describe pod <pod-name> -n intelgraph-production | grep -A 5 "Limits"
```

#### Check HPA Status
```bash
kubectl get hpa -n intelgraph-production
kubectl describe hpa <hpa-name> -n intelgraph-production
```

#### Check for Throttling
```bash
# CPU throttling
kubectl top pod <pod-name> -n intelgraph-production

# Check container metrics
kubectl get --raw /apis/metrics.k8s.io/v1beta1/namespaces/intelgraph-production/pods/<pod-name>
```

### 4. Image Build Issues

#### Clear Build Cache
```bash
docker builder prune -af
```

#### Check Layer Caching
```bash
docker build --progress=plain -t myimage:tag .
```

#### Optimize Build Performance
```bash
# Use BuildKit
DOCKER_BUILDKIT=1 docker build -t myimage:tag .

# Parallel stages
docker buildx build --platform linux/amd64,linux/arm64 -t myimage:tag .
```

### 5. Security Scan Failures

#### Local Scanning
```bash
# Scan with Trivy
trivy image myimage:tag

# Scan specific severity
trivy image --severity HIGH,CRITICAL myimage:tag

# Scan and ignore unfixed vulnerabilities
trivy image --ignore-unfixed myimage:tag
```

#### Fix Common Vulnerabilities
- Update base images
- Update dependencies
- Use distroless images
- Apply security patches

---

## CI/CD Integration

### 1. GitHub Actions Workflow

See `.github/workflows/container-security.yml` for complete workflow.

**Key Steps**:
1. Dockerfile linting with Hadolint
2. Build with BuildKit and layer caching
3. Vulnerability scanning with Trivy and Grype
4. SBOM generation with Syft
5. Image signing with Cosign
6. Push to container registry

### 2. Local Development

```bash
# Build optimized image
docker build -f Dockerfile.optimized --target production-alpine -t myapp:dev .

# Run with security options
docker run --rm \
  --read-only \
  --user 1001:1001 \
  --cap-drop ALL \
  --security-opt=no-new-privileges \
  -p 4000:4000 \
  myapp:dev

# Test health checks
curl http://localhost:4000/health/startup
curl http://localhost:4000/health/live
curl http://localhost:4000/health/ready
```

### 3. Testing in Kubernetes

```bash
# Create test namespace
kubectl create namespace test

# Apply manifests
kubectl apply -f k8s/base/pdb-resource-quotas.yaml -n test
kubectl apply -f k8s/autoscaling/hpa-custom-metrics.yaml -n test
kubectl apply -f k8s/base/enhanced-health-checks.yaml -n test

# Watch deployment
kubectl rollout status deployment/api-server -n test

# Check HPA
kubectl get hpa -n test -w

# Load test
kubectl run -it --rm load-test --image=busybox --restart=Never -- \
  /bin/sh -c "while true; do wget -q -O- http://api-server:4000/health; done"
```

---

## Quick Reference

### Commands Cheat Sheet

```bash
# Build
docker build -t myapp:tag .
docker build --target production -t myapp:tag .

# Scan
trivy image myapp:tag
syft myapp:tag -o cyclonedx-json
grype myapp:tag

# Push
docker tag myapp:tag ghcr.io/user/myapp:tag
docker push ghcr.io/user/myapp:tag

# Kubernetes
kubectl apply -f k8s/
kubectl get pods -n prod -w
kubectl logs -f <pod> -n prod
kubectl describe pod <pod> -n prod
kubectl exec -it <pod> -n prod -- /bin/sh
kubectl top pods -n prod
kubectl get hpa -n prod

# Debug
kubectl describe pod <pod>
kubectl logs <pod> --previous
kubectl get events --sort-by=.metadata.creationTimestamp
```

### File Reference

- **Optimized Dockerfile**: `/Dockerfile.optimized`
- **Docker ignore**: `/.dockerignore`
- **Hadolint config**: `/.hadolint.yaml`
- **Security scanning**: `/.github/workflows/container-security.yml`
- **PDB & Quotas**: `/k8s/base/pdb-resource-quotas.yaml`
- **HPA**: `/k8s/autoscaling/hpa-custom-metrics.yaml`
- **Health checks**: `/k8s/base/enhanced-health-checks.yaml`

---

## Additional Resources

- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)
- [Docker Security Best Practices](https://docs.docker.com/develop/security-best-practices/)
- [OWASP Container Security](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)
- [Trivy Documentation](https://aquasecurity.github.io/trivy/)
- [Prometheus Adapter](https://github.com/kubernetes-sigs/prometheus-adapter)
- [KEDA Documentation](https://keda.sh/)

---

**Maintained by**: IntelGraph Infrastructure Team
**Last Review**: 2025-11-20
