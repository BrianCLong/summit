# Secrets Management

IntelGraph Platform uses a dual-tier secrets management approach for different environments:

## Strategy Overview

- **Development/Staging**: Sealed Secrets for encrypted secrets in Git
- **Production**: External Secrets Operator with enterprise secret stores

## Sealed Secrets (Development)

### Quick Start

```bash
# Generate development secrets
./tools/secrets/seal-secrets.sh dev

# Encrypt custom secrets
export POSTGRES_PASSWORD="my-secure-password"
./tools/secrets/seal-secrets.sh encrypt development
```

### How It Works

1. Raw secrets are created locally (never committed)
2. `kubeseal` encrypts them with cluster public key
3. Encrypted SealedSecret resources are committed to Git
4. Controller decrypts them into regular Secrets in cluster

### Secret Categories

- **Database**: Postgres, Neo4j, Redis, MinIO credentials
- **Auth**: JWT secrets, OIDC client secrets
- **API Keys**: OpenAI, Slack, Teams, PagerDuty integration keys

### Rotation

```bash
# Rotate all sealed secrets with new encryption key
./tools/secrets/seal-secrets.sh rotate production
```

## External Secrets (Production)

### Supported Providers

- **HashiCorp Vault**: Recommended for enterprise
- **AWS Secrets Manager**: For AWS deployments
- **Azure Key Vault**: For Azure deployments
- **Google Secret Manager**: For GCP deployments

### Configuration

```yaml
# values.yaml
externalSecrets:
  enabled: true
  provider:
    vault:
      enabled: true
      server: 'https://vault.company.com'
      path: 'secret'
      auth:
        mountPath: 'kubernetes'
        role: 'intelgraph'
```

### Secret Mapping

External secrets are automatically mapped to the same secret names as sealed secrets:

- `ig-platform-database-secrets`
- `ig-platform-jwt-secrets`
- `ig-platform-api-keys`

## Security Best Practices

### Secret Rotation

1. **Automated**: External Secrets refreshes every 5 minutes
2. **Manual**: Use rotation scripts for sealed secrets
3. **Emergency**: Revoke and regenerate immediately

### Access Control

```yaml
# RBAC for secret access
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: secret-reader
rules:
  - apiGroups: ['']
    resources: ['secrets']
    verbs: ['get', 'list']
    resourceNames: ['ig-platform-*']
```

### Encryption at Rest

- Kubernetes etcd encryption enabled
- Secret provider encryption (Vault, AWS KMS)
- Network encryption (TLS 1.3)

## Environment-Specific Setup

### Development

```bash
# Install sealed-secrets controller
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml

# Generate development secrets
./tools/secrets/seal-secrets.sh dev
```

### Production

```yaml
# Helm values for production
externalSecrets:
  enabled: true
sealedSecrets:
  enabled: false # Disable sealed secrets
```

## Secret Templates

### Database Connection String

```yaml
# Constructed from database secrets
DATABASE_URL: 'postgresql://{{ .postgres_user }}:{{ .postgres_password }}@postgres:5432/{{ .postgres_database }}'
NEO4J_URI: 'bolt://neo4j:7687'
REDIS_URL: 'redis://:{{ .redis_password }}@redis:6379'
```

### JWT Configuration

```yaml
# JWT and OIDC settings
JWT_SECRET: '{{ .jwt_secret }}'
OIDC_CLIENT_SECRET: '{{ .oidc_client_secret }}'
OIDC_ISSUER: 'https://auth.company.com/realms/intelgraph'
```

## Troubleshooting

### Sealed Secrets Issues

```bash
# Check controller status
kubectl get pods -n kube-system -l name=sealed-secrets-controller

# Verify sealed secret
kubectl apply --dry-run=client -f sealed-secret.yaml

# Check decryption
kubectl get secret ig-platform-database-secrets -o yaml
```

### External Secrets Issues

```bash
# Check external secret status
kubectl describe externalsecret ig-platform-database-secrets

# Verify secret store connectivity
kubectl describe clustersecretstore ig-platform-cluster-store

# Check refresh logs
kubectl logs -l app.kubernetes.io/name=external-secrets -n external-secrets-system
```

### Common Problems

1. **Wrong namespace**: Sealed secrets are namespace-specific
2. **Controller mismatch**: Sealed with different controller key
3. **Provider auth**: Check service account permissions
4. **Network access**: Verify connectivity to secret provider

## Migration Between Providers

### Sealed Secrets → External Secrets

```bash
# 1. Extract current secrets
kubectl get secret ig-platform-database-secrets -o yaml > backup.yaml

# 2. Store in external provider (Vault example)
vault kv put secret/database/postgres username=postgres password=...

# 3. Deploy external secrets
helm upgrade ig-platform ./charts/ig-platform \
  --set externalSecrets.enabled=true \
  --set sealedSecrets.enabled=false

# 4. Verify secret recreation
kubectl get secret ig-platform-database-secrets
```

### External Secrets → Sealed Secrets

```bash
# 1. Extract secrets to raw format
./tools/secrets/seal-secrets.sh decrypt production

# 2. Encrypt with sealed secrets
./tools/secrets/seal-secrets.sh encrypt production

# 3. Deploy sealed secrets
helm upgrade ig-platform ./charts/ig-platform \
  --set externalSecrets.enabled=false \
  --set sealedSecrets.enabled=true
```

## Compliance & Auditing

### Audit Trail

- All secret access logged in Kubernetes audit logs
- External provider audit logs (Vault, AWS CloudTrail)
- Secret rotation events tracked

### Compliance Features

- **FIPS 140-2**: Use FIPS-validated encryption
- **SOC 2**: Audit trails and access controls
- **GDPR**: Automated secret rotation and deletion

### Monitoring

```yaml
# Prometheus alerts for secret issues
groups:
  - name: secrets
    rules:
      - alert: ExternalSecretSyncFailed
        expr: external_secrets_sync_calls_error > 0
        for: 5m
      - alert: SealedSecretDecryptionFailed
        expr: sealed_secrets_unseal_errors_total > 0
        for: 1m
```
