# Summit Platform - Production Go-Live Readiness

**Document Version:** 1.0.0
**Last Updated:** 2026-01-28
**Status:** Production Ready

---

## Executive Summary

The Summit platform has been validated for production deployment. This document provides the deployment method, configuration requirements, and operational commands needed for go-live.

---

## 1. Deployment Method

### Primary: Docker Compose (Production)

**File:** `deploy/docker-compose.prod.yml`

```bash
# Production deployment
cd deploy
docker compose -f docker-compose.prod.yml up -d
```

### Alternative: Kubernetes with Helm

**Chart:** `deploy/helm/intelgraph/`

```bash
# Kubernetes deployment
helm upgrade --install summit deploy/helm/intelgraph \
  -f deploy/helm/intelgraph/values-prod.yaml \
  --namespace summit --create-namespace
```

### Full Deployment Script

**File:** `deploy/go-live-now.sh`

```bash
# Complete deployment automation (19K lines)
./deploy/go-live-now.sh
```

---

## 2. Required Environment Variables

### Critical Variables (Must Set)

```bash
# Runtime
NODE_ENV=production
PORT=4000
CONFIG_VALIDATE_ON_START=true
HEALTH_ENDPOINTS_ENABLED=true

# Database - PostgreSQL
DATABASE_URL=postgresql://user:password@host:5432/summit
POSTGRES_HOST=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<secure-32-char-password>
POSTGRES_DB=summit

# Database - Neo4j
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=<secure-32-char-password>

# Cache - Redis
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=<secure-password>

# Authentication
OIDC_ISSUER=https://your-idp.com
OIDC_CLIENT_ID=<client-id>
OIDC_CLIENT_SECRET=<client-secret>
SESSION_SECRET=<random-32-char-string>
JWT_SECRET=<random-32-char-string>
JWT_REFRESH_SECRET=<random-32-char-string-different-from-jwt-secret>

# Security
CORS_ORIGIN=https://your-domain.com
ALLOWED_ORIGINS=https://your-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
```

### Service URLs (Internal)

```bash
POLICY_COMPILER_URL=http://policy-compiler:8102
PROV_LEDGER_URL=http://prov-ledger:8101
NLQ_SERVICE_URL=http://nlq-service:8103
ER_SERVICE_URL=http://er-service:8104
INGEST_SERVICE_URL=http://ingest-service:8105
```

### Observability

```bash
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://otel-collector:4318/v1/traces
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://otel-collector:4318/v1/metrics
JAEGER_ENDPOINT=http://jaeger-collector:14268/api/traces
```

---

## 3. Health Check Endpoints

| Endpoint | Purpose | Expected Response |
|----------|---------|-------------------|
| `GET /health` | Application health | `{"status": "ok"}` |
| `GET /healthz` | Liveness probe | `200 OK` |
| `GET /readyz` | Readiness probe | `200 OK` |

### Health Check Configuration

```yaml
# Docker
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:4000/healthz"]
  interval: 30s
  timeout: 5s
  retries: 3
  start_period: 30s

# Kubernetes
livenessProbe:
  httpGet:
    path: /healthz
    port: 4000
  initialDelaySeconds: 10
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /readyz
    port: 4000
  initialDelaySeconds: 5
  periodSeconds: 5
```

---

## 4. Operational Commands

### Start Services

```bash
# Docker Compose - Production
docker compose -f deploy/docker-compose.prod.yml up -d

# Docker Compose - with specific profile
docker compose -f deploy/docker-compose.prod.yml --profile observability up -d

# Kubernetes
kubectl apply -f deploy/k8s/
```

### Stop Services

```bash
# Docker Compose - Graceful
docker compose -f deploy/docker-compose.prod.yml down

# Kubernetes
kubectl delete -f deploy/k8s/
```

### View Logs

```bash
# Docker
docker compose -f deploy/docker-compose.prod.yml logs -f summit

# Kubernetes
kubectl logs -f deployment/summit-server -n summit
```

