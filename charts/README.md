# Charts - Golden Path for Deployment

This directory contains Helm charts for deploying the Summit platform with full observability, security, and production-ready configurations.

## 🚀 Quick Start

```bash
# Install the full stack (dev environment)
make install-dev

# Install the full stack (production environment)
make install-prod

# Lint all charts
make lint

# Run smoke tests
make test
```

## 📁 Structure

```
charts/
├── maestro/           # Control plane
├── gateway/           # API gateway
├── intelgraph/        # Graph services
├── monitoring/        # Prometheus & Grafana
├── observability/     # OTEL collectors
└── ...
```

## 🎯 Golden Path Features

### ✅ Observability by Default
- **OpenTelemetry**: Automatic tracing and metrics collection
- **Prometheus**: Metrics scraping and alerting
- **Grafana**: Pre-configured dashboards
- **Feature Flags**: Runtime configuration management

### 🔒 Security First
- **Secrets Management**: External Secrets Operator integration
- **Zero Trust**: mTLS via service mesh (Istio/Linkerd)
- **RBAC**: Role-based access control
- **Network Policies**: Pod-level network isolation
- **Security Contexts**: Non-root containers, read-only filesystems

### 🏗️ Infrastructure as Code
- **Terraform Modules**: Cluster, storage, DNS, secrets
- **GitOps Ready**: ArgoCD/Flux compatible
- **Multi-Environment**: Dev, staging, production configs

### 🔍 Health & Reliability
- **Health Probes**: Liveness, readiness, and startup probes
- **Pod Disruption Budgets**: High availability
- **HPA**: Horizontal pod autoscaling
- **Resource Limits**: Proper resource management

## 📝 Environment-Specific Values

Each chart supports environment-specific configurations:

- `values.yaml` - Base/default values
- `values.dev.yaml` - Development overrides
- `values.prod.yaml` - Production overrides

## 🧪 Validation & Testing

### Chart Linting
```bash
# Lint all charts
ct lint --all

# Lint specific chart
helm lint charts/maestro

# Template validation
helm template charts/maestro --values charts/maestro/values.dev.yaml
```

### Smoke Tests
Post-install smoke tests validate:
- ✅ All pods are running
- ✅ Health endpoints respond
- ✅ Services are accessible
- ✅ Metrics are being collected
- ✅ Secrets are properly mounted

## 🔐 Secrets Management

**CRITICAL**: Secrets are NEVER committed to Git.

### Using External Secrets Operator
```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-secrets
spec:
  secretStoreRef:
    name: aws-secretsmanager
  target:
    name: app-secrets
  data:
    - secretKey: database-url
      remoteRef:
        key: prod/database-url
```

### Using Sealed Secrets
```bash
# Encrypt a secret
kubeseal --format yaml < secret.yaml > sealed-secret.yaml
```

## 🏗️ Terraform Modules

Infrastructure modules are located in `/terraform`:

- `terraform/modules/cluster` - EKS/GKE/AKS cluster
- `terraform/modules/storage` - S3/GCS/Azure Storage
- `terraform/modules/dns` - Route53/Cloud DNS
- `terraform/modules/secrets` - Secrets Manager/Vault

See [terraform/README.md](../terraform/README.md) for details.

## 📊 Observability Stack

### OpenTelemetry
Every service automatically exports:
- **Traces**: Distributed tracing
- **Metrics**: Custom and runtime metrics
- **Logs**: Structured logging

### Prometheus
Metrics are scraped via ServiceMonitor CRDs:
```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: app-metrics
spec:
  selector:
    matchLabels:
      app: myapp
  endpoints:
    - port: metrics
      path: /metrics
```

## 🚦 Feature Flags

Configure feature flags via chart values:
```yaml
featureFlags:
  enabled: true
  provider: launchdarkly  # or flagd, unleash
  sdkKey: secretRef
  flags:
    newFeature: false
    betaFeature: true
```

## 🔄 CI/CD Integration

### GitLab CI
```yaml
deploy:dev:
  script:
    - make install-dev
    - make test
```

### GitHub Actions
```yaml
- name: Deploy to Dev
  run: |
    make install-dev
    make test
```

## 📚 Documentation

- [Helm Best Practices](https://helm.sh/docs/chart_best_practices/)
- [Chart Testing](https://github.com/helm/chart-testing)
- [External Secrets Operator](https://external-secrets.io/)
- [OpenTelemetry](https://opentelemetry.io/)

## 🆘 Troubleshooting

### Debug Installation
```bash
# Dry-run to see what will be installed
helm install myapp charts/app --dry-run --debug

# Check rendered templates
helm template myapp charts/app --values charts/app/values.dev.yaml
```

### Health Check Failures
```bash
# Check pod logs
kubectl logs -n <namespace> <pod-name>

# Describe pod for events
kubectl describe pod -n <namespace> <pod-name>

# Check health endpoint
kubectl port-forward -n <namespace> <pod-name> 8080:8080
curl http://localhost:8080/healthz
```
