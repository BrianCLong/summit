# IntelGraph Platform - Production Deployment Guide v2.5.0

**Version:** 2.5.0 "Autonomous Intelligence"  
**Last Updated:** September 1, 2025  
**Audience:** DevOps Engineers, Platform Administrators, Site Reliability Engineers

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Infrastructure Setup](#infrastructure-setup)
4. [Database Deployment](#database-deployment)
5. [Application Deployment](#application-deployment)
6. [Security Configuration](#security-configuration)
7. [Monitoring & Observability](#monitoring--observability)
8. [Backup & Disaster Recovery](#backup--disaster-recovery)
9. [Performance Tuning](#performance-tuning)
10. [Post-Deployment Validation](#post-deployment-validation)
11. [Troubleshooting](#troubleshooting)
12. [Maintenance Procedures](#maintenance-procedures)

---

## Overview

This guide provides step-by-step instructions for deploying the IntelGraph Platform v2.5.0 "Autonomous Intelligence" to a production environment. The deployment includes the new **Autonomous Build Operator**, **Premium Model Routing**, **Compliance & Policy Engine**, and comprehensive **Performance Optimization** suite.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Production Architecture                   │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Ingress   │  │     WAF     │  │     CDN     │        │
│  │    NGINX    │  │  Security   │  │  CloudFlare │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│           │               │               │                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Kubernetes Cluster                        │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │ │
│  │  │ IntelGraph  │ │   Maestro   │ │ Monitoring  │      │ │
│  │  │    Core     │ │ Autonomous  │ │   Stack     │      │ │
│  │  │             │ │ Orchestrator│ │             │      │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘      │ │
│  └─────────────────────────────────────────────────────────┘ │
│           │               │               │                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ PostgreSQL  │  │    Neo4j    │  │    Redis    │        │
│  │  Cluster    │  │   Cluster   │  │   Cluster   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

- **IntelGraph Core:** Main intelligence analysis platform
- **Maestro Orchestrator:** Autonomous build and orchestration system
- **Premium Routing:** Thompson sampling-based AI model optimization
- **Policy Engine:** OPA-based compliance and governance
- **Monitoring Stack:** Prometheus, Grafana, OTEL tracing
- **Database Cluster:** PostgreSQL, Neo4j, Redis for data persistence

---

## Prerequisites

### Hardware Requirements

#### **Minimum Production Requirements**

```yaml
compute_nodes: 5
cpu_per_node: 8 cores (16 vCPUs)
memory_per_node: 32 GB RAM
storage_per_node: 500 GB NVMe SSD
network: 10 Gbps connection
```

#### **Recommended Production Requirements**

```yaml
compute_nodes: 10
cpu_per_node: 16 cores (32 vCPUs)
memory_per_node: 64 GB RAM
storage_per_node: 1 TB NVMe SSD
network: 25 Gbps connection
```

#### **High-Availability Requirements**

```yaml
compute_nodes: 15+ (across 3 AZs)
cpu_per_node: 32 cores (64 vCPUs)
memory_per_node: 128 GB RAM
storage_per_node: 2 TB NVMe SSD
network: 100 Gbps connection
```

### Software Requirements

#### **Kubernetes Cluster**

- **Version:** 1.28+ (1.29+ recommended)
- **CNI:** Calico, Cilium, or Flannel with Network Policy support
- **CSI:** Block and file storage support
- **Ingress:** NGINX Ingress Controller v1.8+

#### **Container Runtime**

- **containerd:** v1.7+ (recommended)
- **Docker:** v24+ (alternative)
- **Image Registry:** Private registry with RBAC and scanning

#### **External Dependencies**

- **PostgreSQL:** v14+ (v15+ recommended)
- **Neo4j:** v5.13+ (latest recommended)
- **Redis:** v7.0+ (v7.2+ recommended)
- **HashiCorp Vault:** v1.15+ (for secrets management)

### Network Requirements

#### **Internal Network**

```yaml
cluster_cidr: 10.244.0.0/16
service_cidr: 10.96.0.0/12
pod_cidr: 10.244.0.0/16
```

#### **External Access**

```yaml
public_endpoints:
  - api.intelgraph.ai
  - maestro.intelgraph.ai
  - grafana.intelgraph.ai

private_endpoints:
  - internal-api.intelgraph.ai
  - admin.intelgraph.ai
```

#### **Security Groups / Firewall Rules**

```yaml
ingress_rules:
  - protocol: HTTPS
    port: 443
    source: 0.0.0.0/0
  - protocol: HTTP
    port: 80
    source: 0.0.0.0/0 (redirect to HTTPS)

internal_rules:
  - protocol: TCP
    ports: [5432, 7687, 6379]
    source: cluster_cidr
```

---

## Infrastructure Setup

### 1. Kubernetes Cluster Setup

#### **Using kubeadm (On-Premises)**

```bash
# Install kubeadm, kubelet, kubectl
curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key add -
echo "deb https://apt.kubernetes.io/ kubernetes-xenial main" | sudo tee /etc/apt/sources.list.d/kubernetes.list
sudo apt-get update && sudo apt-get install -y kubelet=1.29.0-00 kubeadm=1.29.0-00 kubectl=1.29.0-00

# Initialize master node
sudo kubeadm init --pod-network-cidr=10.244.0.0/16 --kubernetes-version=v1.29.0

# Setup kubectl
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

# Install CNI (Calico recommended)
kubectl apply -f https://docs.projectcalico.org/manifests/calico.yaml

# Join worker nodes
kubeadm token create --print-join-command
```

#### **Using Managed Kubernetes (EKS/GKE/AKS)**

##### **AWS EKS Setup**

```bash
# Install eksctl
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin

# Create EKS cluster
eksctl create cluster \
  --name intelgraph-prod \
  --version 1.29 \
  --region us-west-2 \
  --zones us-west-2a,us-west-2b,us-west-2c \
  --nodegroup-name standard-workers \
  --node-type m6i.2xlarge \
  --nodes 5 \
  --nodes-min 3 \
  --nodes-max 20 \
  --managed \
  --enable-ssm \
  --vpc-nat-mode Single
```

##### **Google GKE Setup**

```bash
# Create GKE cluster
gcloud container clusters create intelgraph-prod \
  --zone us-west1-a \
  --num-nodes 5 \
  --machine-type n2-standard-8 \
  --disk-type pd-ssd \
  --disk-size 100 \
  --enable-ip-alias \
  --enable-autoscaling \
  --min-nodes 3 \
  --max-nodes 20 \
  --enable-autorepair \
  --enable-autoupgrade
```

### 2. Storage Configuration

#### **Persistent Volume Setup**

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: kubernetes.io/gce-pd # or appropriate CSI driver
parameters:
  type: pd-ssd
  replication-type: regional-pd
  zones: us-west1-a,us-west1-b,us-west1-c
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

#### **Apply Storage Classes**

```bash
kubectl apply -f - <<EOF
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: intelgraph-fast
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: kubernetes.io/aws-ebs # Adjust for your cloud provider
parameters:
  type: gp3
  iops: "3000"
  throughput: "250"
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
EOF
```

### 3. Namespace Setup

```bash
# Create namespaces
kubectl create namespace intelgraph
kubectl create namespace intelgraph-system
kubectl create namespace monitoring
kubectl create namespace security

# Label namespaces
kubectl label namespace intelgraph istio-injection=enabled
kubectl label namespace intelgraph-system pod-security.kubernetes.io/enforce=restricted
```

---

## Database Deployment

### 1. PostgreSQL Cluster Deployment

#### **Using Helm (CloudNativePG)**

```bash
# Add CloudNativePG operator
helm repo add cnpg https://cloudnative-pg.github.io/charts
helm repo update

# Install operator
helm install cnpg-operator cnpg/cloudnative-pg \
  --namespace cnpg-system \
  --create-namespace

# Deploy PostgreSQL cluster
kubectl apply -f - <<EOF
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: intelgraph-postgres
  namespace: intelgraph
spec:
  instances: 3

  postgresql:
    parameters:
      max_connections: "500"
      shared_buffers: "256MB"
      effective_cache_size: "1GB"
      work_mem: "16MB"
      max_worker_processes: "8"

  bootstrap:
    initdb:
      database: intelgraph
      owner: intelgraph
      secret:
        name: postgres-credentials

  storage:
    size: 500Gi
    storageClass: fast-ssd

  monitoring:
    enabled: true

  backup:
    retentionPolicy: "30d"
    barmanObjectStore:
      destinationPath: "s3://intelgraph-backups/postgres"
      wal:
        retention: "7d"
EOF
```

#### **Create Database Credentials**

```bash
kubectl create secret generic postgres-credentials \
  --namespace intelgraph \
  --from-literal=username=intelgraph \
  --from-literal=password=$(openssl rand -base64 32)
```

### 2. Neo4j Cluster Deployment

#### **Using Neo4j Helm Chart**

```bash
# Add Neo4j Helm repository
helm repo add neo4j https://helm.neo4j.com/neo4j
helm repo update

# Create Neo4j configuration
kubectl create configmap neo4j-config \
  --namespace intelgraph \
  --from-literal=NEO4J_dbms_memory_heap_initial__size=2g \
  --from-literal=NEO4J_dbms_memory_heap_max__size=4g \
  --from-literal=NEO4J_dbms_memory_pagecache_size=2g \
  --from-literal=NEO4J_dbms_default__listen__address=0.0.0.0

# Deploy Neo4j cluster
helm install neo4j-cluster neo4j/neo4j \
  --namespace intelgraph \
  --set core.numberOfServers=3 \
  --set readReplica.numberOfServers=2 \
  --set acceptLicenseAgreement=yes \
  --set neo4j.edition=enterprise \
  --set neo4j.password=changeme \
  --set volumes.data.mode=dynamic \
  --set volumes.data.dynamic.storageClassName=fast-ssd \
  --set volumes.data.dynamic.requests.storage=200Gi
```

### 3. Redis Cluster Deployment

#### **Using Redis Operator**

```bash
# Install Redis Operator
kubectl apply -f https://raw.githubusercontent.com/OT-CONTAINER-KIT/redis-operator/master/config/manager/manager.yaml

# Deploy Redis cluster
kubectl apply -f - <<EOF
apiVersion: redis.redis.opstreelabs.in/v1beta1
kind: RedisCluster
metadata:
  name: intelgraph-redis
  namespace: intelgraph
spec:
  clusterSize: 6
  clusterVersion: v7.2.0
  securityContext:
    runAsUser: 1000
    fsGroup: 1000
  persistentVolume:
    enabled: true
    storageClassName: fast-ssd
    accessModes: ["ReadWriteOnce"]
    size: 50Gi
  redisExporter:
    enabled: true
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 512Mi
EOF
```

---

## Application Deployment

### 1. Helm Chart Installation

#### **Add IntelGraph Helm Repository**

```bash
# Add the repository
helm repo add intelgraph https://charts.intelgraph.ai
helm repo update
```

#### **Create Values File**

Create `production-values.yaml`:

```yaml
# production-values.yaml
global:
  imageRegistry: 'registry.intelgraph.ai'
  imageTag: 'v2.5.0'
  environment: 'production'

intelgraph:
  replicaCount: 5
  image:
    repository: intelgraph/core
    tag: 'v2.5.0'
    pullPolicy: IfNotPresent

  service:
    type: ClusterIP
    port: 3000

  ingress:
    enabled: true
    className: nginx
    annotations:
      cert-manager.io/cluster-issuer: letsencrypt-prod
      nginx.ingress.kubernetes.io/rate-limit: '1000'
    hosts:
      - host: api.intelgraph.ai
        paths:
          - path: /
            pathType: Prefix
    tls:
      - secretName: intelgraph-tls
        hosts:
          - api.intelgraph.ai

  resources:
    requests:
      cpu: 1000m
      memory: 2Gi
    limits:
      cpu: 4000m
      memory: 8Gi

  autoscaling:
    enabled: true
    minReplicas: 5
    maxReplicas: 50
    targetCPUUtilizationPercentage: 70
    targetMemoryUtilizationPercentage: 80

maestro:
  enabled: true
  replicaCount: 3
  image:
    repository: intelgraph/maestro
    tag: 'v2.5.0'

  autonomousOrchestrator:
    enabled: true
    autonomyLevel: 2 # Guarded auto-plan
    maxConcurrentRuns: 50

  premiumRouting:
    enabled: true
    thompsonSampling: true
    models:
      - name: claude-sonnet-3.5
        weight: 0.4
      - name: gpt-4o
        weight: 0.3
      - name: gemini-ultra
        weight: 0.3

  policyEngine:
    enabled: true
    opaUrl: http://opa.security.svc.cluster.local:8181
    complianceFrameworks:
      - SOX
      - GDPR
      - SOC2

  resources:
    requests:
      cpu: 2000m
      memory: 4Gi
    limits:
      cpu: 8000m
      memory: 16Gi

databases:
  postgresql:
    enabled: false # Using external cluster
    host: intelgraph-postgres-rw.intelgraph.svc.cluster.local
    port: 5432
    database: intelgraph
    existingSecret: postgres-credentials

  neo4j:
    enabled: false # Using external cluster
    host: neo4j-cluster.intelgraph.svc.cluster.local
    port: 7687
    existingSecret: neo4j-credentials

  redis:
    enabled: false # Using external cluster
    host: intelgraph-redis.intelgraph.svc.cluster.local
    port: 6379

monitoring:
  prometheus:
    enabled: true
    serviceMonitor: true
  grafana:
    enabled: true
  jaeger:
    enabled: true

security:
  networkPolicies:
    enabled: true
  podSecurityPolicy:
    enabled: true
  rbac:
    create: true
```

#### **Deploy Application**

```bash
# Install the application
helm install intelgraph intelgraph/intelgraph \
  --namespace intelgraph \
  --values production-values.yaml \
  --wait \
  --timeout 20m

# Verify deployment
kubectl get pods -n intelgraph
kubectl get services -n intelgraph
kubectl get ingress -n intelgraph
```

### 2. Manual Deployment (Alternative)

If you prefer manual deployment using kubectl:

```bash
# Apply all Kubernetes manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmaps/
kubectl apply -f k8s/secrets/
kubectl apply -f k8s/deployments/
kubectl apply -f k8s/services/
kubectl apply -f k8s/ingress/
kubectl apply -f k8s/monitoring/

# Wait for deployments to be ready
kubectl rollout status deployment/intelgraph-core -n intelgraph
kubectl rollout status deployment/maestro-orchestrator -n intelgraph
```

---

## Security Configuration

### 1. TLS/SSL Setup

#### **Install cert-manager**

```bash
# Add cert-manager Helm repository
helm repo add jetstack https://charts.jetstack.io
helm repo update

# Install cert-manager
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version v1.13.0 \
  --set installCRDs=true

# Create ClusterIssuer for Let's Encrypt
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@intelgraph.ai
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### 2. Network Policies

```bash
# Apply network policies
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: intelgraph-network-policy
  namespace: intelgraph
spec:
  podSelector:
    matchLabels:
      app: intelgraph
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: intelgraph
    ports:
    - protocol: TCP
      port: 5432  # PostgreSQL
    - protocol: TCP
      port: 7687  # Neo4j
    - protocol: TCP
      port: 6379  # Redis
  - to: []
    ports:
    - protocol: TCP
      port: 443   # HTTPS
    - protocol: UDP
      port: 53    # DNS
EOF
```

### 3. RBAC Configuration

```bash
# Create service accounts and RBAC
kubectl apply -f - <<EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  name: intelgraph-sa
  namespace: intelgraph
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: intelgraph-role
  namespace: intelgraph
rules:
- apiGroups: [""]
  resources: ["secrets", "configmaps"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: intelgraph-rolebinding
  namespace: intelgraph
subjects:
- kind: ServiceAccount
  name: intelgraph-sa
  namespace: intelgraph
roleRef:
  kind: Role
  name: intelgraph-role
  apiGroup: rbac.authorization.k8s.io
EOF
```

### 4. Secrets Management

#### **Using External Secrets Operator**

```bash
# Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets \
  --create-namespace

# Configure SecretStore (HashiCorp Vault example)
kubectl apply -f - <<EOF
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: vault-backend
  namespace: intelgraph
spec:
  provider:
    vault:
      server: "https://vault.intelgraph.ai"
      path: "secret"
      version: "v2"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "intelgraph"
EOF
```

---

## Monitoring & Observability

### 1. Prometheus Stack Installation

```bash
# Install Prometheus stack
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.prometheusSpec.retention=30d \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.storageClassName=fast-ssd \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=100Gi \
  --set grafana.persistence.enabled=true \
  --set grafana.persistence.storageClassName=fast-ssd \
  --set grafana.persistence.size=20Gi
```

### 2. Custom Dashboards

```bash
# Import IntelGraph dashboards
kubectl create configmap intelgraph-dashboards \
  --namespace monitoring \
  --from-file=charts/monitoring/dashboards/
```

### 3. Jaeger Tracing

```bash
# Install Jaeger Operator
kubectl create namespace observability
kubectl apply -f https://github.com/jaegertracing/jaeger-operator/releases/download/v1.57.0/jaeger-operator.yaml -n observability

# Deploy Jaeger instance
kubectl apply -f - <<EOF
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: jaeger-prod
  namespace: observability
spec:
  strategy: production
  storage:
    type: elasticsearch
    options:
      es:
        server-urls: http://elasticsearch.observability.svc.cluster.local:9200
EOF
```

---

## Backup & Disaster Recovery

### 1. Database Backups

#### **PostgreSQL Backup**

```bash
# Configure automated backups in CloudNativePG cluster
kubectl patch cluster intelgraph-postgres -n intelgraph --type merge -p '{
  "spec": {
    "backup": {
      "retentionPolicy": "30d",
      "barmanObjectStore": {
        "destinationPath": "s3://intelgraph-backups/postgres",
        "s3Credentials": {
          "accessKeyId": {
            "name": "backup-credentials",
            "key": "ACCESS_KEY_ID"
          },
          "secretAccessKey": {
            "name": "backup-credentials",
            "key": "SECRET_ACCESS_KEY"
          }
        },
        "wal": {
          "retention": "7d"
        }
      }
    }
  }
}'
```

#### **Neo4j Backup**

```bash
# Create backup CronJob
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: CronJob
metadata:
  name: neo4j-backup
  namespace: intelgraph
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: neo4j-backup
            image: neo4j:5.13-enterprise
            command:
            - /bin/bash
            - -c
            - |
              neo4j-admin database dump \
                --to-path=/backups \
                --database=neo4j \
                --verbose
              aws s3 cp /backups/ s3://intelgraph-backups/neo4j/$(date +%Y%m%d)/ --recursive
            env:
            - name: NEO4J_AUTH
              valueFrom:
                secretKeyRef:
                  name: neo4j-credentials
                  key: auth
            volumeMounts:
            - name: backup-storage
              mountPath: /backups
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: neo4j-backup-pvc
          restartPolicy: OnFailure
EOF
```

### 2. Application State Backup

```bash
# Install Velero for cluster backup
helm repo add vmware-tanzu https://vmware-tanzu.github.io/helm-charts/
helm install velero vmware-tanzu/velero \
  --namespace velero \
  --create-namespace \
  --set configuration.provider=aws \
  --set configuration.backupStorageLocation.bucket=intelgraph-velero-backups \
  --set configuration.backupStorageLocation.prefix=prod \
  --set configuration.volumeSnapshotLocation.config.region=us-west-2 \
  --set serviceAccount.server.annotations."iam\.gke\.io/gcp-service-account"=velero@project.iam.gserviceaccount.com

# Create backup schedule
velero schedule create intelgraph-backup \
  --schedule="0 1 * * *" \
  --include-namespaces=intelgraph,intelgraph-system \
  --ttl=720h0m0s
```

---

## Performance Tuning

### 1. Resource Optimization

#### **CPU and Memory Tuning**

```yaml
# Update deployment resource limits
spec:
  containers:
    - name: intelgraph-core
      resources:
        requests:
          cpu: '2000m'
          memory: '4Gi'
        limits:
          cpu: '8000m'
          memory: '16Gi'
```

#### **JVM Tuning (for Neo4j)**

```yaml
env:
  - name: NEO4J_dbms_memory_heap_initial_size
    value: '4g'
  - name: NEO4J_dbms_memory_heap_max_size
    value: '8g'
  - name: NEO4J_dbms_memory_pagecache_size
    value: '4g'
  - name: NEO4J_dbms_jvm_additional
    value: '-XX:+UseG1GC -XX:+UnlockExperimentalVMOptions'
```

### 2. Database Performance

#### **PostgreSQL Tuning**

```sql
-- Execute these optimizations on PostgreSQL cluster
ALTER SYSTEM SET shared_buffers = '512MB';
ALTER SYSTEM SET effective_cache_size = '2GB';
ALTER SYSTEM SET work_mem = '32MB';
ALTER SYSTEM SET maintenance_work_mem = '256MB';
ALTER SYSTEM SET max_worker_processes = 16;
ALTER SYSTEM SET max_parallel_workers = 16;
ALTER SYSTEM SET max_parallel_workers_per_gather = 4;
SELECT pg_reload_conf();
```

#### **Neo4j Performance Configuration**

```bash
# Apply Neo4j performance settings
kubectl patch configmap neo4j-config -n intelgraph --patch '{
  "data": {
    "NEO4J_dbms_query_cache_size": "512",
    "NEO4J_dbms_tx_state_memory_allocation": "ON_HEAP",
    "NEO4J_dbms_memory_transaction_total_max": "1g",
    "NEO4J_dbms_checkpoint_interval_tx": "100000"
  }
}'
```

### 3. Application Performance

#### **Enable Performance Features**

```bash
# Update application configuration
kubectl patch configmap intelgraph-config -n intelgraph --patch '{
  "data": {
    "ENABLE_QUERY_CACHING": "true",
    "ENABLE_RESPONSE_COMPRESSION": "true",
    "ENABLE_CONNECTION_POOLING": "true",
    "MAX_CONCURRENT_REQUESTS": "1000",
    "THOMPSON_SAMPLING_ENABLED": "true"
  }
}'

# Restart deployments to apply changes
kubectl rollout restart deployment/intelgraph-core -n intelgraph
kubectl rollout restart deployment/maestro-orchestrator -n intelgraph
```

---

## Post-Deployment Validation

### 1. Health Checks

```bash
# Comprehensive health check script
#!/bin/bash

echo "🏥 IntelGraph Production Health Check"
echo "======================================="

# Check cluster health
echo "🔍 Checking Kubernetes cluster..."
kubectl cluster-info
kubectl get nodes -o wide

# Check namespace status
echo "📦 Checking namespaces..."
kubectl get pods -n intelgraph -o wide
kubectl get services -n intelgraph
kubectl get ingress -n intelgraph

# Check database connectivity
echo "🗄️  Checking database connectivity..."
kubectl exec -n intelgraph deployment/intelgraph-core -- nc -zv postgres-svc 5432
kubectl exec -n intelgraph deployment/intelgraph-core -- nc -zv neo4j-svc 7687
kubectl exec -n intelgraph deployment/intelgraph-core -- nc -zv redis-svc 6379

# Check application endpoints
echo "🌐 Checking application endpoints..."
curl -f https://api.intelgraph.ai/health
curl -f https://maestro.intelgraph.ai/api/maestro/v1/health

# Check monitoring stack
echo "📊 Checking monitoring..."
kubectl get pods -n monitoring
curl -f http://prometheus.monitoring.svc.cluster.local:9090/-/healthy
curl -f http://grafana.monitoring.svc.cluster.local/api/health

echo "✅ Health check completed!"
```

### 2. Performance Validation

```bash
# Performance test script
#!/bin/bash

echo "🚀 Performance Validation"
echo "========================="

# Test API response times
echo "⏱️  Testing API response times..."
for i in {1..10}; do
  curl -w "%{time_total}s\n" -o /dev/null -s https://api.intelgraph.ai/health
done

# Test concurrent requests
echo "🔄 Testing concurrent load..."
ab -n 1000 -c 50 https://api.intelgraph.ai/health

# Test autonomous orchestrator
echo "🤖 Testing autonomous orchestrator..."
curl -X POST https://maestro.intelgraph.ai/api/maestro/v1/runs \
  -H "Authorization: Bearer $API_TOKEN" \
  -d '{
    "goal": "Performance test workflow",
    "autonomy": 2,
    "mode": "PLAN"
  }'

echo "✅ Performance validation completed!"
```

### 3. Security Validation

```bash
# Security validation script
#!/bin/bash

echo "🔒 Security Validation"
echo "======================"

# Check TLS certificates
echo "🔐 Checking TLS certificates..."
openssl s_client -connect api.intelgraph.ai:443 -servername api.intelgraph.ai < /dev/null 2>/dev/null | openssl x509 -noout -dates

# Check network policies
echo "🛡️  Checking network policies..."
kubectl get networkpolicies -A

# Check RBAC
echo "👤 Checking RBAC..."
kubectl auth can-i --list --as=system:serviceaccount:intelgraph:intelgraph-sa

# Check pod security
echo "🔒 Checking pod security..."
kubectl get pods -n intelgraph -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.securityContext}{"\n"}{end}'

echo "✅ Security validation completed!"
```

---

## Troubleshooting

### Common Issues and Solutions

#### **1. Pod Startup Issues**

```bash
# Debug pod startup problems
kubectl describe pod <pod-name> -n intelgraph
kubectl logs <pod-name> -n intelgraph --previous

# Check resource constraints
kubectl top pods -n intelgraph
kubectl describe nodes
```

#### **2. Database Connection Issues**

```bash
# Test database connectivity
kubectl run -it --rm debug --image=postgres:15 -- psql -h intelgraph-postgres-rw.intelgraph.svc.cluster.local -U intelgraph

# Check database status
kubectl exec -it intelgraph-postgres-1 -n intelgraph -- pg_isready
kubectl exec -it neo4j-cluster-core-0 -n intelgraph -- cypher-shell "CALL db.ping()"
```

#### **3. Performance Issues**

```bash
# Monitor resource usage
kubectl top pods -n intelgraph --sort-by=memory
kubectl top nodes

# Check application metrics
curl https://api.intelgraph.ai/metrics
curl https://maestro.intelgraph.ai/api/maestro/v1/metrics
```

#### **4. Network Connectivity Issues**

```bash
# Test internal networking
kubectl run -it --rm netshoot --image=nicolaka/netshoot
# From inside the container:
nslookup intelgraph-core.intelgraph.svc.cluster.local
nc -zv intelgraph-core.intelgraph.svc.cluster.local 3000
```

### Emergency Procedures

#### **Service Restart**

```bash
# Restart specific services
kubectl rollout restart deployment/intelgraph-core -n intelgraph
kubectl rollout restart deployment/maestro-orchestrator -n intelgraph

# Check rollout status
kubectl rollout status deployment/intelgraph-core -n intelgraph
```

#### **Database Recovery**

```bash
# PostgreSQL recovery
kubectl exec -it intelgraph-postgres-1 -n intelgraph -- pg_ctl reload

# Neo4j recovery
kubectl delete pod neo4j-cluster-core-0 -n intelgraph  # Pod will be recreated
```

#### **Full System Recovery**

```bash
# Restore from backup using Velero
velero restore create --from-backup intelgraph-backup-20250901
velero restore get
```

---

## Maintenance Procedures

### Regular Maintenance Tasks

#### **Weekly Tasks**

```bash
#!/bin/bash
# weekly-maintenance.sh

echo "📅 Weekly Maintenance - $(date)"
echo "=============================="

# Update application images
helm upgrade intelgraph intelgraph/intelgraph \
  --namespace intelgraph \
  --reuse-values \
  --set global.imageTag=latest

# Database maintenance
kubectl exec -it intelgraph-postgres-1 -n intelgraph -- psql -c "VACUUM ANALYZE;"

# Check resource usage
kubectl top pods -n intelgraph --sort-by=memory > weekly-resource-report.txt

echo "✅ Weekly maintenance completed!"
```

#### **Monthly Tasks**

```bash
#!/bin/bash
# monthly-maintenance.sh

echo "📅 Monthly Maintenance - $(date)"
echo "==============================="

# Update system packages
kubectl set image deployment/intelgraph-core intelgraph-core=intelgraph/core:$(date +%Y%m) -n intelgraph

# Backup retention cleanup
velero backup get | grep -E "$(date -d '90 days ago' +%Y%m)" | awk '{print $1}' | xargs velero backup delete

# Security audit
kubectl get pods -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[*].image}{"\n"}{end}' | grep -v $(date +%Y%m) > outdated-images.txt

echo "✅ Monthly maintenance completed!"
```

### Scaling Procedures

#### **Horizontal Scaling**

```bash
# Scale application replicas
kubectl scale deployment intelgraph-core --replicas=10 -n intelgraph
kubectl scale deployment maestro-orchestrator --replicas=5 -n intelgraph

# Scale database replicas
kubectl patch cluster intelgraph-postgres -n intelgraph --type merge -p '{"spec":{"instances":5}}'
```

#### **Vertical Scaling**

```bash
# Increase resource limits
kubectl patch deployment intelgraph-core -n intelgraph -p '{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "intelgraph-core",
          "resources": {
            "limits": {
              "cpu": "16000m",
              "memory": "32Gi"
            },
            "requests": {
              "cpu": "4000m",
              "memory": "8Gi"
            }
          }
        }]
      }
    }
  }
}'
```

---

## Conclusion

This production deployment guide provides comprehensive instructions for deploying IntelGraph Platform v2.5.0 "Autonomous Intelligence" to a production environment. The deployment includes enterprise-grade security, monitoring, backup, and performance optimization features.

### Key Success Metrics

- **Deployment Time:** < 4 hours for complete setup
- **System Availability:** 99.9% uptime SLA
- **Performance:** < 2s response times for 95% of requests
- **Security:** Zero vulnerabilities in production deployment
- **Scalability:** Support for 1M+ concurrent users

### Next Steps

1. **Monitor System Performance** using the deployed monitoring stack
2. **Configure Alerting** for critical system events
3. **Set Up Regular Backups** and test restore procedures
4. **Plan Capacity Scaling** based on usage patterns
5. **Schedule Regular Maintenance** using provided scripts

For additional support or questions about this deployment, please contact the IntelGraph support team or refer to the comprehensive documentation at [docs.intelgraph.ai](https://docs.intelgraph.ai).

**🎉 IntelGraph Platform v2.5.0 Production Deployment Complete!**
