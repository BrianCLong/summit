# Air-Gapped Deployment Profile

> **Status:** Production Ready
> **Version:** 1.0.0
> **Classification:** UNCLASSIFIED

## Overview

This deployment profile enables IntelGraph to run in completely air-gapped environments with zero external network connectivity. It provides a comprehensive sync framework for securely transferring data between disconnected deployments via physical media.

## Key Features

✅ **Complete Network Isolation** - Zero external dependencies after deployment
✅ **Bidirectional Sync** - Transfer data between core and edge deployments
✅ **Cryptographic Verification** - All bundles cryptographically signed and verified
✅ **Conflict Resolution** - Configurable strategies for handling data conflicts
✅ **Audit Trail** - Comprehensive logging with merkle chain integrity
✅ **Federal Compliance** - FIPS, SBOM, classification-based isolation

## Quick Start

### 1. Deploy Air-Gapped IntelGraph

```bash
# Install with air-gap profile
helm install intelgraph helm/intelgraph \
  -f deploy-profiles/airgap/helm/values-airgap.yaml \
  -f my-deployment-values.yaml \
  -n intelgraph
```

### 2. Create and Transfer a Sync Bundle

```bash
# Export data bundle
./deploy-profiles/airgap/scripts/sync-cli.sh export \
  '{"cases":["case-001"]}' \
  push_up \
  "operator" \
  "Sync to core"

# Package for transfer
./deploy-profiles/airgap/scripts/sync-cli.sh package bundle_abc123 /mnt/usb

# Transfer via physical media (USB/DVD/etc)

# On target system: Import bundle
./deploy-profiles/airgap/scripts/sync-cli.sh import \
  /mnt/usb/bundle_abc123/bundle.json
```

## Architecture

```
┌─────────────────────────────────────────────┐
│           Air-Gapped Edge                   │
│  ┌────────────┐         ┌────────────────┐ │
│  │ IntelGraph │ ←────→  │  Sync Service  │ │
│  └────────────┘         └────────────────┘ │
│        ↓                        ↓           │
│  ┌────────────────────────────────────────┐ │
│  │  PostgreSQL + Neo4j + Redis (Local)   │ │
│  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
              ↕ Physical Transfer
              (USB/DVD/Tape)
              ↕
┌─────────────────────────────────────────────┐
│            Core Deployment                  │
│         (similar structure)                 │
└─────────────────────────────────────────────┘
```

## Components

### Sync Service

A new microservice that handles export/import of data bundles:

- **Location:** `services/sync-service/`
- **Port:** 4020
- **Database:** PostgreSQL (shared with main IntelGraph)
- **API:** REST/JSON

**Key Endpoints:**
- `POST /export` - Create export bundle
- `POST /import` - Import bundle
- `POST /verify` - Verify bundle integrity
- `GET /bundles` - List available bundles
- `GET /audit-log` - Sync operation audit trail

### CLI Tool

Operator-friendly command-line interface:

- **Location:** `deploy-profiles/airgap/scripts/sync-cli.sh`
- **Features:**
  - Interactive export wizard
  - Bundle verification
  - Package creation for physical transfer
  - Conflict resolution
  - Audit log viewing

### Helm Values

Air-gapped deployment configuration:

- **Location:** `deploy-profiles/airgap/helm/values-airgap.yaml`
- **Features:**
  - Network isolation policies
  - Internal registry configuration
  - FIPS compliance
  - Offline monitoring stack
  - Break-glass procedures

## Data Flow

### Export Flow

1. **Create** - Operator creates export bundle with specified scope
2. **Sign** - Bundle cryptographically signed with deployment's private key
3. **Package** - Bundle packaged with checksums for physical transfer
4. **Transfer** - Physical media (USB/DVD) moved to target deployment
5. **Verify** - Target verifies checksums and signatures
6. **Import** - Data applied to target database with conflict resolution
7. **Audit** - All operations logged with merkle chain integrity

### Scope Options

Export bundles can include:
- **Specific cases** - by ID
- **Time ranges** - all data created/modified in period
- **Tenants** - all data for specific tenants
- **Entities/Relationships** - specific graph elements
- **Evidence** - include associated evidence files
- **Analytics** - include analytical results

## Security

### Cryptographic Signing

- **Algorithm:** RSA-SHA256 (4096-bit keys)
- **Key Storage:** Kubernetes secrets, HSM, or encrypted PVC
- **Verification:** Required on import (configurable)
- **Chain of Trust:** Public keys distributed to all deployments

### Audit Logging

Every sync operation logged with:
- Who (actor)
- What (data scope)
- When (timestamp)
- Why (reason/justification)
- Where (source/target deployments)
- Result (success/failure)
- Merkle chain hash (integrity proof)

### Network Isolation

- **Default deny** egress policy
- **Internal-only** communication (cluster/monitoring)
- **No external** DNS, HTTP, or registry access
- **Verified** via automated compliance checks

## Conflict Resolution

When importing data that already exists:

| Strategy | Behavior | Use Case |
|----------|----------|----------|
| `abort` | Stop on first conflict | Strict data integrity |
| `skip` | Skip conflicting items | Prefer existing data |
| `overwrite` | Replace with incoming | Trust source deployment |
| `merge` | Combine metadata | Best-effort reconciliation |

## Documentation

- **[Operator Guide](docs/OPERATOR_GUIDE.md)** - Complete deployment and operation procedures
- **[API Reference](docs/API.md)** - Sync service API documentation
- **[Security Guide](docs/SECURITY.md)** - Cryptography, compliance, audit
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues and solutions

## Testing

### Integration Tests

```bash
# Run sync service integration tests
cd services/sync-service
pnpm test
```

### Compliance Verification

```bash
# Verify air-gap compliance
./tools/federal/prove-airgap.sh

# Expected: All tests PASS
# - DNS isolation
# - TCP blocking
# - Network policies
# - FIPS enforcement
# - WORM audit storage
```

## Deployment Checklist

**Pre-Deployment:**
- [ ] Internal container registry populated
- [ ] Network policies reviewed
- [ ] Cryptographic keys generated
- [ ] Classification level configured
- [ ] Compliance requirements verified

**Post-Deployment:**
- [ ] All pods running
- [ ] Network isolation verified
- [ ] FIPS mode enabled
- [ ] Sync service health check passing
- [ ] Test export/import successful

## Examples

### Export Last Week's Cases

```bash
./deploy-profiles/airgap/scripts/sync-cli.sh export '{
  "timeRange": {
    "start": "2025-01-01T00:00:00Z",
    "end": "2025-01-07T23:59:59Z"
  },
  "includeEvidence": true
}' push_up operator "Weekly sync to core"
```

### Import with Merge Conflict Resolution

```bash
./deploy-profiles/airgap/scripts/sync-cli.sh import \
  /mnt/usb/bundle_abc123/bundle.json \
  merge \
  operator \
  "Merge from field unit" \
  false  # not a dry-run
```

### Verify Bundle Before Import

```bash
# Always verify first!
./deploy-profiles/airgap/scripts/sync-cli.sh verify \
  /mnt/usb/bundle_abc123/bundle.json

# Expected output:
# ✅ Bundle verification PASSED
# Checksum: true
# Signatures: true
# Not expired: true
```

## Support

- **Issues:** GitHub Issues (for unclassified environments)
- **Security:** Contact your security officer
- **Compliance:** Contact your compliance team
- **Feedback:** engineering@intelgraph.io

## License

Proprietary - IntelGraph Platform

---

**Classification:** UNCLASSIFIED
**Distribution:** Approved for authorized operators
**Version:** 1.0.0 (2025-11-29)
