#!/bin/bash
# Summit Application - Simple Cloud Launch for topicality.co
# This script deploys Summit to a Kubernetes cluster with your domain

set -e

echo "🚀 Summit Application - Simple Cloud Launch"
echo "=========================================="
echo "Preparing Summit for deployment to topicality.co"
echo

# Check prerequisites
echo "🔍 Checking prerequisites..."
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed or not in PATH"
    echo "Please install kubectl: https://kubernetes.io/docs/tasks/tools/"
    exit 1
fi

if ! command -v helm &> /dev/null; then
    echo "⚠️ Helm is not installed (recommended but not required)"
    echo "Install Helm for easier management: https://helm.sh/docs/intro/install/"
fi

echo "✅ kubectl is available"
echo

# Create namespace
echo "📂 Creating Kubernetes namespace..."
kubectl create namespace summit-app --dry-run=client -o yaml | kubectl apply -f -
echo

# Apply the Summit application configuration
echo "⚙️ Applying Summit application configuration..."
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: summit-config
  namespace: summit-app
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  CORS_ORIGIN: "https://topicality.co"
  ALLOWED_ORIGINS: "https://topicality.co"
  ENABLE_INSECURE_DEV_AUTH: "false"
  AI_ENABLED: "false"
  POLICY_DRY_RUN: "true"
  VITE_API_URL: "https://topicality.co/api/graphql"
  VITE_WS_URL: "wss://topicality.co/api/graphql"
---
apiVersion: v1
kind: Secret
metadata:
  name: summit-secrets
  namespace: summit-app
type: Opaque
data:
  postgres-password: c3VtaXRfcG9zdGdyZXNfcGFzc3dvcmQ=  # summit_postgres_password
  neo4j-password: c3VtaXRfbmVvNGpfcGFzc3dvcmQ=        # summit_neo4j_password
  jwt-secret: $(openssl rand -hex 32 | base64)
  jwt-refresh-secret: $(openssl rand -hex 32 | base64)
  session-secret: $(openssl rand -hex 32 | base64)
EOF
echo

# Deploy databases
echo "💾 Deploying databases..."
kubectl apply -f - <<EOF
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: neo4j-pvc
  namespace: summit-app
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  namespace: summit-app
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-pvc
  namespace: summit-app
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: neo4j
  namespace: summit-app
spec:
  serviceName: neo4j
  replicas: 1
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
        image: neo4j:2025.01-enterprise
        ports:
        - containerPort: 7474
          name: http
        - containerPort: 7687
          name: bolt
        env:
        - name: NEO4J_AUTH
          value: "neo4j:summit_neo4j_password"
        - name: NEO4J_server_memory_heap_max__size
          value: "2G"
        - name: NEO4J_server_memory_pagecache_size
          value: "1G"
        - name: NEO4J_server_cluster_enabled
          value: "false"
        volumeMounts:
        - name: neo4j-storage
          mountPath: /data
        resources:
          limits:
            memory: "4Gi"
            cpu: "2"
          requests:
            memory: "2Gi"
            cpu: "1"
        readinessProbe:
          httpGet:
            path: /
            port: 7474
          initialDelaySeconds: 60
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /
            port: 7474
          initialDelaySeconds: 120
          periodSeconds: 30
      volumes:
      - name: neo4j-storage
        persistentVolumeClaim:
          claimName: neo4j-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: neo4j
  namespace: summit-app
spec:
  selector:
    app: neo4j
  ports:
  - name: http
    port: 7474
    targetPort: 7474
  - name: bolt
    port: 7687
    targetPort: 7687
  type: ClusterIP
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: summit-app
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:16-alpine
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          value: "intelgraph"
        - name: POSTGRES_USER
          value: "intelgraph_user"
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: summit-secrets
              key: postgres-password
        - name: PGDATA
          value: "/var/lib/postgresql/data/pgdata"
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        resources:
          limits:
            memory: "2Gi"
            cpu: "1"
          requests:
            memory: "1Gi"
            cpu: "0.5"
        readinessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - intelgraph_user
            - -d
            - intelgraph
          initialDelaySeconds: 10
          periodSeconds: 10
        livenessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - intelgraph_user
            - -d
            - intelgraph
          initialDelaySeconds: 30
          periodSeconds: 30
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: summit-app
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
  type: ClusterIP
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: summit-app
spec:
  replicas: 1
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
        image: redis:7-alpine
        command:
        - redis-server
        - --appendonly
        - "yes"
        - --maxmemory
        - "512mb"
        - --maxmemory-policy
        - allkeys-lru
        ports:
        - containerPort: 6379
        volumeMounts:
        - name: redis-storage
          mountPath: /data
        resources:
          limits:
            memory: "1Gi"
            cpu: "0.5"
          requests:
            memory: "512Mi"
            cpu: "0.25"
        readinessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 5
          periodSeconds: 5
        livenessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 10
          periodSeconds: 10
      volumes:
      - name: redis-storage
        persistentVolumeClaim:
          claimName: redis-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: summit-app
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
  type: ClusterIP
EOF
echo