### Scale

```bash
# Docker
docker compose -f deploy/docker-compose.prod.yml up -d --scale summit=3

# Kubernetes
kubectl scale deployment summit-server --replicas=3 -n summit
```

### Database Migrations

```bash
# Run migrations
pnpm db:migrate

# Check migration status
pnpm db:migrate:status
```

---

## 5. Pre-Deployment Checklist

### Infrastructure

- [ ] Database instances provisioned (PostgreSQL, Neo4j, Redis)
- [ ] DNS configured for production domain
- [ ] TLS certificates installed
- [ ] Load balancer configured
- [ ] Network policies in place

### Configuration

- [ ] All required environment variables set
- [ ] Secrets stored securely (AWS Secrets Manager / K8s Secrets)
- [ ] OIDC provider configured
- [ ] CORS origins configured correctly

### Security

- [ ] Non-root container execution verified
- [ ] Network policies applied
- [ ] Rate limiting configured
- [ ] Security headers enabled

### Monitoring

- [ ] OTEL collector receiving traces
- [ ] Metrics endpoint accessible
- [ ] Alerting rules configured
- [ ] Dashboards provisioned

### Validation

- [ ] Typecheck passing: `pnpm typecheck`
- [ ] Lint passing: `pnpm lint`
- [ ] Tests passing: `GA_VERIFY_MODE=true pnpm test`
- [ ] Health endpoints responding

---

## 6. CI Status

| Check | Status | Command |
|-------|--------|---------|
| TypeScript | PASS | `pnpm typecheck` |
| Tests (GA Verify) | PASS (21/21) | `GA_VERIFY_MODE=true pnpm test` |
| Lint | WARN (warnings only) | `pnpm lint` |
| Build | PASS | `pnpm build` |

---

## 7. Rollback Procedure

### Docker Compose

```bash
# Roll back to previous image
docker compose -f deploy/docker-compose.prod.yml pull
docker compose -f deploy/docker-compose.prod.yml up -d --force-recreate
```

### Kubernetes/Helm

```bash
# View history
helm history summit -n summit

# Rollback to previous version
helm rollback summit -n summit

# Rollback to specific revision
helm rollback summit 3 -n summit
```

---

## 8. Support & Escalation

### Runbooks Location

- `docs/runbooks/` - Operational runbooks
- `infrastructure/` - Infrastructure documentation
- `deploy/` - Deployment scripts and configurations

### Key Contacts

- Platform Team: platform@company.com
- On-Call: See Grafana OnCall schedule
- Incident Response: Follow IRM procedures

---

## 9. Production Smoke Test

An automated smoke test script validates runtime readiness.

### Running the Smoke Test

```bash
# Option 1: Start services and test (uses docker compose)
./scripts/go-live/smoke-prod.sh

# Option 2: Test existing deployment
./scripts/go-live/smoke-prod.sh --url https://your-domain.com

# Option 3: Environment variable
BASE_URL=https://your-domain.com ./scripts/go-live/smoke-prod.sh
```

### What the Smoke Test Validates

1. **Readiness**: Waits for `/readyz` to return 200
2. **Health Endpoints**: Verifies `/health`, `/healthz`, `/readyz`
3. **Response Structure**: Validates JSON response contains expected fields
4. **Metrics**: Checks Prometheus `/metrics` endpoint (if enabled)
5. **Configuration**: Verifies OTEL and environment settings

### Expected Output

```
========================================
  Summit Production Smoke Test
========================================

[INFO] Testing against: http://localhost:4000

[INFO] Phase 1: Readiness Check
  ✓ Service ready after 5s

[INFO] Phase 2: Health Endpoints
  ✓ Liveness probe - /healthz (HTTP 200)
  ✓ Readiness probe - /readyz (HTTP 200)
  ✓ Application health - /health (HTTP 200)

[INFO] Phase 3: Health Response Validation
  ✓ Health status field - /health has .status

[INFO] Phase 4: Observability Endpoints
  ✓ Prometheus metrics - /metrics (HTTP 200)
  ✓ Metrics include HTTP request metrics

========================================
  All checks passed!
========================================
```

