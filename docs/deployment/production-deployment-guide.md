# IntelGraph Production Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the IntelGraph platform to production environments, including both IntelGraph Core and Maestro autonomous orchestration systems.

## Prerequisites

### Infrastructure Requirements

#### Minimum System Requirements

- **Kubernetes Cluster**: v1.26+
- **Nodes**: 6 nodes minimum (3 control plane, 3 worker)
- **Compute**: 32 vCPU, 128GB RAM per worker node
- **Storage**: 500GB SSD per node, 2TB shared storage
- **Network**: 10Gbps internal, 1Gbps external

#### Recommended Production Requirements

- **Kubernetes Cluster**: v1.28+
- **Nodes**: 12 nodes (3 control plane, 9 worker - 3 per availability zone)
- **Compute**: 64 vCPU, 256GB RAM per worker node
- **Storage**: 1TB NVMe SSD per node, 10TB shared storage
- **Network**: 25Gbps internal, 10Gbps external with CDN

### Software Dependencies

#### Required Tools

```bash
# Install required CLI tools
kubectl version --client  # >= v1.26.0
helm version              # >= v3.10.0
argocd version           # >= v2.8.0
terraform version        # >= v1.5.0
docker version           # >= v20.10.0
```

#### Cloud Provider Setup (AWS Example)

```bash
# Configure AWS CLI
aws configure set region us-west-2
aws configure set output json

# Create EKS cluster
eksctl create cluster \
  --name intelgraph-prod \
  --version 1.28 \
  --region us-west-2 \
  --zones us-west-2a,us-west-2b,us-west-2c \
  --nodegroup-name workers \
  --node-type m5.4xlarge \
  --nodes 9 \
  --nodes-min 6 \
  --nodes-max 15 \
  --managed \
  --enable-ssm \
  --full-ecr-access
```

## Environment Setup

### Namespace Configuration

```yaml
# namespaces.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: intelgraph-core
  labels:
    name: intelgraph-core
    tier: production
    component: core
---
apiVersion: v1
kind: Namespace
metadata:
  name: intelgraph-maestro
  labels:
    name: intelgraph-maestro
    tier: production
    component: orchestration
---
apiVersion: v1
kind: Namespace
metadata:
  name: intelgraph-monitoring
  labels:
    name: intelgraph-monitoring
    tier: production
    component: observability
```

### RBAC Configuration

```yaml
# rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: intelgraph-core
  namespace: intelgraph-core
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: intelgraph-core-role
rules:
  - apiGroups: ['']
    resources: ['configmaps', 'secrets', 'services']
    verbs: ['get', 'list', 'watch']
  - apiGroups: ['apps']
    resources: ['deployments', 'replicasets']
    verbs: ['get', 'list', 'watch', 'patch']
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: intelgraph-core-binding
subjects:
  - kind: ServiceAccount
    name: intelgraph-core
    namespace: intelgraph-core
roleRef:
  kind: ClusterRole
  name: intelgraph-core-role
  apiGroup: rbac.authorization.k8s.io
```

## Database Setup

### Neo4j Deployment