# Deploy Summit application services
echo "🏗️ Deploying Summit application services..."
kubectl apply -f - <<EOF
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: summit-server
  namespace: summit-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: summit-server
  template:
    metadata:
      labels:
        app: summit-server
    spec:
      containers:
      - name: summit-server
        image: ghcr.io/brianclong/summit-server:latest
        ports:
        - containerPort: 4000
        env:
        - name: DATABASE_URL
          value: "postgresql://intelgraph_user:$(kubectl get secret summit-secrets -n summit-app -o jsonpath='{.data.postgres-password}' | base64 -d)@postgres:5432/intelgraph"
        - name: NEO4J_URI
          value: "bolt://neo4j:7687"
        - name: NEO4J_USER
          value: "neo4j"
        - name: NEO4J_PASSWORD
          valueFrom:
            secretKeyRef:
              name: summit-secrets
              key: neo4j-password
        - name: REDIS_URL
          value: "redis://redis:6379"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: summit-secrets
              key: jwt-secret
        - name: JWT_REFRESH_SECRET
          valueFrom:
            secretKeyRef:
              name: summit-secrets
              key: jwt-refresh-secret
        - name: SESSION_SECRET
          valueFrom:
            secretKeyRef:
              name: summit-secrets
              key: session-secret
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: summit-config
              key: NODE_ENV
        - name: LOG_LEVEL
          valueFrom:
            configMapKeyRef:
              name: summit-config
              key: LOG_LEVEL
        - name: ENABLE_INSECURE_DEV_AUTH
          valueFrom:
            configMapKeyRef:
              name: summit-config
              key: ENABLE_INSECURE_DEV_AUTH
        - name: AI_ENABLED
          valueFrom:
            configMapKeyRef:
              name: summit-config
              key: AI_ENABLED
        - name: CORS_ORIGIN
          valueFrom:
            configMapKeyRef:
              name: summit-config
              key: CORS_ORIGIN
        - name: ALLOWED_ORIGINS
          valueFrom:
            configMapKeyRef:
              name: summit-config
              key: ALLOWED_ORIGINS
        resources:
          limits:
            memory: "4Gi"
            cpu: "2"
          requests:
            memory: "2Gi"
            cpu: "1"
        readinessProbe:
          httpGet:
            path: /health
            port: 4000
          initialDelaySeconds: 60
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /health
            port: 4000
          initialDelaySeconds: 120
          periodSeconds: 30
---
apiVersion: v1
kind: Service
metadata:
  name: summit-server
  namespace: summit-app
spec:
  selector:
    app: summit-server
  ports:
  - port: 4000
    targetPort: 4000
  type: ClusterIP
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: summit-web
  namespace: summit-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: summit-web
  template:
    metadata:
      labels:
        app: summit-web
    spec:
      containers:
      - name: summit-web
        image: ghcr.io/brianclong/summit-web:latest
        ports:
        - containerPort: 3000
        env:
        - name: VITE_API_URL
          valueFrom:
            configMapKeyRef:
              name: summit-config
              key: VITE_API_URL
        - name: VITE_WS_URL
          valueFrom:
            configMapKeyRef:
              name: summit-config
              key: VITE_WS_URL
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: summit-config
              key: NODE_ENV
        resources:
          limits:
            memory: "1Gi"
            cpu: "0.5"
          requests:
            memory: "512Mi"
            cpu: "0.25"
        readinessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: summit-web
  namespace: summit-app
spec:
  selector:
    app: summit-web
  ports:
  - port: 3000
    targetPort: 3000
  type: ClusterIP
EOF
echo

# Install cert-manager for SSL certificates
echo "🔐 Installing cert-manager for SSL certificates..."
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.yaml
echo "Waiting for cert-manager to be ready..."
kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=cert-manager -n cert-manager --timeout=300s
echo

# Create certificate issuer
echo "📝 Creating certificate issuer..."
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: brian.c.long@gmail.com
    privateKeySecretRef:
      name: letsencrypt-prod-private-key
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
echo

# Deploy ingress with SSL
echo "🌐 Deploying ingress with SSL termination..."
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: summit-ingress
  namespace: summit-app
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/rate-limit-connections: "10"
    nginx.ingress.kubernetes.io/rate-limit-requests-per-second: "5"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - topicality.co
    - www.topicality.co
    secretName: summit-tls-cert
  rules:
  - host: topicality.co
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: summit-web
            port:
              number: 3000
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: summit-server
            port:
              number: 4000
      - path: /graphql
        pathType: Prefix
        backend:
          service:
            name: summit-server
            port:
              number: 4000
  - host: www.topicality.co
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: summit-web
            port:
              number: 3000
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: summit-server
            port:
              number: 4000
      - path: /graphql
        pathType: Prefix
        backend:
          service:
            name: summit-server
            port:
              number: 4000
EOF
echo

# Wait for deployments to be ready
echo "⏳ Waiting for Summit application to be ready..."
kubectl wait --for=condition=ready pod -l app=neo4j -n summit-app --timeout=600s || echo "⚠️ Neo4j may still be initializing"
kubectl wait --for=condition=ready pod -l app=postgres -n summit-app --timeout=600s || echo "⚠️ PostgreSQL may still be initializing"
kubectl wait --for=condition=ready pod -l app=redis -n summit-app --timeout=300s || echo "⚠️ Redis may still be initializing"
kubectl wait --for=condition=ready pod -l app=summit-server -n summit-app --timeout=600s || echo "⚠️ Summit server may still be initializing"
kubectl wait --for=condition=ready pod -l app=summit-web -n summit-app --timeout=300s || echo "⚠️ Summit web may still be initializing"
echo

echo "🎉 Summit Application Deployment Complete!"
echo "========================================"
echo
echo "Your Summit application is now deployed and will be available at:"
echo "  https://topicality.co"
echo
echo "The application includes:"
echo "  - Neo4j Graph Database"
echo "  - PostgreSQL Database"
echo "  - Redis Cache"
echo "  - Summit Server API"
echo "  - Summit Web Interface"
echo "  - SSL certificates from Let's Encrypt"
echo
echo "To monitor the application:"
echo "  kubectl get pods -n summit-app"
echo "  kubectl logs -l app=summit-server -n summit-app"
echo
echo "Note: It may take a few minutes for the SSL certificate to be issued and for the"
echo "domain to become fully accessible. DNS propagation may also take some time."
echo
echo "Thank you for deploying Summit to topicality.co!"