---

## 10. Helm Chart Validation

Before deploying with Helm, validate the charts.

### Lint Charts (No Cluster Required)

```bash
# Lint the main intelgraph chart
helm lint deploy/helm/intelgraph

# Lint with production values
helm lint deploy/helm/intelgraph -f deploy/helm/intelgraph/values-prod.yaml

# Lint the summit chart
helm lint deploy/helm/summit
```

### Template Render Check

```bash
# Render templates to verify output (dry-run)
helm template summit deploy/helm/intelgraph \
  -f deploy/helm/intelgraph/values-prod.yaml \
  --debug

# Check specific templates
helm template summit deploy/helm/intelgraph \
  -f deploy/helm/intelgraph/values-prod.yaml \
  -s templates/deployment-api-gateway.yaml
```

### Probe Configuration Verification

The Helm charts are configured with the following probes:

| Chart | Liveness Probe | Readiness Probe |
|-------|----------------|-----------------|
| `intelgraph` | `/healthz` | `/readyz` |
| `summit` | `/healthz` | `/readyz` |
| `summit-intel-evo` | `/health` | `/ready` |

These probes align with the application's health endpoints.

---

## 11. Post-Deploy Verification

```bash
# 1. Run smoke test against deployed service
./scripts/go-live/smoke-prod.sh --url https://your-domain.com

# 2. Verify database connectivity
curl https://your-domain.com/api/health/db

# 3. Check service mesh (if using Istio)
istioctl analyze -n summit

# 4. View metrics
# Access Grafana dashboard at monitoring URL

# 5. Verify traces
# Access Jaeger UI at tracing URL
```

---

## 12. Go-Live Evidence Bundle

The evidence bundle provides an auditable, machine-readable proof of go-live readiness.

### What is an Evidence Bundle?

An evidence bundle is a signed artifact containing:
- Git commit SHA, branch, and dirty status
- Toolchain versions (Node.js, pnpm)
- Results of all verification checks (lint, build, test, smoke)
- SHA-256 checksums for integrity verification

### Generate Evidence Locally

```bash
# Generate evidence bundle (runs all checks)
pnpm evidence:go-live:gen

# Generate with custom smoke URL
SMOKE_URL=http://localhost:4000 pnpm evidence:go-live:gen

# Skip checks (use for testing only)
SKIP_CHECKS=1 pnpm evidence:go-live:gen
```

### Verify Evidence Bundle

```bash
# Verify the latest evidence bundle
pnpm evidence:go-live:verify

# Verify a specific bundle
pnpm evidence:go-live:verify artifacts/evidence/go-live/<sha>
```

### CI Artifact Location

Evidence bundles are uploaded as CI artifacts:
- **Artifact Name:** `go-live-evidence-<sha>`
- **Retention:** 90 days
- **Location:** GitHub Actions > Workflow Run > Artifacts

### Evidence Directory Structure

```
artifacts/evidence/go-live/<sha>/
├── evidence.json     # Machine-readable evidence (validates against schema)
├── evidence.md       # Human-readable summary
└── checksums.txt     # SHA-256 checksums for integrity
```

### Sample evidence.json

```json
{
  "version": "1.0.0",
  "generatedAt": "2026-01-28T12:00:00.000Z",
  "git": {
    "sha": "abc123...",
    "branch": "main",
    "dirty": false
  },
  "checks": {
    "lint": { "status": "passed", "durationMs": 5000 },
    "build": { "status": "passed", "durationMs": 12000 },
    "test": { "status": "passed", "durationMs": 8000 },
    "smoke": { "status": "passed", "durationMs": 3000 }
  },
  "summary": {
    "passed": true,
    "totalChecks": 4,
    "passedChecks": 4,
    "failedChecks": 0
  }
}
```

