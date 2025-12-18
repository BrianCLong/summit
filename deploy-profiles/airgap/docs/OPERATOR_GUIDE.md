# Air-Gapped Deployment Operator Guide

> **Version:** 1.0
> **Last Updated:** 2025-11-29
> **Classification:** UNCLASSIFIED (adjust per deployment)

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Initial Deployment](#initial-deployment)
4. [Sync Operations](#sync-operations)
5. [Security & Compliance](#security--compliance)
6. [Troubleshooting](#troubleshooting)
7. [Appendices](#appendices)

---

## Overview

### Purpose

This guide provides operators with procedures for deploying and managing IntelGraph in air-gapped environments where no external network connectivity is permitted.

### Key Capabilities

- **Full network isolation**: Zero external dependencies after deployment
- **Bidirectional sync**: Transfer data between core and edge deployments
- **Cryptographic verification**: All bundles signed and verified
- **Conflict resolution**: Handle data conflicts with configurable strategies
- **Audit trail**: Comprehensive logging with merkle chain integrity

### Deployment Scenarios

1. **Core Deployment** (connected)
   - Central data repository
   - Receives data from edge deployments ("push up")
   - Distributes updates to edge deployments ("pull down")

2. **Edge Deployment** (air-gapped)
   - Field operations
   - Fully isolated from external networks
   - Syncs data via physical transfer media

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Air-Gapped Edge                         │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │  IntelGraph  │  │ Sync Service │  │ Offline Registry│  │
│  │     Web      │  │              │  │                 │  │
│  └──────┬───────┘  └──────┬───────┘  └─────────────────┘  │
│         │                  │                                │
│  ┌──────┴──────────────────┴────────────┐                  │
│  │          API Server                   │                  │
│  └──────┬──────────────┬─────────────────┘                  │
│         │              │                                     │
│  ┌──────┴───────┐ ┌───┴──────────┐                         │
│  │  PostgreSQL  │ │    Neo4j     │                         │
│  └──────────────┘ └──────────────┘                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                         ↕
                  Physical Transfer
                  (USB/DVD/Tape)
                         ↕
┌─────────────────────────────────────────────────────────────┐
│                      Core Deployment                        │
│                    (similar structure)                      │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Export** (create bundle on source)
   → **Package** (prepare for transfer)
   → **Transfer** (physical media)
   → **Verify** (validate integrity)
   → **Import** (apply to target)
   → **Audit** (log operation)

---

## Initial Deployment

### Prerequisites

- Kubernetes cluster (1.28+) with network isolation enforced
- Internal container registry populated with all required images
- Physical access to target environment
- Authorization credentials for operations

### Deployment Steps

#### 1. Prepare Container Registry

```bash
# List required images
cat deploy-profiles/airgap/docs/IMAGE_MANIFEST.txt

# Load images to internal registry
./deploy-profiles/airgap/scripts/load-images.sh \
  --source /mnt/usb/images \
  --registry registry.internal.local

# Verify all images are available
./deploy-profiles/airgap/scripts/verify-images.sh
```

#### 2. Configure Deployment

```bash
# Copy and customize values
cp deploy-profiles/airgap/helm/values-airgap.yaml values-local.yaml

# Edit deployment-specific settings:
# - deployment.id: Unique identifier for this deployment
# - deployment.name: Human-readable name
# - deployment.environment: "core" or "edge"
# - classification: Data classification level
# - image.registry: Your internal registry URL

vi values-local.yaml
```

**Critical Settings:**

```yaml
# values-local.yaml
syncService:
  deployment:
    id: "edge-field-001"  # MUST be unique
    name: "Field Unit Alpha"
    environment: "edge"  # core or edge
    classification: "UNCLASSIFIED"  # Your classification

federal:
  airGap:
    enabled: true
    mode: "STRICT"  # No external network access

image:
  registry: "registry.internal.local"  # Your internal registry
```

#### 3. Generate Cryptographic Keys

```bash
# Generate RSA key pair for bundle signing
./deploy-profiles/airgap/scripts/generate-keys.sh \
  --output /secure/keys \
  --deployment edge-field-001

# Create Kubernetes secret
kubectl create secret generic sync-service-keys \
  --from-file=private.pem=/secure/keys/private.pem \
  --from-file=public.pem=/secure/keys/public.pem \
  -n intelgraph

# ⚠️  CRITICAL: Backup private key to secure offline storage
cp /secure/keys/private.pem /path/to/offline/backup/
```

#### 4. Deploy with Helm

```bash
# Create namespace
kubectl create namespace intelgraph

# Apply air-gapped profile
helm install intelgraph helm/intelgraph \
  -f deploy-profiles/airgap/helm/values-airgap.yaml \
  -f values-local.yaml \
  -n intelgraph

# Wait for all pods to be ready
kubectl wait --for=condition=ready pod \
  --all -n intelgraph --timeout=600s

# Verify deployment
kubectl get pods -n intelgraph
kubectl get networkpolicies -n intelgraph
```

#### 5. Verify Air-Gap Compliance

```bash
# Run air-gap compliance verification
./tools/federal/prove-airgap.sh

# Expected output:
# ✅ DNS_ISOLATION: PASS
# ✅ TCP_BLOCKING: PASS
# ✅ NETPOL_DENY_EGRESS: PASS
# ✅ FIPS_ENFORCEMENT: PASS
# ... (all tests should pass)
```

#### 6. Initialize Databases

```bash
# Run database migrations
kubectl exec -n intelgraph deploy/intelgraph-server -- \
  pnpm db:pg:migrate

# Run sync service migrations
kubectl exec -n intelgraph deploy/sync-service -- \
  psql $DATABASE_URL -f /app/migrations/001_sync_schema.sql

# Verify schema
kubectl exec -n intelgraph deploy/intelgraph-server -- \
  psql $DATABASE_URL -c "\dt"
```

---

## Sync Operations

### Overview

Sync operations transfer data between deployments using cryptographically signed bundles transported via physical media.

### Export Workflow

#### 1. Create Export Bundle

**Using CLI (Recommended):**

```bash
# Interactive wizard
./deploy-profiles/airgap/scripts/sync-cli.sh export-wizard

# Or direct command
./deploy-profiles/airgap/scripts/sync-cli.sh export \
  '{"cases":["case-001","case-002"],"includeEvidence":true}' \
  push_up \
  "operator@hostname" \
  "Syncing cases to core for analysis"
```

**Using API:**

```bash
curl -X POST http://sync-service:4020/export \
  -H "Content-Type: application/json" \
  -d '{
    "scope": {
      "cases": ["case-001", "case-002"],
      "includeEvidence": true,
      "includeAnalytics": false
    },
    "direction": "push_up",
    "requester": "operator@hostname",
    "reason": "Syncing cases to core for analysis",
    "dryRun": false
  }'
```

**Scope Options:**

| Field | Description | Example |
|-------|-------------|---------|
| `cases` | Specific case IDs | `["case-001", "case-002"]` |
| `tenants` | All cases for tenants | `["tenant-alpha"]` |
| `timeRange` | Cases in time range | `{"start": "2025-01-01T00:00:00Z", "end": "2025-01-31T23:59:59Z"}` |
| `entities` | Specific entities | `["entity-123"]` |
| `includeEvidence` | Include evidence files | `true` (default) |
| `includeAnalytics` | Include analytics | `false` (default) |

#### 2. Verify Bundle

```bash
# Verify integrity before packaging
./deploy-profiles/airgap/scripts/sync-cli.sh verify \
  /opt/intelgraph/bundles/bundle_abc123.json

# Expected output:
# ✅ Bundle verification PASSED
# Checksum: true
# Signatures: true
# Not expired: true
```

#### 3. Package for Transfer

```bash
# Package bundle for physical transfer
./deploy-profiles/airgap/scripts/sync-cli.sh package \
  bundle_abc123 \
  /mnt/usb/exports

# Output:
# Package directory: /mnt/usb/exports/bundle_abc123
# Tarball: /mnt/usb/exports/bundle_abc123.tar.gz
# Checksum: /mnt/usb/exports/bundle_abc123.tar.gz.sha256
```

**Package Contents:**

```
bundle_abc123.tar.gz
├── bundle.json           # The actual sync bundle
├── bundle.json.sha256    # Checksum for verification
└── README.txt            # Transfer instructions
```

#### 4. Transfer Package

**Physical Transfer Procedure:**

1. **Prepare Media:**
   - Use approved transfer media (FIPS 140-2 validated USB, DVD-R, tape)
   - Format media if required
   - Label with classification markings

2. **Copy Package:**
   ```bash
   # Copy tarball and checksum
   cp /mnt/usb/exports/bundle_abc123.tar.gz /media/transfer/
   cp /mnt/usb/exports/bundle_abc123.tar.gz.sha256 /media/transfer/

   # Verify copy
   cd /media/transfer
   sha256sum -c bundle_abc123.tar.gz.sha256
   ```

3. **Document Transfer:**
   - Log in chain of custody tracking system
   - Record: Date, time, operator, classification, destination
   - Obtain supervisor signature if required

4. **Secure Media:**
   - Store in approved container
   - Apply classification labels
   - Transport via authorized personnel

### Import Workflow

#### 1. Receive and Verify Package

```bash
# On target system, mount transfer media
mount /dev/sdb1 /mnt/transfer

# Verify checksum
cd /mnt/transfer
sha256sum -c bundle_abc123.tar.gz.sha256

# Expected output:
# bundle_abc123.tar.gz: OK
```

#### 2. Extract Package

```bash
# Extract to secure staging area
tar -xzf bundle_abc123.tar.gz -C /opt/intelgraph/staging/

# Verify extracted files
cd /opt/intelgraph/staging/bundle_abc123
sha256sum -c bundle.json.sha256
```

#### 3. Verify Bundle Again

```bash
# Verify bundle signatures and integrity
./deploy-profiles/airgap/scripts/sync-cli.sh verify \
  /opt/intelgraph/staging/bundle_abc123/bundle.json

# Review bundle contents
jq '.manifest' /opt/intelgraph/staging/bundle_abc123/bundle.json
```

#### 4. Dry-Run Import

**ALWAYS perform a dry-run first:**

```bash
# Dry-run to detect conflicts without applying changes
./deploy-profiles/airgap/scripts/sync-cli.sh import \
  /opt/intelgraph/staging/bundle_abc123/bundle.json \
  abort \
  "operator@hostname" \
  "Importing from field unit" \
  true  # dry-run=true

# Review results
# - Conflicts detected?
# - Data statistics
# - Warnings/errors
```

#### 5. Apply Import

**If dry-run successful, apply changes:**

```bash
# Import with conflict resolution strategy
./deploy-profiles/airgap/scripts/sync-cli.sh import \
  /opt/intelgraph/staging/bundle_abc123/bundle.json \
  merge \
  "operator@hostname" \
  "Importing from field unit" \
  false  # dry-run=false

# Monitor progress
kubectl logs -f -n intelgraph deploy/sync-service
```

**Conflict Resolution Strategies:**

| Strategy | Behavior | Use Case |
|----------|----------|----------|
| `abort` | Stop on first conflict | Strict data integrity requirements |
| `skip` | Skip conflicting items | Prefer existing data |
| `overwrite` | Replace with incoming | Trust source more than target |
| `merge` | Combine metadata | Best effort reconciliation |

#### 6. Verify Import Results

```bash
# Check import statistics
./deploy-profiles/airgap/scripts/sync-cli.sh audit | head -20

# Check for unresolved conflicts
./deploy-profiles/airgap/scripts/sync-cli.sh conflicts

# Verify data in database
kubectl exec -n intelgraph deploy/intelgraph-server -- \
  psql $DATABASE_URL -c "SELECT COUNT(*) FROM cases;"
```

### Handling Conflicts

**When conflicts occur during import:**

1. **Review conflict details:**
   ```bash
   ./deploy-profiles/airgap/scripts/sync-cli.sh conflicts
   ```

2. **Analyze conflict data:**
   ```sql
   -- Query sync_conflicts table
   SELECT id, bundle_id, type, resource_type, resource_id,
          existing_data, incoming_data
   FROM sync_conflicts
   WHERE resolved_at IS NULL;
   ```

3. **Resolve manually if needed:**
   ```sql
   -- After manual resolution
   UPDATE sync_conflicts
   SET resolved_at = NOW(),
       resolution = 'manual',
       resolved_by = 'operator@hostname',
       notes = 'Manually verified and merged data'
   WHERE id = '<conflict-id>';
   ```

---

## Security & Compliance

### Cryptographic Operations

#### Key Management

**Key Generation:**
- RSA 4096-bit keys for signing/verification
- Keys generated on secure offline workstation
- Private keys stored in HSM or encrypted storage

**Key Rotation:**
```bash
# Generate new key pair
./deploy-profiles/airgap/scripts/generate-keys.sh \
  --output /secure/keys/rotation \
  --deployment edge-field-001 \
  --rotation true

# Update Kubernetes secret (requires downtime)
kubectl delete secret sync-service-keys -n intelgraph
kubectl create secret generic sync-service-keys \
  --from-file=private.pem=/secure/keys/rotation/private.pem \
  --from-file=public.pem=/secure/keys/rotation/public.pem \
  -n intelgraph

# Restart sync service
kubectl rollout restart deployment/sync-service -n intelgraph
```

#### Bundle Signing

All bundles are cryptographically signed:
- Algorithm: RSA-SHA256
- Signature embedded in bundle JSON
- Public key distributed to all deployments
- Verification required before import

### Audit & Compliance

#### Audit Trail

**All sync operations are logged:**

```bash
# View sync audit log
./deploy-profiles/airgap/scripts/sync-cli.sh audit

# Query audit database
kubectl exec -n intelgraph deploy/sync-service -- \
  psql $DATABASE_URL -c "
    SELECT timestamp, operation, actor, bundle_id, result
    FROM sync_audit_log
    ORDER BY timestamp DESC
    LIMIT 50;
  "
```

**Audit Record Contents:**
- Bundle ID and checksums
- Operation type (export/import/verify)
- Actor (who performed operation)
- Timestamp (when)
- Source/target deployments (where)
- Scope (what data)
- Result (success/failure)
- Reason (why - operator justification)
- Merkle chain hash (integrity)

#### Chain of Custody

For each transfer, document:
1. **Export:**
   - Who created bundle
   - What data included
   - When created
   - Why exported
   - Bundle ID and checksums

2. **Transfer:**
   - Transfer media ID
   - Operator names (sender/receiver)
   - Transfer timestamp
   - Classification marking
   - Supervisor approvals

3. **Import:**
   - Who received bundle
   - Verification results
   - Import timestamp
   - Conflict resolution details
   - Final audit entry

Template: `deploy-profiles/airgap/docs/CHAIN_OF_CUSTODY_TEMPLATE.pdf`

### Network Isolation Verification

**Regularly verify air-gap integrity:**

```bash
# Automated compliance check (run weekly)
./tools/federal/prove-airgap.sh

# Output saved to evidence directory for audit
# Review: /tmp/airgap-evidence-*/compliance-report.md
```

**Manual Verification:**

```bash
# Test DNS resolution (should fail)
kubectl exec -n intelgraph deploy/sync-service -- \
  nslookup google.com
# Expected: server can't find google.com

# Test outbound HTTP (should fail)
kubectl exec -n intelgraph deploy/sync-service -- \
  curl --max-time 5 https://google.com
# Expected: timeout or connection refused

# Check network policies
kubectl get networkpolicies -n intelgraph
kubectl describe networkpolicy deny-all-egress -n intelgraph
```

### FIPS Compliance

**Verify FIPS mode:**

```bash
# Check FIPS status
kubectl exec -n intelgraph deploy/sync-service -- \
  cat /proc/sys/crypto/fips_enabled
# Expected: 1

# Verify crypto modules
kubectl exec -n intelgraph deploy/sync-service -- \
  openssl version
# Expected: OpenSSL with FIPS
```

---

## Troubleshooting

### Common Issues

#### Export Fails with "No data matched scope"

**Cause:** Scope parameters don't match any data in database

**Solution:**
```bash
# Verify data exists
kubectl exec -n intelgraph deploy/intelgraph-server -- \
  psql $DATABASE_URL -c "SELECT id, name FROM cases LIMIT 10;"

# Check case IDs match
./deploy-profiles/airgap/scripts/sync-cli.sh export \
  '{"cases":["<valid-case-id>"]}'
```

#### Import Fails with "Signature verification failed"

**Cause:** Bundle signed with different key than available for verification

**Solution:**
```bash
# Check which key was used to sign
jq '.signatures[0]' bundle.json

# Verify correct public key is configured
kubectl get secret sync-service-keys -n intelgraph -o yaml

# If keys don't match, obtain correct public key from source deployment
```

#### Import Conflicts on All Records

**Cause:** Data already imported (duplicate import attempt)

**Solution:**
```bash
# Check if bundle already imported
kubectl exec -n intelgraph deploy/sync-service -- \
  psql $DATABASE_URL -c "
    SELECT * FROM sync_audit_log
    WHERE bundle_id = '<bundle-id>'
    ORDER BY timestamp;
  "

# If duplicate, skip import or use 'skip' conflict resolution
./deploy-profiles/airgap/scripts/sync-cli.sh import \
  bundle.json skip
```

#### Sync Service Not Reachable

**Cause:** Service not running or network policy blocking access

**Solution:**
```bash
# Check service status
kubectl get pods -n intelgraph -l app=sync-service

# Check service endpoints
kubectl get svc sync-service -n intelgraph

# Port-forward for testing
kubectl port-forward -n intelgraph svc/sync-service 4020:4020

# Test locally
curl http://localhost:4020/health
```

### Logs & Debugging

```bash
# Sync service logs
kubectl logs -n intelgraph deploy/sync-service --tail=100 -f

# Database query logs
kubectl logs -n intelgraph deploy/postgres --tail=100 -f

# Check for errors in audit log
kubectl exec -n intelgraph deploy/sync-service -- \
  psql $DATABASE_URL -c "
    SELECT timestamp, bundle_id, errors
    FROM sync_audit_log
    WHERE result = 'failure'
    ORDER BY timestamp DESC
    LIMIT 10;
  "

# Sync operation status
kubectl exec -n intelgraph deploy/sync-service -- \
  psql $DATABASE_URL -c "
    SELECT id, bundle_id, type, status, errors
    FROM sync_operations
    WHERE status IN ('failed', 'in_progress')
    ORDER BY initiated_at DESC;
  "
```

---

## Appendices

### Appendix A: Scope Examples

#### Export specific cases
```json
{
  "cases": ["case-001", "case-002"],
  "includeEvidence": true,
  "includeAnalytics": false
}
```

#### Export by tenant
```json
{
  "tenants": ["tenant-alpha", "tenant-bravo"],
  "includeEvidence": true
}
```

#### Export by time range
```json
{
  "timeRange": {
    "start": "2025-01-01T00:00:00Z",
    "end": "2025-01-31T23:59:59Z"
  },
  "includeEvidence": true,
  "includeAnalytics": true
}
```

#### Export specific entities and relationships
```json
{
  "entities": ["entity-123", "entity-456"],
  "relationships": ["rel-abc", "rel-def"],
  "includeEvidence": false
}
```

### Appendix B: API Reference

See `deploy-profiles/airgap/docs/API.md` for complete API documentation.

### Appendix C: Compliance Checklist

**Pre-Deployment:**
- [ ] All images loaded to internal registry
- [ ] Network policies reviewed and approved
- [ ] Cryptographic keys generated and backed up
- [ ] Deployment values reviewed for classification
- [ ] Air-gap compliance test passed

**Post-Deployment:**
- [ ] All pods running and ready
- [ ] Network isolation verified (DNS, HTTP tests fail)
- [ ] FIPS mode enabled and verified
- [ ] Database migrations applied successfully
- [ ] Audit logging functional
- [ ] Test export/import completed successfully

**Ongoing Operations:**
- [ ] Weekly air-gap compliance verification
- [ ] Monthly audit log review
- [ ] Quarterly key rotation (if required)
- [ ] All sync operations documented in chain of custody

### Appendix D: Contact & Support

- **Documentation:** `deploy-profiles/airgap/docs/`
- **Issue Tracker:** (your organization's tracker)
- **Security Incidents:** (your SOC contact)
- **Compliance Questions:** (your compliance officer)

---

**Document Classification:** UNCLASSIFIED
**Distribution:** Approved for operators with appropriate clearance
**Revision History:**
- v1.0 (2025-11-29): Initial release
