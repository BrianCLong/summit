# IntelGraph / Maestro Conductor Repository Structure

> **Last Updated**: 2025-11-20
> **Companion Document**: See [ARCHITECTURE_MAP.generated.yaml](./ARCHITECTURE_MAP.generated.yaml) for machine-readable service map

## Overview

The **summit** repository is a **deployable-first monorepo** housing the IntelGraph intelligence analysis platform and Maestro Conductor orchestration system. It combines graph analytics, real-time collaboration, AI/ML capabilities, and enterprise security into a cohesive platform for the intelligence community.

### Key Metrics

- **Active Services**: 15 core + 6 AI/ML optional
- **Total Packages**: 200+ (pnpm workspace)
- **Languages**: TypeScript/Node.js (primary), Python (AI/ML), JavaScript
- **Databases**: PostgreSQL, Neo4j, Redis
- **CI/CD Workflows**: 100+
- **Archive Directories**: 7 designated locations

### Architecture Pattern

**Deployable-First Principles**:
- Golden path validation (`make smoke`) before any development
- Smoke tests gate all deployments and merges
- Clear separation of active vs. archived code
- Comprehensive observability built into every service

## Repository Layout

```
summit/
├── README.md                           # Primary documentation
├── ARCHITECTURE_MAP.generated.yaml     # Machine-readable service map (this doc's companion)
├── REPOSITORY-STRUCTURE.md             # This file
├── pnpm-workspace.yaml                 # Monorepo workspace configuration
├── docker-compose.yml                  # Production compose file
├── docker-compose.dev.yml              # Development compose file
├── docker-compose.ai.yml               # AI/ML services (optional)
├── .env.example                        # Environment variable template
├── Makefile                            # Build automation
├── start.sh                            # One-command startup script
│
├── 📂 ACTIVE SERVICES & CODE
│   ├── server/                         # ⭐ Main backend API (Node.js/TypeScript)
│   ├── client/                         # ⭐ Main frontend (React 18 + Vite)
│   ├── apps/                           # Application entrypoints (21 apps)
│   ├── packages/                       # Shared libraries (60+ packages)
│   ├── services/                       # Microservices & modules (150+)
│   ├── contracts/                      # API contracts & schemas
│   └── tools/                          # Development tools
│
├── 📂 INFRASTRUCTURE & OPS
│   ├── ops/                            # Operational configurations
│   │   ├── devkit/                     # Development kit configs
│   │   └── observability/              # Monitoring configs
│   ├── observability/                  # Prometheus, Grafana dashboards
│   │   ├── prometheus/
│   │   └── grafana/
│   ├── kubernetes/                     # K8s manifests
│   ├── helm/                           # Helm charts
│   ├── terraform/                      # Infrastructure as Code
│   ├── policy/                         # OPA policy bundles
│   └── scripts/                        # Build & deployment scripts
│
├── 📂 CI/CD & WORKFLOWS
│   └── .github/
│       └── workflows/                  # 100+ GitHub Actions workflows
│           ├── ci.yml                  # ⭐ Main CI pipeline
│           ├── security.yml            # ⭐ Security scanning
│           ├── release.yml             # ⭐ Release automation
│           ├── smoke-compose.yml       # Smoke tests
│           └── ...                     # Specialized workflows
│
├── 📂 DOCUMENTATION & RUNBOOKS
│   ├── docs/                           # Technical documentation
│   │   ├── architecture/               # Architecture diagrams
│   │   ├── api/                        # API documentation
│   │   ├── deployment/                 # Deployment guides
│   │   └── archive/                    # Archived docs
│   ├── RUNBOOKS/                       # Operational runbooks (40+)
│   │   ├── INDEX.md                    # Runbook index
│   │   ├── dev-bootstrap.yaml
│   │   ├── rollback.yaml
│   │   └── disaster-recovery.json
│   └── adr/                            # Architecture Decision Records
│
├── 📂 DATA & TESTING
│   ├── data/                           # Test data & fixtures
│   │   └── golden-path/                # Golden path demo data
│   ├── tests/                          # Test suites
│   ├── e2e/                            # End-to-end tests
│   └── benchmarks/                     # Performance benchmarks
│
└── 📂 ARCHIVES (Excluded from workspace)
    ├── .archive/                       # Main archive
    ├── archive/                        # Date-stamped snapshots
    ├── .disabled/                      # Disabled components
    └── v4/archive/                     # Legacy version archive
```

