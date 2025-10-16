### Overview

This guide covers a **Helm‑based** production deployment of IntelGraph onto a Kubernetes cluster (K8s 1.27+). It assumes an umbrella chart with subcharts for: `gateway-api`, `apps/web`, `server/graphql`, `prov-ledger`, `graph-xai`, `predictive-threat-suite`, `postgres`, `neo4j`, and `redis`.

### Prerequisites

- Kubernetes cluster with load balancer (EKS/GKE/AKS or on‑prem with MetalLB)
- kubectl ≥ 1.27, Helm ≥ 3.14
- Ingress Controller (NGINX) or Gateway API
- cert-manager (TLS), external-dns (optional)
- Secrets management (bitnami/sealed-secrets or SOPS)

### Namespaces

```bash
kubectl create ns intelgraph
kubectl label ns intelgraph istio-injection=enabled # if using service mesh (optional)
```

### Install Core Add‑ons

```bash
# cert-manager
helm repo add jetstack https://charts.jetstack.io
helm upgrade --install cert-manager jetstack/cert-manager \
  -n cert-manager --create-namespace \
  --set installCRDs=true

# nginx ingress
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx -n ingress-nginx --create-namespace

# sealed-secrets (optional)
helm repo add bitnami https://charts.bitnami.com/bitnami
helm upgrade --install sealed-secrets bitnami/sealed-secrets -n kube-system
```

### Secrets (example via Sealed Secrets)

```bash
kubectl -n intelgraph create secret generic ig-secrets \
  --from-literal=JWT_SECRET="change_me" \
  --from-literal=POSTGRES_PASSWORD="strong_pw" \
  --from-literal=NEO4J_AUTH="neo4j/strong_pw" \
  --dry-run=client -o yaml | kubeseal --format yaml > k8s/secrets/ig-sealed.yaml
kubectl apply -f k8s/secrets/ig-sealed.yaml
```

### Umbrella Chart Values (snippet)

```yaml
# charts/intelgraph/values.yaml
image:
  pullPolicy: IfNotPresent
  tag: 'v0.1.0'

global:
  env:
    NODE_ENV: production
    OTEL_EXPORTER_OTLP_ENDPOINT: 'http://otel-collector:4317'
    AUTH_JWKS_URL: 'https://your-idp/.well-known/jwks.json'
    TENANCY_MODE: 'multi'

server:
  replicaCount: 3
  resources:
    requests: { cpu: '250m', memory: '512Mi' }
    limits: { cpu: '1', memory: '1Gi' }
  livenessProbe:
    { httpGet: { path: '/healthz', port: 3000 }, initialDelaySeconds: 20 }
  readinessProbe:
    { httpGet: { path: '/readyz', port: 3000 }, initialDelaySeconds: 10 }
  env:
    POSTGRES_URL: 'postgresql://postgres:$(POSTGRES_PASSWORD)@postgres:5432/ig'
    NEO4J_URI: 'bolt://neo4j:7687'
    NEO4J_AUTH: '$(NEO4J_AUTH)'
    REDIS_URL: 'redis://redis:6379'

postgres:
  primary:
    persistence:
      enabled: true
      size: 100Gi
  metrics:
    enabled: true

neo4j:
  acceptLicenseAgreement: 'yes'
  edition: 'community' # or enterprise if licensed
  volumes:
    data:
      mode: defaultStorageClass
  resources:
    requests: { cpu: '500m', memory: '2Gi' }

redis:
  architecture: standalone
  auth:
    enabled: false
```

### Install

```bash
helm dependency update charts/intelgraph
helm upgrade --install intelgraph charts/intelgraph -n intelgraph
```

### Ingress (example)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: intelgraph
  namespace: intelgraph
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt
    nginx.ingress.kubernetes.io/proxy-body-size: '32m'
    nginx.ingress.kubernetes.io/enable-cors: 'true'
spec:
  tls:
    - hosts: [intelgraph.example.com]
      secretName: intelgraph-tls
  rules:
    - host: intelgraph.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: server
                port:
                  number: 3000
```

### Health & SLO Checks

- `kubectl -n intelgraph get pods,svc,hpa` shows all Ready
- `/healthz`, `/readyz` return 200
- p95 GraphQL query latency < **1.5s** on baseline dataset