```yaml
# neo4j-production.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: neo4j
  namespace: intelgraph-core
spec:
  serviceName: neo4j
  replicas: 3
  selector:
    matchLabels:
      app: neo4j
  template:
    metadata:
      labels:
        app: neo4j
    spec:
      containers:
        - name: neo4j
          image: neo4j:5.15-enterprise
          env:
            - name: NEO4J_AUTH
              valueFrom:
                secretKeyRef:
                  name: neo4j-auth
                  key: auth
            - name: NEO4J_ACCEPT_LICENSE_AGREEMENT
              value: 'yes'
            - name: NEO4J_dbms_mode
              value: 'CORE'
            - name: NEO4J_causal__clustering_initial__discovery__members
              value: 'neo4j-0.neo4j.intelgraph-core.svc.cluster.local:5000,neo4j-1.neo4j.intelgraph-core.svc.cluster.local:5000,neo4j-2.neo4j.intelgraph-core.svc.cluster.local:5000'
            - name: NEO4J_dbms_connector_bolt_advertised__address
              value: '$(hostname -f):7687'
            - name: NEO4J_dbms_connector_http_advertised__address
              value: '$(hostname -f):7474'
          ports:
            - containerPort: 7474
              name: http
            - containerPort: 7687
              name: bolt
            - containerPort: 5000
              name: discovery
          volumeMounts:
            - name: neo4j-data
              mountPath: /data
            - name: neo4j-logs
              mountPath: /logs
          resources:
            requests:
              memory: '8Gi'
              cpu: '2000m'
            limits:
              memory: '16Gi'
              cpu: '4000m'
  volumeClaimTemplates:
    - metadata:
        name: neo4j-data
      spec:
        accessModes: ['ReadWriteOnce']
        resources:
          requests:
            storage: 100Gi
        storageClassName: fast-ssd
    - metadata:
        name: neo4j-logs
      spec:
        accessModes: ['ReadWriteOnce']
        resources:
          requests:
            storage: 10Gi
        storageClassName: standard
```

### PostgreSQL Deployment

```yaml
# postgresql-production.yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-cluster
  namespace: intelgraph-core
spec:
  instances: 3
  primaryUpdateStrategy: unsupervised

  postgresql:
    parameters:
      max_connections: '400'
      shared_buffers: '4GB'
      effective_cache_size: '12GB'
      maintenance_work_mem: '1GB'
      checkpoint_completion_target: '0.7'
      wal_buffers: '16MB'
      default_statistics_target: '100'
      random_page_cost: '1.1'
      effective_io_concurrency: '200'
      work_mem: '10MB'
      min_wal_size: '2GB'
      max_wal_size: '8GB'

  monitoring:
    enabled: true

  resources:
    requests:
      memory: '8Gi'
      cpu: '2000m'
    limits:
      memory: '16Gi'
      cpu: '4000m'

  storage:
    size: '200Gi'
    storageClass: 'fast-ssd'

  backup:
    retentionPolicy: '30d'
    barmanObjectStore:
      destinationPath: 's3://intelgraph-backups/postgres'
      s3Credentials:
        accessKeyId:
          name: backup-credentials
          key: ACCESS_KEY_ID
        secretAccessKey:
          name: backup-credentials
          key: SECRET_ACCESS_KEY
      wal:
        retention: '5d'
      data:
        retention: '30d'
```

### Redis Deployment

```yaml
# redis-production.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
  namespace: intelgraph-core
spec:
  serviceName: redis
  replicas: 3
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
        - name: redis
          image: redis:7.2-alpine
          command:
            - redis-server
            - /etc/redis/redis.conf
          ports:
            - containerPort: 6379
              name: redis
            - containerPort: 16379
              name: cluster
          volumeMounts:
            - name: redis-config
              mountPath: /etc/redis
            - name: redis-data
              mountPath: /data
          resources:
            requests:
              memory: '4Gi'
              cpu: '1000m'
            limits:
              memory: '8Gi'
              cpu: '2000m'
          livenessProbe:
            tcpSocket:
              port: 6379
            initialDelaySeconds: 30
            timeoutSeconds: 5
          readinessProbe:
            exec:
              command:
                - redis-cli
                - ping
            initialDelaySeconds: 5
            timeoutSeconds: 1
      volumes:
        - name: redis-config
          configMap:
            name: redis-config
  volumeClaimTemplates:
    - metadata:
        name: redis-data
      spec:
        accessModes: ['ReadWriteOnce']
        resources:
          requests:
            storage: 50Gi
        storageClassName: fast-ssd
```

## Application Deployment

### IntelGraph Core Deployment

