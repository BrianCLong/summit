# Air-Gapped Registry Infrastructure

## Overview

This directory contains the complete infrastructure for deploying a secure, air-gapped container registry using Harbor with enterprise-grade security controls including:

- **Harbor Registry**: Enterprise container registry with proxy caching
- **Cosign Integration**: Container image signature verification
- **SLSA Level 3 Verification**: Supply chain provenance attestation
- **Offline Sync**: Complete tooling for air-gapped image transfers
- **Vulnerability Blocking**: 99%+ block rate for Critical/High CVEs

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Air-Gapped Environment                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      Harbor Registry                             │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │   │
│  │  │  Portal  │  │   Core   │  │ Registry │  │  Job Service │    │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────┘    │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │   │
│  │  │  Trivy   │  │  Notary  │  │ Database │  │    Redis     │    │   │
│  │  │ Scanner  │  │  (Trust) │  │ (Postgres)│  │   (Cache)    │    │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│  ┌─────────────────────────────────┼───────────────────────────────┐   │
│  │              Security Layer     │                                │   │
│  │  ┌──────────────┐  ┌───────────┴────────┐  ┌────────────────┐  │   │
│  │  │   Cosign     │  │  SLSA L3 Verifier  │  │  OPA Policies  │  │   │
│  │  │  Verifier    │  │                    │  │                │  │   │
│  │  └──────────────┘  └────────────────────┘  └────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    ▲
                                    │ Offline Transfer
                                    │ (USB/Sneakernet)
┌───────────────────────────────────┴─────────────────────────────────────┐
│                        Online Environment                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Sync Workstation                              │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │   │
│  │  │ Image Export │  │  Signature   │  │  Vulnerability Scan  │  │   │
│  │  │   Script     │  │ Verification │  │      (Trivy)         │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                    ┌───────────────┴───────────────┐                   │
│                    ▼               ▼               ▼                   │
│              Docker Hub        GHCR            GCR                     │
└─────────────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
infra/registry/
├── harbor/                     # Harbor deployment configurations
│   ├── harbor-values.yaml      # Helm chart values
│   ├── proxy-cache-config.yaml # Upstream registry configuration
│   └── docker-compose.harbor.yaml # Local development deployment
│
├── cosign/                     # Image signature verification
│   ├── cosign-verifier.ts      # Signature verification service
│   └── policy.yaml             # Trusted signers policy
│
├── slsa/                       # SLSA provenance verification
│   ├── slsa3-verifier.ts       # SLSA Level 3 verifier
│   └── trusted-builders.yaml   # Trusted builder configuration
│
├── sync/                       # Offline synchronization
│   ├── offline-sync.ts         # Export/import service
│   └── image-lists/            # Curated image lists
│       ├── intelgraph-base.json
│       └── security-tools.json
│
├── policies/                   # Security policies
│   ├── vulnerability-policy.yaml # Vulnerability blocking rules
│   ├── admission-policy.rego   # OPA admission policy
│   └── network-policy.yaml     # Network isolation
│
├── tests/                      # Test suites
│   ├── cosign-verifier.test.ts
│   ├── slsa3-verifier.test.ts
│   └── offline-sync.test.ts
│
├── scripts/                    # Operational scripts
│   └── (operational scripts)
│
└── docs/                       # Documentation
    ├── README.md               # This file
    ├── ARCHITECTURE.md         # Detailed architecture
    ├── RUNBOOK.md              # Operational runbook
    └── SECURITY.md             # Security documentation
```

## Quick Start

### Prerequisites

- Docker Desktop 4.x+ with 8GB+ memory
- Node.js 18+
- pnpm 9.x+
- cosign CLI
- crane CLI
- trivy CLI

### Local Development

```bash
# Start Harbor locally
cd infra/registry/harbor
docker-compose -f docker-compose.harbor.yaml up -d

# Access Harbor UI
open https://localhost:443
# Default: admin / Harbor12345

# Verify installation
curl -k https://localhost/api/v2.0/ping
```

### Production Deployment (Kubernetes)

```bash
# Add Harbor Helm repo
helm repo add harbor https://helm.goharbor.io
helm repo update

# Install with custom values
helm install harbor harbor/harbor \
  -n harbor --create-namespace \
  -f harbor/harbor-values.yaml \
  --set harborAdminPassword=$HARBOR_ADMIN_PASSWORD
```

## Security Controls

### 1. Image Signature Verification (Cosign)

All images must be signed using Sigstore cosign. Supported verification methods:

- **Keyless (Fulcio/Rekor)**: For GitHub Actions and Google Cloud Build
- **Key-based**: For custom signing keys

```typescript
import { CosignVerifier } from './cosign/cosign-verifier';

const verifier = new CosignVerifier({
  trustedIssuers: ['https://token.actions.githubusercontent.com'],
});