## Active Services (Deployed)

### Core Application Services

These services are **actively deployed and maintained**, referenced in `docker-compose.yml` and CI workflows:

#### 1. **api** (IntelGraph GraphQL API)
- **Path**: `server/`
- **Language**: TypeScript (Node.js 20+)
- **Entrypoint**: `src/index.ts`
- **Port**: 4000
- **Key Technologies**: Apollo Server v4, Express, Neo4j, PostgreSQL, Redis
- **Features**: GraphQL API, WebSocket subscriptions, JWT auth, RBAC, real-time updates
- **SLO Critical**: ✅ Yes

#### 2. **web** (React Frontend)
- **Path**: `client/`
- **Language**: TypeScript/React 18
- **Entrypoint**: `src/main.jsx`
- **Port**: 3000
- **Build Tool**: Vite
- **Key Technologies**: Material-UI, Cytoscape.js, Redux Toolkit, Apollo Client
- **Features**: Graph visualization, real-time collaboration, responsive design
- **SLO Critical**: ✅ Yes

#### 3. **worker** (Background Worker)
- **Path**: `server/`
- **Entrypoint**: `src/conductor/worker-entrypoint.ts`
- **Port**: 4100
- **Key Technologies**: BullMQ, Redis queues
- **Features**: Async job processing, scheduled tasks
- **SLO Critical**: ⚠️ No (but availability-sensitive)

### Database Services

#### 4. **postgres** (PostgreSQL 16)
- **Port**: 5432
- **Purpose**: Relational data, user accounts, metadata, audit logs
- **Extensions**: pgvector
- **SLO Critical**: ✅ Yes

#### 5. **redis** (Redis 7)
- **Port**: 6379
- **Purpose**: Sessions, caching, BullMQ queues, rate limiting, pub/sub
- **SLO Critical**: ✅ Yes

#### 6. **neo4j** (Neo4j 5.8)
- **Ports**: 7474 (HTTP), 7687 (Bolt)
- **Purpose**: Graph database for entity relationships and analytics
- **Plugins**: APOC, Graph Data Science
- **SLO Critical**: ✅ Yes

### Observability Stack

#### 7. **prometheus** (Metrics)
- **Port**: 9090
- **Config**: `ops/observability/prometheus.yml`

#### 8. **grafana** (Dashboards)
- **Port**: 8080
- **Provisioning**: `ops/observability/grafana/`

#### 9. **jaeger** (Distributed Tracing)
- **Port**: 16686

#### 10. **otel-collector** (OpenTelemetry)
- **Ports**: 4317 (gRPC), 4318 (HTTP), 9464 (Prometheus)

### Policy & Security

#### 11. **opa** (Open Policy Agent)
- **Port**: 8181
- **Policy Path**: `policy/opa/`
- **Purpose**: Policy-based authorization (ABAC)
- **SLO Critical**: ✅ Yes

### Development Support

#### 12. **mock-services** (Dev Mocks)
- **Port**: 4010
- **Script**: `scripts/devkit/mock-services.js`

#### 13. **migrations** (DB Migrations)
- **Type**: One-time job
- **Script**: `scripts/db_migrate.cjs`

#### 14. **seed-fixtures** (Demo Data)
- **Type**: One-time job
- **Script**: `scripts/devkit/seed-fixtures.js`

### AI/ML Services (Optional - Profile: 'ai' or 'kafka')

These services are **active but optional**, enabled via Docker Compose profiles:

#### 15. **ai-worker** (Multimodal AI)
- **Profile**: `ai`
- **Language**: Python 3.8+
- **Dockerfile**: `Dockerfile.ai`
- **Features**: OCR, NLP, speech-to-text, object detection, face recognition, embeddings
- **Technologies**: Tesseract, YOLO, Whisper, spaCy, Sentence Transformers

#### 16. **kafka** + **zookeeper** (Event Streaming)
- **Profile**: `kafka`
- **Ports**: 9092, 29092

#### 17. **ingestion-service** (Data Pipelines)
- **Profile**: `kafka`
- **Language**: Python

#### 18. **nlp-service** (NLP Processing)
- **Profile**: `ai`
- **Language**: Python (spaCy)

#### 19. **reliability-service** (Credibility Scoring)
- **Profile**: `kafka`
- **Language**: Python
- **Port**: 8001

## Archive Directories

The following directories contain **historical code** explicitly excluded from the pnpm workspace, docker-compose files, and CI/CD:

1. **`.archive/`** - Main archive directory
   - `workflows/` - Old GitHub Actions
   - `workflows-consolidated/` - Consolidated archived workflows

2. **`archive/`** - Date-stamped snapshots
   - `20250926/` - September 2026 archive

3. **`.disabled/`** - Explicitly disabled features
   - `intelgraph-mcp.disabled/`
   - `maestro-mcp.disabled/`
   - `adc/`, `afl-store/`, `atl/`, `cfa-tdw/`

4. **`client/_stashed_archive/`** - Archived client components

5. **`v4/archive/`** - Version 4 legacy code

6. **`docs/archive/`** + **`docs/archived/`** - Superseded documentation

7. **Workspace Exclusion**: `pnpm-workspace.yaml` explicitly excludes `archive/**`

## CI/CD Pipelines

### Primary Pipelines (Required for Merge)

#### 1. **ci.yml** (Continuous Integration)
- **Triggers**: PRs, pushes to main
- **Jobs**:
  - `build-test`: Lint, typecheck, build, unit tests (Node 18.x, 20.x matrix)
  - `golden-path`: Docker stack smoke tests
- **Services Tested**: api, web, postgres, redis, neo4j, prometheus, grafana
- **SLO Gate**: ✅ Yes

#### 2. **security.yml** (Security Scanning)
- **Triggers**: PRs, pushes to main, nightly cron
- **Jobs**:
  - `codeql`: JavaScript/Python analysis
  - `dependency-review`: Vulnerability scanning
  - `secret-scan`: Gitleaks
- **Required**: ✅ Yes

#### 3. **release.yml** (Release Automation)
- **Triggers**: Pushes to main (package.json, docker-compose changes)
- **Artifacts**: `summit-deployable-bundle` (compose files, start.sh, observability configs)

### Specialized Pipelines (100+)

- **Testing**: `smoke-compose.yml`, `playwright.smoke.yml`, `k6-load.yml`
- **Security**: `trivy.yml` (containers), `sbom.yml` (compliance)
- **Operations**: `nightly-ops-delta.yml`, `terraform-drift.yml`
- **Policy**: `policy-ci.yml`, `policy-gate.yml`
- **And 90+ more specialized workflows**

## Monorepo Structure (pnpm Workspace)

### Package Organization

| Pattern | Count | Description | Examples |
|---------|-------|-------------|----------|
| `apps/*` | 21 | Application entrypoints | `apps/server`, `apps/web`, `apps/gateway` |
| `packages/*` | 60+ | Shared libraries | `packages/contracts`, `packages/sdk-ts`, `packages/maestro-cli` |
| `services/*` | 150+ | Microservices & modules | `services/api`, `services/graph-core`, `services/authz-gateway` |
| `contracts/*` | - | API contracts | GraphQL schemas, OpenAPI specs |
| `server` | 1 | Main backend (singleton) | Primary GraphQL API |
| `client` | 1 | Main frontend (singleton) | React SPA |
| `tools/*` | - | Dev tools | Build scripts, generators |

### Workspace Configuration

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'services/*'
  - 'contracts/*'
  - 'server'
  - 'client'
  - 'tools/*'
exclude:
  - 'archive/**'