```yaml
# intelgraph-core.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: intelgraph-core
  namespace: intelgraph-core
spec:
  replicas: 6
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2
      maxUnavailable: 1
  selector:
    matchLabels:
      app: intelgraph-core
  template:
    metadata:
      labels:
        app: intelgraph-core
      annotations:
        prometheus.io/scrape: 'true'
        prometheus.io/port: '4000'
        prometheus.io/path: '/metrics'
    spec:
      serviceAccountName: intelgraph-core
      containers:
        - name: intelgraph-core
          image: intelgraph/core:2.1.0
          ports:
            - containerPort: 4000
              name: http
            - containerPort: 4001
              name: graphql
          env:
            - name: NODE_ENV
              value: 'production'
            - name: NEO4J_URI
              value: 'neo4j://neo4j:7687'
            - name: NEO4J_USERNAME
              valueFrom:
                secretKeyRef:
                  name: neo4j-auth
                  key: username
            - name: NEO4J_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: neo4j-auth
                  key: password
            - name: POSTGRESQL_URL
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: uri
            - name: REDIS_URL
              value: 'redis://redis:6379'
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: jwt-secret
                  key: secret
          resources:
            requests:
              memory: '2Gi'
              cpu: '500m'
            limits:
              memory: '4Gi'
              cpu: '1000m'
          livenessProbe:
            httpGet:
              path: /health
              port: 4000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 4000
            initialDelaySeconds: 5
            periodSeconds: 5
          volumeMounts:
            - name: config
              mountPath: /app/config
              readOnly: true
      volumes:
        - name: config
          configMap:
            name: intelgraph-core-config
---
apiVersion: v1
kind: Service
metadata:
  name: intelgraph-core
  namespace: intelgraph-core
spec:
  selector:
    app: intelgraph-core
  ports:
    - name: http
      port: 80
      targetPort: 4000
    - name: graphql
      port: 4001
      targetPort: 4001
  type: ClusterIP
```

### Maestro Orchestrator Deployment

```yaml
# maestro-orchestrator.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: maestro-orchestrator
  namespace: intelgraph-maestro
spec:
  replicas: 4
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: maestro-orchestrator
  template:
    metadata:
      labels:
        app: maestro-orchestrator
      annotations:
        prometheus.io/scrape: 'true'
        prometheus.io/port: '4001'
    spec:
      containers:
        - name: maestro-orchestrator
          image: intelgraph/maestro:1.3.0
          ports:
            - containerPort: 4001
              name: http
          env:
            - name: NODE_ENV
              value: 'production'
            - name: REDIS_URL
              value: 'redis://redis.intelgraph-core:6379'
            - name: POSTGRESQL_URL
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: uri
            - name: OPENAI_API_KEY
              valueFrom:
                secretKeyRef:
                  name: ai-model-keys
                  key: openai
            - name: ANTHROPIC_API_KEY
              valueFrom:
                secretKeyRef:
                  name: ai-model-keys
                  key: anthropic
            - name: GOOGLE_AI_API_KEY
              valueFrom:
                secretKeyRef:
                  name: ai-model-keys
                  key: google
          resources:
            requests:
              memory: '1Gi'
              cpu: '500m'
            limits:
              memory: '2Gi'
              cpu: '1000m'
          livenessProbe:
            httpGet:
              path: /v1/health
              port: 4001
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /v1/health
              port: 4001
            initialDelaySeconds: 10
            periodSeconds: 5
          volumeMounts:
            - name: config
              mountPath: /app/config
              readOnly: true
      volumes:
        - name: config
          configMap:
            name: maestro-config
```

## Security Configuration

### Network Policies