const result = await verifier.verifyImage('ghcr.io/org/image:v1.0.0');
console.log(result.verified); // true/false
```

### 2. SLSA Level 3 Provenance

Images must have verifiable build provenance meeting SLSA Level 3 requirements:

- Isolated build environment
- Non-falsifiable provenance
- Parameterless builds

```typescript
import { SLSA3Verifier } from './slsa/slsa3-verifier';

const verifier = new SLSA3Verifier({ requiredLevel: 3 });
const result = await verifier.verifyProvenance('ghcr.io/org/image:v1.0.0');
console.log(result.slsaLevel); // 0-4
```

**Trusted Builders:**
- GitHub Actions SLSA Generators (Go, Container, Node.js)
- Google Cloud Build
- Tekton Chains

### 3. Vulnerability Scanning

Trivy scans all images with blocking rules:

| Severity | Action | Block Rate Target |
|----------|--------|-------------------|
| Critical | Block  | 100%              |
| High     | Block  | 99%+              |
| Medium   | Warn   | -                 |
| Low      | Log    | -                 |

### 4. Network Isolation

Network policies enforce strict isolation:

- Harbor components communicate only internally
- Egress blocked in full air-gap mode
- Ingress only from approved namespaces

## Offline Sync Workflow

### Phase 1: Export (Online Environment)

```bash
# Create image list
cat > images.json << EOF
{
  "name": "weekly-sync",
  "images": [
    {"ref": "ghcr.io/org/app:v2.0.0", "required": true}
  ]
}
EOF

# Export with verification
npx ts-node sync/offline-sync.ts export images.json

# Output: /var/lib/harbor-sync/export/
#   - manifest-TXF-XXXX.json
#   - checksums-TXF-XXXX.sha256
#   - *.tar.gz (image tarballs)
```

### Phase 2: Transfer

Transfer the export directory via approved media (USB, optical, etc.) following your organization's data transfer policies.

### Phase 3: Import (Air-Gapped Environment)

```bash
# Verify and import
npx ts-node sync/offline-sync.ts import /media/transfer/manifest-TXF-XXXX.json

# Verify import
crane catalog registry.intelgraph.local
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `HARBOR_ADMIN_PASSWORD` | Admin password | Required |
| `HARBOR_DB_PASSWORD` | PostgreSQL password | Required |
| `HARBOR_CORE_SECRET` | Core encryption key | Required |
| `COSIGN_BINARY_PATH` | Path to cosign | `/usr/local/bin/cosign` |
| `TRIVY_CACHE_DIR` | Trivy cache directory | `/var/cache/trivy` |

### Customizing Policies

Edit `policies/vulnerability-policy.yaml` to adjust blocking rules:

```yaml
severityRules:
  critical:
    action: block  # or: warn, log
    maxAge: "0s"   # Time allowed before blocking
```

## Monitoring & Observability

### Metrics

Harbor exposes Prometheus metrics at `/metrics`:

- `harbor_project_total`: Total projects
- `harbor_repo_total`: Total repositories
- `harbor_artifact_pulled`: Pull statistics
- `vulnerability_block_rate`: Block rate by severity

### Alerts

Configure in `policies/vulnerability-policy.yaml`:

```yaml
alerts:
  - name: VulnerabilityBlockRateLow
    condition: "vulnerability_block_rate{severity='critical'} < 100"
    severity: critical
```

## Troubleshooting

### Common Issues

1. **Signature verification fails**
   ```bash
   # Check cosign is installed
   cosign version

   # Verify manually
   cosign verify --certificate-identity-regexp='.*' \
     --certificate-oidc-issuer-regexp='.*' \
     ghcr.io/org/image:tag
   ```

2. **SLSA verification fails**
   ```bash
   # Check for attestations
   cosign download attestation ghcr.io/org/image:tag

   # Verify with slsa-verifier
   slsa-verifier verify-image ghcr.io/org/image:tag \
     --source-uri github.com/org/repo
   ```

3. **Harbor won't start**
   ```bash
   # Check logs
   docker-compose -f docker-compose.harbor.yaml logs

   # Verify disk space
   df -h
   ```

## Build Time Tradeoffs

| Feature | Build Time Impact | Runtime Impact | Security Benefit |
|---------|-------------------|----------------|------------------|
| Signature Verification | +30-60s per image | None | High |
| SLSA Verification | +15-30s per image | None | High |
| Vulnerability Scan | +1-5min per image | None | Critical |
| Offline Export | +2-10min per image | None | N/A |

**Recommendations:**
- Enable parallel verification (default: 5 concurrent)
- Cache verification results (default: 1 hour TTL)
- Pre-warm cache during off-peak hours

## Security Considerations

- **Zero Runtime Alterations**: All verification happens at sync/admission time
- **Fail-Closed**: Verification failures block deployment
- **Audit Trail**: All operations logged to audit.log
- **Key Management**: Cosign keys stored in Kubernetes secrets

## Contributing

1. Follow the project's TypeScript conventions
2. Add tests for new functionality
3. Update documentation
4. Run `pnpm test` before submitting

## License

Internal use only - IntelGraph Platform