```

## Service Classification Methodology

### Active Services
Services classified as **active** meet one or more criteria:
- ✅ Referenced in `docker-compose.yml` or `docker-compose.dev.yml`
- ✅ Has a `compose_service` entry with health checks
- ✅ Referenced in primary CI workflows (`ci.yml`, `security.yml`, `release.yml`)
- ✅ Documented in `README.md` as production service
- ✅ Has active SLO targets

### Active Optional Services
Services in Docker Compose **profiles** (`ai`, `kafka`) for optional capabilities.

### Archived Services
Code in designated archive directories:
- `.archive/`, `archive/`, `.disabled/`
- Excluded from `pnpm-workspace.yaml`
- Not referenced in any docker-compose or CI files

### Ambiguous Cases

⚠️ **Note**: The `services/` directory contains 150+ subdirectories. Most are **library packages** or **future microservices** not yet deployed. Only services with active docker-compose entries are classified as production services in this map.

## SLO Targets

### Performance SLOs

| Metric | Target | Criticality |
|--------|--------|-------------|
| GraphQL Read (p95) | ≤ 350 ms | Critical |
| GraphQL Read (p99) | ≤ 900 ms | Critical |
| GraphQL Write (p95) | ≤ 700 ms | Critical |
| Subscriptions (p95) | ≤ 250 ms | Critical |
| Neo4j 1-hop (p95) | ≤ 300 ms | Critical |
| Neo4j 2-3 hop (p95) | ≤ 1200 ms | Critical |
| Availability | ≥ 99.9% | Critical |

### Cost Targets

| Environment | Monthly Budget (USD) |
|-------------|----------------------|
| Dev | $1,000 |
| Staging | $3,000 |
| Production | $18,000 |
| LLM Services | $5,000 (alert at 80%) |

## Security & Compliance

### Authentication & Authorization
- **OIDC + JWT**: Stateless token-based auth
- **ABAC via OPA**: Attribute-based access control
- **mTLS**: Service-to-service encryption
- **RBAC**: Role-based access control

### Data Protection
- **Field-level encryption**: Sensitive data at rest
- **Provenance ledger**: Audit trail for all operations
- **Retention policies**: Data lifecycle management

### Compliance Frameworks
- GDPR ready
- SOC 2 Type II controls
- NIST Cybersecurity Framework alignment

## Quick Start Commands

### Local Development

```bash
# One-command startup (recommended)
./start.sh

# Or manual startup
make bootstrap          # Install deps, create .env
make up                 # Start core services
make smoke              # Run golden path validation

# With AI/ML services
./start.sh --ai
# or
make up-ai
```

### Testing & Validation

```bash
# Unit tests
pnpm test

# E2E smoke tests
pnpm run test:smoke

# Lint & typecheck
pnpm lint
pnpm typecheck

# Build entire workspace
pnpm build
```

### Service Access Points

- **Frontend**: http://localhost:3000
- **GraphQL API**: http://localhost:4000/graphql
- **GraphQL Playground**: http://localhost:4000/graphql
- **Health Check**: http://localhost:4000/health
- **Metrics**: http://localhost:4000/metrics
- **Neo4j Browser**: http://localhost:7474
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:8080 (dev) or http://localhost:3001 (alt config)
- **Jaeger**: http://localhost:16686

## Documentation Index

### Primary Documentation
- [README.md](./README.md) - Main repository documentation
- [ARCHITECTURE_MAP.generated.yaml](./ARCHITECTURE_MAP.generated.yaml) - Machine-readable service map
- [REPOSITORY-STRUCTURE.md](./REPOSITORY-STRUCTURE.md) - This document

### Technical Guides
- `docs/architecture/` - Architecture diagrams, C4 models, trust boundaries
- `docs/api/` - API documentation, GraphQL schema
- `docs/deployment/` - Deployment guides (K8s, Helm, Terraform)

### Operational Runbooks
- `RUNBOOKS/INDEX.md` - Runbook catalog
- `RUNBOOKS/dev-bootstrap.yaml` - Development setup
- `RUNBOOKS/disaster-recovery.json` - DR procedures
- `RUNBOOKS/rollback.yaml` - Rollback procedures
- `RUNBOOKS/release-captain-quick-reference.md` - Release process

### Architecture Decisions
- `adr/` - Architecture Decision Records

## Related Resources

### External Documentation
- [GraphQL Best Practices](docs/graphql-guide.md)
- [React Development Guide](docs/react-guide.md)
- [Neo4j Query Patterns](docs/neo4j-guide.md)

### Community
- [GitHub Issues](https://github.com/BrianCLong/summit/issues)
- [GitHub Discussions](https://github.com/BrianCLong/summit/discussions)
- [CHANGELOG.md](./CHANGELOG.md)

---

## Maintenance Notes

### Updating This Document

This document should be regenerated when:
1. New services are added to docker-compose files
2. Services are deprecated or moved to archives
3. CI/CD pipelines are significantly restructured
4. Major architectural changes occur

### Regeneration Command

```bash
# This document was generated via the Claude Code task:
# "Build an up-to-date, machine-readable map of the monorepo"
```

### Verification

To verify this map is accurate:
1. Check services match `docker-compose.yml` entries
2. Confirm CI workflows match `.github/workflows/ci.yml`
3. Validate archive paths exist and are excluded from workspace
4. Run `pnpm install` to ensure workspace config is valid

---

**Last Generated**: 2025-11-20
**Generated By**: Architecture mapping task
**Companion YAML**: [ARCHITECTURE_MAP.generated.yaml](./ARCHITECTURE_MAP.generated.yaml)