```yaml
# network-policies.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: intelgraph-core-network-policy
  namespace: intelgraph-core
spec:
  podSelector:
    matchLabels:
      app: intelgraph-core
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: intelgraph-maestro
        - namespaceSelector:
            matchLabels:
              name: nginx-ingress
      ports:
        - protocol: TCP
          port: 4000
        - protocol: TCP
          port: 4001
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              name: intelgraph-core
      ports:
        - protocol: TCP
          port: 7687 # Neo4j
        - protocol: TCP
          port: 5432 # PostgreSQL
        - protocol: TCP
          port: 6379 # Redis
    - to: [] # External API calls
      ports:
        - protocol: TCP
          port: 443
        - protocol: TCP
          port: 80
```

### Pod Security Standards

```yaml
# pod-security-policies.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: intelgraph-core
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
---
apiVersion: v1
kind: Namespace
metadata:
  name: intelgraph-maestro
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### Secret Management

```bash
#!/bin/bash
# secrets-setup.sh

# Create database credentials
kubectl create secret generic postgres-credentials \
  --from-literal=username=intelgraph \
  --from-literal=password="$(openssl rand -base64 32)" \
  --from-literal=uri="postgresql://intelgraph:password@postgres-cluster:5432/intelgraph" \
  --namespace=intelgraph-core

# Create Neo4j credentials
kubectl create secret generic neo4j-auth \
  --from-literal=username=neo4j \
  --from-literal=password="$(openssl rand -base64 32)" \
  --from-literal=auth="neo4j/$(openssl rand -base64 32)" \
  --namespace=intelgraph-core

# Create JWT secret
kubectl create secret generic jwt-secret \
  --from-literal=secret="$(openssl rand -base64 64)" \
  --namespace=intelgraph-core

# Create AI model API keys (replace with actual keys)
kubectl create secret generic ai-model-keys \
  --from-literal=openai="sk-your-openai-key" \
  --from-literal=anthropic="your-anthropic-key" \
  --from-literal=google="your-google-ai-key" \
  --namespace=intelgraph-maestro

# Create TLS certificates
kubectl create secret tls intelgraph-tls \
  --cert=./certs/intelgraph.crt \
  --key=./certs/intelgraph.key \
  --namespace=intelgraph-core
```

## Ingress and Load Balancing

### NGINX Ingress Configuration

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: intelgraph-ingress
  namespace: intelgraph-core
  annotations:
    kubernetes.io/ingress.class: 'nginx'
    cert-manager.io/cluster-issuer: 'letsencrypt-prod'
    nginx.ingress.kubernetes.io/ssl-redirect: 'true'
    nginx.ingress.kubernetes.io/use-regex: 'true'
    nginx.ingress.kubernetes.io/cors-allow-origin: '*'
    nginx.ingress.kubernetes.io/cors-allow-methods: 'GET, PUT, POST, DELETE, OPTIONS'
    nginx.ingress.kubernetes.io/cors-allow-headers: 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization'
    nginx.ingress.kubernetes.io/rate-limit: '1000'
    nginx.ingress.kubernetes.io/rate-limit-window: '1m'
spec:
  tls:
    - hosts:
        - api.intelgraph.ai
        - app.intelgraph.ai
      secretName: intelgraph-tls
  rules:
    - host: api.intelgraph.ai
      http:
        paths:
          - path: /v2
            pathType: Prefix
            backend:
              service:
                name: intelgraph-core
                port:
                  number: 80
          - path: /graphql
            pathType: Prefix
            backend:
              service:
                name: intelgraph-core
                port:
                  number: 4001
    - host: maestro.intelgraph.ai
      http:
        paths:
          - path: /v1
            pathType: Prefix
            backend:
              service:
                name: maestro-orchestrator
                port:
                  number: 4001
```

## Monitoring and Observability

### Prometheus Configuration

