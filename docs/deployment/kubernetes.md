# Kubernetes Deployment Guide

This guide details deploying Summit to a production Kubernetes cluster using our Helm charts.

## Prerequisites
* Kubernetes cluster (v1.26+)
* Helm CLI (v3+)
* `kubectl` configured with cluster admin access
* Ingress controller (e.g., Traefik, NGINX, AWS ALB) installed
* External or managed databases (Postgres, Redis, Neo4j)

## 1. Secrets Configuration

Do not store raw secrets in Git. Create a Kubernetes Secret resource or utilize a system like External Secrets Operator.

```yaml
# example-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: summit-secrets
type: Opaque
stringData:
  DATABASE_URL: "postgresql://user:pass@host:5432/db"
  REDIS_URL: "redis://:pass@host:6379/0"
  NEO4J_URI: "bolt://neo4j:7687"
  NEO4J_USER: "neo4j"
  NEO4J_PASSWORD: "secret_password"
  # ... Authentication, Integrations, and Entropy variables
```

Apply the secret:
```bash
kubectl apply -f example-secret.yaml -n summit-production
```

## 2. Helm Deployment Configuration

Create a custom `values-prod.yaml` overriding the default chart values. This aligns with our reference `deploy/helm/values-prod.yaml`.

```yaml
# values-prod.yaml
gateway:
  env:
    ENFORCE_PERSISTED: 'true'
    GQL_MAX_COST: '1000'
    HEALTH_ENDPOINTS_ENABLED: 'true'
    CONFIG_VALIDATE_ON_START: 'true'
  resources:
    requests:
      cpu: '500m'
      memory: '1Gi'
    limits:
      cpu: '2'
      memory: '4Gi'
  envFrom:
    - secretRef:
        name: summit-secrets

opa:
  bundleUrl: s3://intelgraph-policies/bundles/prod.tar.gz
  poll:
    minDelaySeconds: 10
    maxDelaySeconds: 60

traefik:
  additionalArguments:
    - '--serverstransport.insecureskipverify=false'
    - '--accesslog=true'

livenessProbe:
  httpGet:
    path: /healthz
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /readyz
    port: 3000
  initialDelaySeconds: 15
  periodSeconds: 5
```

## 3. Database Migrations via Init Containers or Jobs

Database migrations in Kubernetes should be run via a Helm hook or a Kubernetes `Job` prior to the new application pods accepting traffic.

Example Job snippet:
```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: summit-db-migration
  annotations:
    "helm.sh/hook": pre-install,pre-upgrade
    "helm.sh/hook-weight": "-5"
spec:
  template:
    spec:
      containers:
      - name: migration
        image: summit-api:latest
        command: ["npm", "run", "db:migrate"]
        envFrom:
        - secretRef:
            name: summit-secrets
      restartPolicy: Never
```

## 4. Deployment Execution

1. **Verify your Context:** Ensure `kubectl` is pointing to the correct production cluster context.
2. **Install / Upgrade via Helm:** Navigate to the root directory where the Helm chart exists, and run:

```bash
helm upgrade --install summit-prod ./deploy/helm \
  --namespace summit-production \
  --create-namespace \
  -f deploy/helm/values-prod.yaml \
  -f custom-values.yaml # Your custom overrides with secrets binding
```

## 5. Scaling Guidance

* **Horizontal Pod Autoscaling (HPA):** Configure HPA based on CPU and memory utilization to dynamically scale the API Gateway and stateless workers. Limit memory spikes by allocating appropriate base requests.
* **Database Scaling:** PostgreSQL, Redis, and Neo4j should ideally be hosted on managed services (e.g., RDS, ElastiCache, Aura) for production to offload scaling and backup responsibilities.