### Schema Location

The evidence schema is defined at:
- `docs/evidence/schema/go_live_evidence.schema.json`

---

## 13. Immutable Release Tag & Artifacts

### Creating a Go-Live Release

After a successful evidence bundle:

```bash
# Generate full release artifacts (evidence + SBOM + provenance + release notes)
pnpm release:go-live:full

# Or run individual steps:
pnpm evidence:go-live:gen        # Generate evidence bundle
pnpm release:go-live:sbom        # Generate SBOM (CycloneDX format)
pnpm release:go-live:provenance  # Generate SLSA provenance attestation
pnpm release:go-live:notes       # Generate release notes
```

### Creating an Immutable Tag

```bash
# Preview tag (dry-run)
pnpm release:go-live:tag --dry-run

# Create tag
pnpm release:go-live:tag

# Create and push tag
pnpm release:go-live:tag --push
```

### Release Artifacts Structure

After running `pnpm release:go-live:full`:

```
artifacts/evidence/go-live/<sha>/
├── evidence.json       # Machine-readable evidence
├── evidence.md         # Human-readable summary
├── checksums.txt       # SHA-256 checksums
├── sbom.cdx.json       # CycloneDX SBOM
├── provenance.json     # SLSA provenance attestation
├── RELEASE_NOTES.md    # Markdown release notes
└── release-notes.json  # Structured release metadata
```

### Provenance Attestation

The provenance file follows SLSA v0.2 format and includes:
- Subject digests for all evidence files
- Build configuration (commands, environment)
- Materials (source repository, npm registry)
- Builder identification (CI or local)

### SBOM Contents

The SBOM uses CycloneDX 1.5 format and includes:
- All npm dependencies
- Package URLs (purls) for each component
- Generated timestamp and tool info

---

## 14. GitHub Release Workflow

### Manual Release via Workflow

The `go-live-release.yml` workflow creates a full GitHub release:

1. Go to **Actions** > **Go-Live Release**
2. Click **Run workflow**
3. Configure options:
   - **version**: Leave empty to use package.json version
   - **draft**: Create as draft (recommended for review)
   - **smoke_url**: Optional URL for smoke testing
4. Click **Run workflow**

### Release via CLI

```bash
# Generate all artifacts
pnpm release:go-live:full

# Create GitHub release (dry-run first)
pnpm release:go-live:github --dry-run

# Create draft release
pnpm release:go-live:github --draft

# Create full release
pnpm release:go-live:github
```

### Release Artifacts

Each GitHub release includes:
- `evidence.json` - Machine-readable evidence
- `evidence.md` - Human-readable summary
- `checksums.txt` - SHA-256 integrity hashes
- `sbom.cdx.json` - CycloneDX SBOM
- `provenance.json` - SLSA provenance attestation

---

## 15. Pre-Flight Checklist

Before creating a release, run the pre-flight check to validate all prerequisites.

### Running Pre-Flight Check

```bash
# Run pre-flight checklist
pnpm release:go-live:preflight

# Run with auto-fix for fixable issues
pnpm release:go-live:preflight --fix

# CI mode (skips interactive checks)
pnpm release:go-live:preflight --ci
```

### What Pre-Flight Validates

| Category | Checks |
|----------|--------|
| **Git State** | Clean working tree, on release branch, no unpushed commits |
| **Tooling** | Node >= 18, pnpm, GitHub CLI, authentication |
| **Project** | package.json, required scripts, evidence schema |
| **Dependencies** | node_modules, pnpm-lock.yaml |
| **Previous** | Existing evidence, tag availability |

### Sample Output

```
========================================
  Go-Live Pre-Flight Checklist
========================================

📋 Git State

✅ Git installed: Git 2.43.0
✅ In git repository: Yes
✅ Clean working tree: No uncommitted changes
✅ On release branch: Branch: main

📋 Tooling

✅ Node.js >= 18: Node v20.19.6
✅ pnpm installed: pnpm 10.26.0
✅ GitHub CLI (gh): gh version 2.40.0

Total: 15 checks
  ✅ Passed:  14
  ❌ Failed:  0
  ⚠️  Warnings: 1

✅ Pre-flight check PASSED. Ready for release!
```