```yaml
# prometheus.yaml
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: prometheus
  namespace: intelgraph-monitoring
spec:
  serviceAccountName: prometheus
  serviceMonitorSelector:
    matchLabels:
      monitoring: intelgraph
  ruleSelector:
    matchLabels:
      monitoring: intelgraph
  resources:
    requests:
      memory: 4Gi
      cpu: 1000m
    limits:
      memory: 8Gi
      cpu: 2000m
  retention: 30d
  storage:
    volumeClaimTemplate:
      spec:
        storageClassName: fast-ssd
        accessModes:
          - ReadWriteOnce
        resources:
          requests:
            storage: 500Gi
  alerting:
    alertmanagers:
      - namespace: intelgraph-monitoring
        name: alertmanager
        port: web
```

### Grafana Dashboard Configuration

```yaml
# grafana-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboards
  namespace: intelgraph-monitoring
data:
  intelgraph-overview.json: |
    {
      "dashboard": {
        "id": null,
        "title": "IntelGraph Platform Overview",
        "tags": ["intelgraph", "production"],
        "panels": [
          {
            "id": 1,
            "title": "Orchestration Success Rate",
            "type": "stat",
            "targets": [
              {
                "expr": "rate(maestro_orchestration_success[5m]) * 100"
              }
            ]
          },
          {
            "id": 2,
            "title": "Average Response Time",
            "type": "graph",
            "targets": [
              {
                "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
              }
            ]
          }
        ]
      }
    }
```

## Backup and Disaster Recovery

### Automated Backup Script

```bash
#!/bin/bash
# backup-production.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/intelgraph/${DATE}"
S3_BUCKET="s3://intelgraph-production-backups"

echo "Starting production backup at ${DATE}"

# Create backup directory
mkdir -p ${BACKUP_DIR}

# Backup Neo4j
echo "Backing up Neo4j..."
kubectl exec -n intelgraph-core neo4j-0 -- \
  neo4j-admin dump --database=neo4j --to=/backups/neo4j_${DATE}.dump

kubectl cp intelgraph-core/neo4j-0:/backups/neo4j_${DATE}.dump \
  ${BACKUP_DIR}/neo4j_${DATE}.dump

# Backup PostgreSQL using CNPG
echo "Backing up PostgreSQL..."
kubectl cnpg backup postgres-cluster \
  --backup-name=postgres-backup-${DATE} \
  --namespace=intelgraph-core

# Backup Redis
echo "Backing up Redis..."
kubectl exec -n intelgraph-core redis-0 -- redis-cli BGSAVE
kubectl cp intelgraph-core/redis-0:/data/dump.rdb \
  ${BACKUP_DIR}/redis_${DATE}.rdb

# Backup Kubernetes configurations
echo "Backing up Kubernetes configurations..."
kubectl get all,configmaps,secrets,pvc -n intelgraph-core -o yaml > \
  ${BACKUP_DIR}/k8s_core_${DATE}.yaml
kubectl get all,configmaps,secrets,pvc -n intelgraph-maestro -o yaml > \
  ${BACKUP_DIR}/k8s_maestro_${DATE}.yaml

# Upload to S3
echo "Uploading to S3..."
aws s3 cp ${BACKUP_DIR} ${S3_BUCKET}/${DATE}/ --recursive

# Cleanup old local backups (keep last 7 days)
find /backups/intelgraph -type d -mtime +7 -exec rm -rf {} +

echo "Backup completed successfully"
```

### Disaster Recovery Plan

```yaml
# dr-restore.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: disaster-recovery-restore
  namespace: intelgraph-core
spec:
  template:
    spec:
      restartPolicy: OnFailure
      containers:
        - name: restore
          image: intelgraph/dr-tools:latest
          env:
            - name: BACKUP_DATE
              value: '20240115_120000'
            - name: S3_BUCKET
              value: 's3://intelgraph-production-backups'
          command:
            - /bin/bash
            - -c
            - |
              echo "Starting disaster recovery restore..."

              # Download backups from S3
              aws s3 cp ${S3_BUCKET}/${BACKUP_DATE}/ /restore/ --recursive

              # Restore Neo4j
              kubectl exec -n intelgraph-core neo4j-0 -- \
                neo4j-admin load --from=/restore/neo4j_${BACKUP_DATE}.dump --force

              # Restore PostgreSQL
              kubectl cnpg restore postgres-cluster \
                --backup-name=postgres-backup-${BACKUP_DATE} \
                --namespace=intelgraph-core

              # Restore Redis
              kubectl cp /restore/redis_${BACKUP_DATE}.rdb \
                intelgraph-core/redis-0:/data/dump.rdb
              kubectl exec -n intelgraph-core redis-0 -- redis-cli DEBUG RESTART

              echo "Disaster recovery restore completed"
          volumeMounts:
            - name: restore-storage
              mountPath: /restore
      volumes:
        - name: restore-storage
          emptyDir:
            sizeLimit: 1Ti
```

