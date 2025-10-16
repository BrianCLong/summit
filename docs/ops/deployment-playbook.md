# Maestro Conductor Deployment Playbook

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Infrastructure Deployment](#infrastructure-deployment)
- [Application Deployment](#application-deployment)
- [Configuration](#configuration)
- [Health Checks](#health-checks)
- [Rollback Procedures](#rollback-procedures)
- [Post-Deployment Tasks](#post-deployment-tasks)

## Prerequisites

### System Requirements

- **Kubernetes**: v1.24+
- **PostgreSQL**: v13+
- **Redis**: v6+
- **Node.js**: v18+
- **Docker**: v20+

### Access Requirements

- Kubernetes cluster admin access
- Container registry access (Docker Hub, ECR, etc.)
- Database admin credentials
- SSL certificates for HTTPS
- Monitoring system access (Prometheus, Grafana)

### Tools Installation

```bash
# Install required CLI tools
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
curl -s https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
curl -L https://istio.io/downloadIstio | sh -

# Install application-specific tools
npm install -g @maestro/cli
pip install maestro-python-client
```

## Environment Setup

### Development Environment

```bash
#!/bin/bash
# setup-dev.sh

# Create namespace
kubectl create namespace maestro-dev

# Set context
kubectl config set-context --current --namespace=maestro-dev

# Install dependencies
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Deploy PostgreSQL
helm install postgres bitnami/postgresql \
  --set auth.postgresPassword=devpassword \
  --set auth.database=maestro \
  --set persistence.size=20Gi

# Deploy Redis
helm install redis bitnami/redis \
  --set auth.password=devpassword \
  --set master.persistence.size=8Gi

# Wait for services
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=postgresql --timeout=300s
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=redis --timeout=300s

echo "Development environment ready"
```

### Staging Environment

```bash
#!/bin/bash
# setup-staging.sh

# Create namespace with resource quotas
kubectl apply -f - <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: maestro-staging
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: staging-quota
  namespace: maestro-staging
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
    persistentvolumeclaims: "10"
EOF

# Set context
kubectl config set-context --current --namespace=maestro-staging

# Deploy with staging configuration
helm install postgres bitnami/postgresql \
  --set auth.postgresPassword=$POSTGRES_PASSWORD \
  --set auth.database=maestro \
  --set persistence.size=100Gi \
  --set metrics.enabled=true

helm install redis bitnami/redis \
  --set auth.password=$REDIS_PASSWORD \
  --set master.persistence.size=20Gi \
  --set metrics.enabled=true

echo "Staging environment ready"
```

### Production Environment

```bash
#!/bin/bash
# setup-production.sh

# Create namespace with network policies
kubectl apply -f - <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: maestro-prod
  labels:
    name: maestro-prod
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: maestro-network-policy
  namespace: maestro-prod
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: maestro-prod
    - namespaceSelector:
        matchLabels:
          name: istio-system
  egress:
  - {}
EOF

# Set context
kubectl config set-context --current --namespace=maestro-prod

# Deploy HA PostgreSQL cluster
helm install postgres bitnami/postgresql-ha \
  --set postgresql.password=$POSTGRES_PASSWORD \
  --set postgresql.database=maestro \
  --set postgresql.replicaCount=3 \
  --set persistence.size=500Gi \
  --set metrics.enabled=true

# Deploy Redis cluster
helm install redis bitnami/redis-cluster \
  --set auth.password=$REDIS_PASSWORD \
  --set cluster.nodes=6 \
  --set persistence.size=100Gi \
  --set metrics.enabled=true

echo "Production environment ready"
```

## Infrastructure Deployment

### Database Schema Migration

```bash
#!/bin/bash
# migrate-database.sh

ENVIRONMENT=${1:-development}
POSTGRES_HOST=${2:-postgres}
POSTGRES_DB=${3:-maestro}

echo "Running database migrations for $ENVIRONMENT environment"

# Wait for database to be ready
until pg_isready -h $POSTGRES_HOST -U postgres; do
  echo "Waiting for PostgreSQL..."
  sleep 2
done

# Run migrations in order
for migration in deploy/sql/*.sql; do
  echo "Applying migration: $(basename $migration)"
  psql -h $POSTGRES_HOST -U postgres -d $POSTGRES_DB -f "$migration"

  if [ $? -ne 0 ]; then
    echo "Migration failed: $migration"
    exit 1
  fi
done

# Verify schema
psql -h $POSTGRES_HOST -U postgres -d $POSTGRES_DB -c "
  SELECT schemaname, tablename
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY tablename;
"

echo "Database migration completed successfully"
```

### SSL Certificate Setup

```yaml
# ssl-certificates.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: maestro-tls
  namespace: maestro-prod
spec:
  secretName: maestro-tls-secret
  issuer:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - api.maestro.com
    - dashboard.maestro.com
    - webhook.maestro.com
---
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@maestro.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
```

### Load Balancer Configuration

```yaml
# load-balancer.yaml
apiVersion: v1
kind: Service
metadata:
  name: maestro-lb
  namespace: maestro-prod
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: 'nlb'
    service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled: 'true'
spec:
  type: LoadBalancer
  ports:
    - name: http
      port: 80
      targetPort: 8080
    - name: https
      port: 443
      targetPort: 8443
  selector:
    app: maestro-gateway
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: maestro-ingress
  namespace: maestro-prod
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: 'true'
    nginx.ingress.kubernetes.io/proxy-body-size: '50m'
spec:
  tls:
    - hosts:
        - api.maestro.com
        - dashboard.maestro.com
      secretName: maestro-tls-secret
  rules:
    - host: api.maestro.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: maestro-api
                port:
                  number: 3000
    - host: dashboard.maestro.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: maestro-dashboard
                port:
                  number: 80
```

## Application Deployment

### Container Images

```bash
#!/bin/bash
# build-images.sh

VERSION=${1:-latest}
REGISTRY=${2:-docker.io/maestro}

echo "Building Maestro container images v$VERSION"

# Build API server
docker build -t $REGISTRY/api:$VERSION \
  --build-arg VERSION=$VERSION \
  --file docker/Dockerfile.api .

# Build executor
docker build -t $REGISTRY/executor:$VERSION \
  --build-arg VERSION=$VERSION \
  --file docker/Dockerfile.executor .

# Build dashboard
docker build -t $REGISTRY/dashboard:$VERSION \
  --build-arg VERSION=$VERSION \
  --file docker/Dockerfile.dashboard .

# Build billing service
docker build -t $REGISTRY/billing:$VERSION \
  --build-arg VERSION=$VERSION \
  --file docker/Dockerfile.billing .

# Push to registry
echo "Pushing images to $REGISTRY"
docker push $REGISTRY/api:$VERSION
docker push $REGISTRY/executor:$VERSION
docker push $REGISTRY/dashboard:$VERSION
docker push $REGISTRY/billing:$VERSION

echo "Images built and pushed successfully"
```

### Kubernetes Deployments

```yaml
# maestro-api.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: maestro-api
  namespace: maestro-prod
  labels:
    app: maestro-api
    version: v1.0.0
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 1
  selector:
    matchLabels:
      app: maestro-api
  template:
    metadata:
      labels:
        app: maestro-api
        version: v1.0.0
    spec:
      serviceAccountName: maestro-api
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 2000
      containers:
        - name: api
          image: maestro/api:v1.0.0
          ports:
            - containerPort: 3000
              name: http
          env:
            - name: NODE_ENV
              value: 'production'
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: maestro-secrets
                  key: database-url
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: maestro-secrets
                  key: redis-url
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: maestro-secrets
                  key: jwt-secret
          resources:
            requests:
              memory: '512Mi'
              cpu: '250m'
            limits:
              memory: '1Gi'
              cpu: '500m'
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
          volumeMounts:
            - name: config
              mountPath: /app/config
              readOnly: true
      volumes:
        - name: config
          configMap:
            name: maestro-config
---
apiVersion: v1
kind: Service
metadata:
  name: maestro-api
  namespace: maestro-prod
  labels:
    app: maestro-api
spec:
  type: ClusterIP
  ports:
    - port: 3000
      targetPort: 3000
      name: http
  selector:
    app: maestro-api
```

### Executor Deployment

```yaml
# maestro-executor.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: maestro-executor
  namespace: maestro-prod
  labels:
    app: maestro-executor
spec:
  replicas: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2
      maxUnavailable: 1
  selector:
    matchLabels:
      app: maestro-executor
  template:
    metadata:
      labels:
        app: maestro-executor
    spec:
      serviceAccountName: maestro-executor
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 2000
      containers:
        - name: executor
          image: maestro/executor:v1.0.0
          env:
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: maestro-secrets
                  key: redis-url
            - name: WORKER_CONCURRENCY
              value: '10'
            - name: MAX_MEMORY_MB
              value: '1024'
          resources:
            requests:
              memory: '256Mi'
              cpu: '200m'
            limits:
              memory: '1Gi'
              cpu: '800m'
          livenessProbe:
            exec:
              command:
                - /health-check
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            exec:
              command:
                - /ready-check
            initialDelaySeconds: 5
            periodSeconds: 5
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: maestro-executor-hpa
  namespace: maestro-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: maestro-executor
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

## Configuration

### Secrets Management

```bash
#!/bin/bash
# setup-secrets.sh

NAMESPACE=${1:-maestro-prod}

echo "Setting up secrets for namespace: $NAMESPACE"

# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 32)

# Create secrets
kubectl create secret generic maestro-secrets \
  --namespace=$NAMESPACE \
  --from-literal=database-url="postgresql://maestro:$POSTGRES_PASSWORD@postgres:5432/maestro" \
  --from-literal=redis-url="redis://:$REDIS_PASSWORD@redis:6379/0" \
  --from-literal=jwt-secret="$JWT_SECRET" \
  --from-literal=stripe-secret-key="$STRIPE_SECRET_KEY" \
  --from-literal=github-webhook-secret="$GITHUB_WEBHOOK_SECRET" \
  --from-literal=slack-bot-token="$SLACK_BOT_TOKEN"

# Create image pull secrets if using private registry
kubectl create secret docker-registry maestro-registry \
  --namespace=$NAMESPACE \
  --docker-server=$REGISTRY_SERVER \
  --docker-username=$REGISTRY_USERNAME \
  --docker-password=$REGISTRY_PASSWORD \
  --docker-email=$REGISTRY_EMAIL

echo "Secrets created successfully"
```

### Configuration Maps

```yaml
# maestro-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: maestro-config
  namespace: maestro-prod
data:
  app.yaml: |
    server:
      port: 3000
      cors:
        origin: ["https://dashboard.maestro.com"]
        credentials: true

    database:
      pool:
        min: 2
        max: 20
        acquireTimeoutMillis: 30000
        idleTimeoutMillis: 30000

    redis:
      maxRetriesPerRequest: 3
      retryDelayOnFailover: 100

    executor:
      defaultTimeout: 300000
      maxConcurrency: 10
      retryAttempts: 3

    billing:
      currency: "USD"
      invoicingDay: 1
      gracePeriodDays: 7

    monitoring:
      metrics:
        enabled: true
        port: 9090
      tracing:
        enabled: true
        jaegerEndpoint: "http://jaeger:14268/api/traces"

    security:
      rateLimiting:
        windowMs: 900000  # 15 minutes
        max: 1000         # requests per window
      jwt:
        expiresIn: "24h"
        refreshExpiresIn: "7d"

    features:
      benchmarking: true
      billing: true
      integrations: true
      advancedWorkflows: true

  logging.yaml: |
    level: info
    format: json
    destinations:
      - type: console
      - type: file
        filename: /var/log/maestro/app.log
        maxSize: 100MB
        maxFiles: 5
      - type: elasticsearch
        host: elasticsearch:9200
        index: maestro-logs
```

### Environment-Specific Configuration

```bash
#!/bin/bash
# configure-environment.sh

ENVIRONMENT=${1:-production}

case $ENVIRONMENT in
  development)
    REPLICAS=1
    RESOURCES_REQUESTS_CPU="100m"
    RESOURCES_REQUESTS_MEMORY="256Mi"
    RESOURCES_LIMITS_CPU="500m"
    RESOURCES_LIMITS_MEMORY="512Mi"
    LOG_LEVEL="debug"
    ;;
  staging)
    REPLICAS=2
    RESOURCES_REQUESTS_CPU="200m"
    RESOURCES_REQUESTS_MEMORY="512Mi"
    RESOURCES_LIMITS_CPU="800m"
    RESOURCES_LIMITS_MEMORY="1Gi"
    LOG_LEVEL="info"
    ;;
  production)
    REPLICAS=3
    RESOURCES_REQUESTS_CPU="250m"
    RESOURCES_REQUESTS_MEMORY="512Mi"
    RESOURCES_LIMITS_CPU="1000m"
    RESOURCES_LIMITS_MEMORY="2Gi"
    LOG_LEVEL="warn"
    ;;
esac

# Apply environment-specific configuration
helm upgrade --install maestro ./helm/maestro \
  --namespace=maestro-$ENVIRONMENT \
  --set environment=$ENVIRONMENT \
  --set replicaCount=$REPLICAS \
  --set resources.requests.cpu=$RESOURCES_REQUESTS_CPU \
  --set resources.requests.memory=$RESOURCES_REQUESTS_MEMORY \
  --set resources.limits.cpu=$RESOURCES_LIMITS_CPU \
  --set resources.limits.memory=$RESOURCES_LIMITS_MEMORY \
  --set logging.level=$LOG_LEVEL

echo "Environment $ENVIRONMENT configured successfully"
```

## Health Checks

### Application Health Endpoints

```typescript
// health-checks.ts
import express from 'express';
import { createConnection } from 'typeorm';
import Redis from 'ioredis';

const app = express();
const redis = new Redis(process.env.REDIS_URL);

// Liveness probe - basic service health
app.get('/health', async (req, res) => {
  try {
    // Check if the application is running
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.VERSION || 'unknown',
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

// Readiness probe - dependencies check
app.get('/ready', async (req, res) => {
  const checks = {
    database: false,
    redis: false,
    filesystem: false,
  };

  try {
    // Check database connection
    const connection = await createConnection();
    await connection.query('SELECT 1');
    checks.database = true;
    await connection.close();
  } catch (error) {
    console.error('Database check failed:', error);
  }

  try {
    // Check Redis connection
    await redis.ping();
    checks.redis = true;
  } catch (error) {
    console.error('Redis check failed:', error);
  }

  try {
    // Check filesystem
    await fs.access('/tmp', fs.constants.W_OK);
    checks.filesystem = true;
  } catch (error) {
    console.error('Filesystem check failed:', error);
  }

  const allHealthy = Object.values(checks).every((check) => check === true);

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ready' : 'not ready',
    checks,
    timestamp: new Date().toISOString(),
  });
});

// Metrics endpoint for Prometheus
app.get('/metrics', (req, res) => {
  // Export Prometheus metrics
  res.set('Content-Type', 'text/plain');
  res.send(prometheusMetrics.register.metrics());
});

export default app;
```

### Health Check Scripts

```bash
#!/bin/bash
# health-check.sh

NAMESPACE=${1:-maestro-prod}
API_URL=${2:-https://api.maestro.com}

echo "Running health checks for Maestro in namespace: $NAMESPACE"

# Check pod status
echo "=== Pod Status ==="
kubectl get pods -n $NAMESPACE -l app=maestro-api
kubectl get pods -n $NAMESPACE -l app=maestro-executor

# Check service endpoints
echo "=== Service Endpoints ==="
kubectl get endpoints -n $NAMESPACE

# Check application health
echo "=== Application Health ==="
curl -f $API_URL/health || echo "Health check failed"
curl -f $API_URL/ready || echo "Readiness check failed"

# Check database connectivity
echo "=== Database Connectivity ==="
kubectl exec -n $NAMESPACE deployment/maestro-api -- \
  psql $DATABASE_URL -c "SELECT 1" || echo "Database check failed"

# Check Redis connectivity
echo "=== Redis Connectivity ==="
kubectl exec -n $NAMESPACE deployment/maestro-api -- \
  redis-cli -u $REDIS_URL ping || echo "Redis check failed"

# Check external dependencies
echo "=== External Dependencies ==="
curl -f https://api.stripe.com/v1/ping || echo "Stripe API check failed"
curl -f https://api.github.com || echo "GitHub API check failed"

echo "Health checks completed"
```

## Rollback Procedures

### Application Rollback

```bash
#!/bin/bash
# rollback.sh

NAMESPACE=${1:-maestro-prod}
REVISION=${2:-previous}

echo "Rolling back Maestro deployment in namespace: $NAMESPACE"

# Get current revision
CURRENT_REVISION=$(kubectl rollout history deployment/maestro-api -n $NAMESPACE | tail -n 1 | awk '{print $1}')
echo "Current revision: $CURRENT_REVISION"

if [ "$REVISION" = "previous" ]; then
  # Rollback to previous revision
  kubectl rollout undo deployment/maestro-api -n $NAMESPACE
  kubectl rollout undo deployment/maestro-executor -n $NAMESPACE
  kubectl rollout undo deployment/maestro-dashboard -n $NAMESPACE
else
  # Rollback to specific revision
  kubectl rollout undo deployment/maestro-api --to-revision=$REVISION -n $NAMESPACE
  kubectl rollout undo deployment/maestro-executor --to-revision=$REVISION -n $NAMESPACE
  kubectl rollout undo deployment/maestro-dashboard --to-revision=$REVISION -n $NAMESPACE
fi

# Wait for rollback to complete
echo "Waiting for rollback to complete..."
kubectl rollout status deployment/maestro-api -n $NAMESPACE --timeout=300s
kubectl rollout status deployment/maestro-executor -n $NAMESPACE --timeout=300s
kubectl rollout status deployment/maestro-dashboard -n $NAMESPACE --timeout=300s

# Verify rollback
echo "Verifying rollback..."
kubectl get pods -n $NAMESPACE -l app=maestro-api
kubectl get pods -n $NAMESPACE -l app=maestro-executor

# Health check after rollback
sleep 30
curl -f https://api.maestro.com/health || echo "Post-rollback health check failed"

echo "Rollback completed successfully"
```

### Database Rollback

```bash
#!/bin/bash
# rollback-database.sh

BACKUP_FILE=${1}
ENVIRONMENT=${2:-staging}

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup_file> [environment]"
  echo "Available backups:"
  ls -la /backups/maestro/*.backup
  exit 1
fi

echo "WARNING: This will restore database from backup and lose recent data!"
echo "Backup file: $BACKUP_FILE"
echo "Environment: $ENVIRONMENT"
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Rollback cancelled"
  exit 0
fi

# Stop applications to prevent new data
kubectl scale deployment/maestro-api --replicas=0 -n maestro-$ENVIRONMENT
kubectl scale deployment/maestro-executor --replicas=0 -n maestro-$ENVIRONMENT

# Wait for pods to terminate
kubectl wait --for=delete pod -l app=maestro-api -n maestro-$ENVIRONMENT --timeout=60s
kubectl wait --for=delete pod -l app=maestro-executor -n maestro-$ENVIRONMENT --timeout=60s

# Restore database
echo "Restoring database from $BACKUP_FILE"
pg_restore -h postgres -U postgres -d maestro --clean --if-exists $BACKUP_FILE

if [ $? -eq 0 ]; then
  echo "Database restored successfully"

  # Restart applications
  kubectl scale deployment/maestro-api --replicas=3 -n maestro-$ENVIRONMENT
  kubectl scale deployment/maestro-executor --replicas=5 -n maestro-$ENVIRONMENT

  # Wait for applications to be ready
  kubectl wait --for=condition=ready pod -l app=maestro-api -n maestro-$ENVIRONMENT --timeout=300s

  echo "Database rollback completed successfully"
else
  echo "Database restore failed"
  exit 1
fi
```

## Post-Deployment Tasks

### Smoke Tests

```bash
#!/bin/bash
# smoke-tests.sh

API_URL=${1:-https://api.maestro.com}
API_KEY=${2}

if [ -z "$API_KEY" ]; then
  echo "Usage: $0 <api_url> <api_key>"
  exit 1
fi

echo "Running smoke tests against: $API_URL"

# Test 1: Health check
echo "Test 1: Health check"
curl -f $API_URL/health || exit 1

# Test 2: Authentication
echo "Test 2: Authentication"
curl -f -H "Authorization: Bearer $API_KEY" $API_URL/graphql \
  -d '{"query": "{ __schema { types { name } } }"}' \
  -H "Content-Type: application/json" || exit 1

# Test 3: Create workflow
echo "Test 3: Create workflow"
WORKFLOW_ID=$(curl -s -H "Authorization: Bearer $API_KEY" $API_URL/graphql \
  -d '{"query": "mutation { createWorkflow(input: { name: \"Smoke Test\", definition: { nodes: [] } }) { id } }"}' \
  -H "Content-Type: application/json" | jq -r '.data.createWorkflow.id')

if [ "$WORKFLOW_ID" = "null" ] || [ -z "$WORKFLOW_ID" ]; then
  echo "Failed to create workflow"
  exit 1
fi

echo "Created workflow: $WORKFLOW_ID"

# Test 4: List workflows
echo "Test 4: List workflows"
curl -f -H "Authorization: Bearer $API_KEY" $API_URL/graphql \
  -d '{"query": "{ workflows { id name } }"}' \
  -H "Content-Type: application/json" || exit 1

# Test 5: Delete test workflow
echo "Test 5: Delete test workflow"
curl -f -H "Authorization: Bearer $API_KEY" $API_URL/graphql \
  -d "{\"query\": \"mutation { deleteWorkflow(id: \\\"$WORKFLOW_ID\\\") { success } }\"}" \
  -H "Content-Type: application/json" || exit 1

echo "All smoke tests passed!"
```

### Performance Baseline

```bash
#!/bin/bash
# performance-baseline.sh

API_URL=${1:-https://api.maestro.com}
API_KEY=${2}

echo "Establishing performance baseline for: $API_URL"

# Run benchmark suite
npx ts-node tools/bench/run-suite.ts \
  --endpoint $API_URL \
  --auth-token $API_KEY \
  --suite production-baseline \
  --duration 300 \
  --concurrency 10

# Store baseline results
BASELINE_FILE="baseline-$(date +%Y%m%d_%H%M%S).json"
cp benchmark-results.json /var/lib/maestro/baselines/$BASELINE_FILE

echo "Performance baseline established: $BASELINE_FILE"
```

### Monitoring Setup Verification

```bash
#!/bin/bash
# verify-monitoring.sh

NAMESPACE=${1:-maestro-prod}

echo "Verifying monitoring setup for namespace: $NAMESPACE"

# Check Prometheus targets
echo "=== Prometheus Targets ==="
curl -s http://prometheus:9090/api/v1/targets | jq '.data.activeTargets[] | select(.labels.job | contains("maestro")) | {job: .labels.job, health: .health, lastScrape: .lastScrape}'

# Check Grafana dashboards
echo "=== Grafana Dashboards ==="
curl -s -H "Authorization: Bearer $GRAFANA_API_KEY" \
  http://grafana:3000/api/search?query=maestro | jq '.[].title'

# Check alerting rules
echo "=== Alert Rules ==="
curl -s http://prometheus:9090/api/v1/rules | jq '.data.groups[] | select(.name | contains("maestro")) | .rules[] | {alert: .name, state: .state}'

# Check log ingestion
echo "=== Log Ingestion ==="
curl -s http://elasticsearch:9200/maestro-logs-*/_search?size=1 | jq '.hits.total.value'

echo "Monitoring verification completed"
```

This deployment playbook provides comprehensive procedures for deploying Maestro Conductor vNext across different environments with proper configuration, health checks, and rollback capabilities.