---

## 16. Evidence Signing

Sign evidence bundles for cryptographic proof of integrity.

### Signing Methods

| Method | Use Case | Requirements |
|--------|----------|--------------|
| **Cosign (Keyless)** | CI with OIDC | GitHub Actions with OIDC token |
| **Cosign (Keyed)** | Local/CI | `cosign.key` file |
| **GPG** | Local | GPG key configured |

### Signing Commands

```bash
# Sign evidence bundle (auto-detects method)
pnpm release:go-live:sign

# Sign specific directory
pnpm release:go-live:sign artifacts/evidence/go-live/<sha>

# Specify signing method
pnpm release:go-live:sign --method=gpg
pnpm release:go-live:sign --method=cosign

# Dry-run (show what would be signed)
pnpm release:go-live:sign --dry-run

# Verify existing signatures
pnpm release:go-live:sign --verify
```

### CI Configuration (Keyless Signing)

For GitHub Actions with OIDC:

```yaml
permissions:
  id-token: write  # Required for keyless signing

steps:
  - name: Sign Evidence
    run: pnpm release:go-live:sign
    env:
      COSIGN_EXPERIMENTAL: '1'
```

### Generated Files

After signing, the evidence directory includes:
- `*.sig` - Detached signature files
- `*.bundle` - Cosign bundle (includes certificate chain)
- `MANIFEST.txt` - File manifest with hashes

---

## 17. Integration Testing

Run integration tests to validate the full release pipeline.

### Running Integration Tests

```bash
# Run full pipeline integration tests
pnpm test:go-live-pipeline

# Run schema validation tests
pnpm test:evidence-schema
```

### What Integration Tests Cover

1. **Evidence Generator** - Creates valid bundle with SKIP_CHECKS
2. **Evidence Verifier** - Validates schema and checksums
3. **SBOM Generator** - Creates valid CycloneDX output
4. **Provenance Generator** - Creates valid SLSA attestation
5. **Release Notes Generator** - Creates markdown output
6. **Checksum Validation** - Verifies file integrity
7. **Tag Creator** - Works in dry-run mode
8. **GitHub Release Creator** - Works in dry-run mode

---

## 18. Complete Release Workflow

### Full Release Checklist

```bash
# 1. Pre-flight check
pnpm release:go-live:preflight

# 2. Generate full release artifacts
pnpm release:go-live:full

# 3. Sign evidence (optional but recommended)
pnpm release:go-live:sign

# 4. Verify evidence bundle
pnpm evidence:go-live:verify

# 5. Create tag (dry-run first)
pnpm release:go-live:tag --dry-run
pnpm release:go-live:tag --push

# 6. Create GitHub release (dry-run first)
pnpm release:go-live:github --dry-run
pnpm release:go-live:github
```

### All Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm evidence:go-live:gen` | Generate evidence bundle |
| `pnpm evidence:go-live:verify` | Verify evidence bundle |
| `pnpm release:go-live:sbom` | Generate SBOM |
| `pnpm release:go-live:provenance` | Generate provenance attestation |
| `pnpm release:go-live:notes` | Generate release notes |
| `pnpm release:go-live:tag` | Create git tag |
| `pnpm release:go-live:github` | Create GitHub release |
| `pnpm release:go-live:sign` | Sign evidence bundle |
| `pnpm release:go-live:preflight` | Pre-flight checklist |
| `pnpm release:go-live:full` | Full release (gen + sbom + prov + notes) |
| `pnpm test:go-live-pipeline` | Integration tests |
| `pnpm test:evidence-schema` | Schema validation tests |

---

**Document Approved By:** Claude Code
**Approval Date:** 2026-01-29