## Performance Tuning

### Database Optimization

```sql
-- Neo4j performance optimization
// Create necessary indexes
CREATE INDEX entity_type_index IF NOT EXISTS FOR (n:Entity) ON (n.type);
CREATE INDEX entity_created_index IF NOT EXISTS FOR (n:Entity) ON (n.createdAt);
CREATE INDEX relationship_type_index IF NOT EXISTS FOR ()-[r]-() ON (r.type);

// Query optimization
CALL apoc.periodic.iterate(
  "MATCH (n) RETURN n",
  "SET n.indexed = true",
  {batchSize:10000, parallel:false}
);

// Database statistics update
CALL db.resampleIndex("entity_type_index");
CALL db.resampleIndex("relationship_type_index");
```

```sql
-- PostgreSQL performance tuning
-- Update configuration
ALTER SYSTEM SET shared_buffers = '8GB';
ALTER SYSTEM SET effective_cache_size = '24GB';
ALTER SYSTEM SET maintenance_work_mem = '2GB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '64MB';
ALTER SYSTEM SET default_statistics_target = 500;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
ALTER SYSTEM SET work_mem = '50MB';

-- Reload configuration
SELECT pg_reload_conf();

-- Create performance indexes
CREATE INDEX CONCURRENTLY idx_orchestration_logs_tenant_time
ON orchestration_logs(tenant_id, created_at DESC)
WHERE created_at > NOW() - INTERVAL '90 days';

CREATE INDEX CONCURRENTLY idx_model_performance_updated
ON model_performance(last_updated DESC)
WHERE last_updated > NOW() - INTERVAL '7 days';

-- Update table statistics
ANALYZE orchestration_logs;
ANALYZE model_performance;
ANALYZE audit_logs;
```

### Application Performance Tuning

```yaml
# performance-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: performance-config
  namespace: intelgraph-core
data:
  # Node.js optimization
  NODE_OPTIONS: '--max-old-space-size=4096 --max-semi-space-size=256'
  UV_THREADPOOL_SIZE: '16'

  # Database connection pooling
  DB_POOL_MIN: '10'
  DB_POOL_MAX: '50'
  DB_POOL_IDLE_TIMEOUT: '30000'

  # Redis configuration
  REDIS_POOL_SIZE: '20'
  REDIS_RETRY_DELAY_ON_FAILURE: '100'
  REDIS_MAX_RETRY_DELAY_ON_FAILURE: '1000'

  # HTTP/GraphQL optimization
  HTTP_KEEP_ALIVE_TIMEOUT: '65000'
  HTTP_HEADERS_TIMEOUT: '66000'
  GRAPHQL_INTROSPECTION: 'false'
  GRAPHQL_PLAYGROUND: 'false'

  # Caching configuration
  CACHE_TTL_SHORT: '300' # 5 minutes
  CACHE_TTL_MEDIUM: '1800' # 30 minutes
  CACHE_TTL_LONG: '3600' # 1 hour
```

## Scaling Configuration

### Horizontal Pod Autoscaler

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: intelgraph-core-hpa
  namespace: intelgraph-core
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: intelgraph-core
  minReplicas: 6
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
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: '1000'
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: maestro-orchestrator-hpa
  namespace: intelgraph-maestro
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: maestro-orchestrator
  minReplicas: 4
  maxReplicas: 12
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 70
```

### Vertical Pod Autoscaler

```yaml
# vpa.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: intelgraph-core-vpa
  namespace: intelgraph-core
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: intelgraph-core
  updatePolicy:
    updateMode: 'Auto'
  resourcePolicy:
    containerPolicies:
      - containerName: intelgraph-core
        minAllowed:
          cpu: 100m
          memory: 512Mi
        maxAllowed:
          cpu: 2000m
          memory: 8Gi
        controlledResources: ['cpu', 'memory']
```

## Health Checks and Validation

### Deployment Validation Script

```bash
#!/bin/bash
# validate-deployment.sh

echo "=== IntelGraph Production Deployment Validation ==="

# Check all pods are running
echo "1. Checking pod status..."
kubectl get pods -n intelgraph-core -o wide
kubectl get pods -n intelgraph-maestro -o wide
kubectl get pods -n intelgraph-monitoring -o wide

# Check services
echo "2. Checking services..."
kubectl get svc -n intelgraph-core
kubectl get svc -n intelgraph-maestro

# Health checks
echo "3. Running health checks..."
CORE_HEALTH=$(kubectl run test-core --rm -i --restart=Never --image=curlimages/curl -- curl -s http://intelgraph-core.intelgraph-core/health | jq -r '.status')
MAESTRO_HEALTH=$(kubectl run test-maestro --rm -i --restart=Never --image=curlimages/curl -- curl -s http://maestro-orchestrator.intelgraph-maestro/v1/health | jq -r '.status')

echo "IntelGraph Core Health: $CORE_HEALTH"
echo "Maestro Health: $MAESTRO_HEALTH"

# Database connectivity
echo "4. Testing database connectivity..."
kubectl exec -n intelgraph-core postgres-cluster-1 -- pg_isready
kubectl exec -n intelgraph-core neo4j-0 -- neo4j status
kubectl exec -n intelgraph-core redis-0 -- redis-cli ping

# API endpoints
echo "5. Testing API endpoints..."
curl -f https://api.intelgraph.ai/v2/health
curl -f https://maestro.intelgraph.ai/v1/health

# Load balancer status
echo "6. Checking load balancer..."
kubectl get ingress -n intelgraph-core

echo "=== Validation Complete ==="
```

## Post-Deployment Checklist

### Security Verification

- [ ] All secrets properly encrypted and mounted
- [ ] Network policies applied and tested
- [ ] RBAC permissions configured correctly
- [ ] Pod security policies enforced
- [ ] TLS certificates installed and valid
- [ ] Vulnerability scanning completed

### Performance Verification

- [ ] Resource limits and requests configured
- [ ] HPA and VPA policies active
- [ ] Database performance optimized
- [ ] Caching layers functioning
- [ ] CDN configured (if applicable)
- [ ] Load testing completed

### Monitoring Verification

- [ ] Prometheus scraping all services
- [ ] Grafana dashboards displaying data
- [ ] Alerts configured and tested
- [ ] Log aggregation working
- [ ] Distributed tracing active
- [ ] Health checks responding correctly

### Backup Verification

- [ ] Automated backups configured
- [ ] Backup restoration tested
- [ ] Retention policies set
- [ ] Cross-region replication enabled
- [ ] Disaster recovery plan documented
- [ ] Recovery time objectives (RTO) met

### Compliance Verification

- [ ] Audit logging enabled
- [ ] Data retention policies applied
- [ ] Privacy controls implemented
- [ ] Compliance reports generated
- [ ] Incident response procedures documented
- [ ] Change management process established

---

**Document Version**: 1.0  
**Last Updated**: $(date)  
**Deployment Engineer**: [Name]  
**Approved By**: Platform Engineering Lead
