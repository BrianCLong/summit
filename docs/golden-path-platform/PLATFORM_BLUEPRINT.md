# Golden Path Platform Blueprint

> **Version**: 1.0.0
> **Status**: Draft
> **Last Updated**: 2025-12-06
> **Owner**: Golden Path Platform Team

## Executive Summary

The Golden Path Platform provides a paved-road approach for building, deploying, and operating services within CompanyOS. By providing opinionated templates, standardized CI/CD pipelines, and policy-as-code governance, we make the **right thing the easy thing** for engineering teams.

---

## 1. Standard Service Types

CompanyOS recognizes five canonical service archetypes. Each has specific characteristics, infrastructure requirements, and template configurations.

### 1.1 API Service

**Purpose**: Synchronous request/response services exposing REST or GraphQL endpoints.

| Attribute | Default |
|-----------|---------|
| Runtime | Node.js 20 LTS (Express/Fastify) or Go 1.22+ |
| Protocol | HTTP/2, gRPC optional |
| Scaling | HPA (CPU/Memory), KEDA (request rate) |
| SLO Target | 99.9% availability, p99 < 500ms |
| Health Endpoints | `/health`, `/health/ready`, `/health/live` |
| Metrics | Prometheus `/metrics` (RED metrics) |

**Example Use Cases**: GraphQL Gateway, REST API, BFF (Backend for Frontend)

### 1.2 Worker Service

**Purpose**: Asynchronous message/event consumers processing background work.

| Attribute | Default |
|-----------|---------|
| Runtime | Node.js 20 LTS or Python 3.11+ |
| Protocol | Kafka, Redis Streams, SQS |
| Scaling | KEDA (queue depth, lag) |
| SLO Target | 99.9% processing success, p95 < 30s |
| Metrics | Consumer lag, processing rate, DLQ size |

**Example Use Cases**: Event processors, notification handlers, async pipelines

### 1.3 Batch Job

**Purpose**: Scheduled or triggered data processing jobs.

| Attribute | Default |
|-----------|---------|
| Runtime | Python 3.11+ (Pandas/Polars) or Node.js |
| Scheduling | Kubernetes CronJob, Argo Workflows |
| Scaling | Vertical (job-level resources) |
| SLO Target | 99% completion rate within window |
| Monitoring | Job duration, success/failure rate |

**Example Use Cases**: ETL jobs, report generation, data sync, ML training

### 1.4 Data Service

**Purpose**: Stateful services managing database access and data transformation.

| Attribute | Default |
|-----------|---------|
| Runtime | Node.js 20 (Prisma/Knex) or Python (SQLAlchemy) |
| Databases | PostgreSQL 15+, Neo4j 5.x, Redis |
| Scaling | Vertical primary, horizontal read replicas |
| SLO Target | 99.95% availability, p99 < 100ms (reads) |
| Features | Connection pooling, schema migrations, audit logging |

**Example Use Cases**: User data service, graph data service, audit ledger

### 1.5 Frontend Application

**Purpose**: Single-page applications (SPAs) and micro-frontends.

| Attribute | Default |
|-----------|---------|
| Framework | React 18+ (Vite), Next.js 14+ |
| CDN | CloudFront/Fastly with edge caching |
| Scaling | Static assets, serverless functions |
| SLO Target | Core Web Vitals (LCP < 2.5s, FID < 100ms, CLS < 0.1) |
| Features | Code splitting, service worker, A/B testing |

**Example Use Cases**: Console UI, admin dashboard, customer portal

---

## 2. Default Tech Stack

### 2.1 Infrastructure-as-Code

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Cluster IaC** | Terraform 1.5+ | Cloud infrastructure provisioning |
| **Kubernetes** | EKS/GKE 1.28+ | Container orchestration |
| **Helm** | v3.12+ | Kubernetes package management |
| **Secrets** | External Secrets + Vault | Secret rotation and injection |

### 2.2 CI/CD

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Pipeline** | GitHub Actions | Build, test, deploy automation |
| **Registry** | ECR/GAR | Container image storage |
| **Signing** | Cosign + Sigstore | Image attestation and SBOM |
| **GitOps** | ArgoCD | Kubernetes deployment sync |
| **Rollouts** | Argo Rollouts | Canary/blue-green deployments |

### 2.3 Containerization

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Build** | Docker BuildKit | Multi-stage, cached builds |
| **Base Images** | Distroless / Alpine | Minimal attack surface |
| **Scanning** | Trivy + Grype | Vulnerability detection |

### 2.4 Observability

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Metrics** | Prometheus + Grafana | Time-series metrics and dashboards |
| **Logging** | Loki + Promtail | Log aggregation and search |
| **Tracing** | OpenTelemetry + Tempo | Distributed tracing |
| **Alerting** | Alertmanager + PagerDuty | Incident notification |

### 2.5 Governance

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Authorization** | OPA (Rego) | ABAC/RBAC policy enforcement |
| **Admission** | Kyverno | Kubernetes policy gates |
| **Compliance** | CycloneDX SBOM | Software bill of materials |
| **Audit** | Audit Ledger Service | Immutable action logging |

---

## 3. Opinionated Directory Structure

### 3.1 Service Repository Layout

```
service-name/
├── .github/
│   └── workflows/
│       └── ci.yml                 # Service-specific CI (calls reusable)
├── src/
│   ├── index.ts                   # Entry point with graceful shutdown
│   ├── app.ts                     # Application setup (Express/Fastify)
│   ├── config.ts                  # Zod-validated configuration
│   ├── routes/                    # Route handlers
│   ├── services/                  # Business logic
│   ├── repositories/              # Data access layer
│   └── middleware/                # Express middleware
├── tests/
│   ├── unit/                      # Unit tests (*.test.ts)
│   ├── integration/               # Integration tests
│   └── fixtures/                  # Test data
├── slos/
│   └── slos.yaml                  # SLO definitions
├── dashboards/
│   └── grafana.json               # Pre-configured Grafana dashboard
├── policies/
│   └── authz.rego                 # Service-specific OPA policies
├── migrations/
│   └── *.sql                      # Database migrations (if applicable)
├── Dockerfile                     # Multi-stage production build
├── docker-compose.yml             # Local development dependencies
├── package.json                   # Package manifest
├── tsconfig.json                  # TypeScript configuration
├── jest.config.js                 # Test configuration
├── .eslintrc.json                 # Linting rules
├── .env.example                   # Environment template
├── README.md                      # Service documentation
└── CHANGELOG.md                   # Release history
```

### 3.2 Shared Library Layout

```
packages/library-name/
├── src/
│   ├── index.ts                   # Public exports
│   ├── types.ts                   # TypeScript interfaces
│   └── *.ts                       # Implementation modules
├── tests/
│   └── *.test.ts                  # Unit tests
├── package.json                   # ESM module configuration
├── tsconfig.json                  # TypeScript build config
├── README.md                      # Usage documentation
└── CHANGELOG.md                   # Version history
```

### 3.3 Data Pipeline Layout

```
pipelines/pipeline-name/
├── src/
│   ├── __main__.py                # Entry point
│   ├── config.py                  # Pydantic configuration
│   ├── extract.py                 # Data extraction
│   ├── transform.py               # Transformation logic
│   └── load.py                    # Data loading
├── tests/
│   └── *.py                       # pytest tests
├── contracts/
│   └── schema.avsc                # Avro/JSON schemas
├── slos/
│   └── slos.yaml                  # Pipeline SLOs
├── Dockerfile                     # Python pipeline container
├── pyproject.toml                 # Python dependencies
├── requirements.txt               # Locked dependencies
└── README.md                      # Pipeline documentation
```

---

## 4. Monorepo Integration

### 4.1 Workspace Configuration

All services live within the pnpm workspace:

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'           # Frontend applications
  - 'packages/*'       # Shared libraries
  - 'services/*'       # Backend services
  - 'pipelines/*'      # Data pipelines
  - 'contracts/*'      # Data contracts
  - 'tools/*'          # Development tools
```

### 4.2 Turbo Pipeline Configuration

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "outputs": []
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "deploy": {
      "dependsOn": ["build", "test", "lint"],
      "cache": false
    }
  }
}
```

---

## 5. Service Discovery and Naming

### 5.1 Package Naming Convention

| Type | Pattern | Example |
|------|---------|---------|
| API Service | `@companyos/<domain>-api` | `@companyos/users-api` |
| Worker | `@companyos/<domain>-worker` | `@companyos/notifications-worker` |
| Library | `@companyos/<name>` | `@companyos/auth-utils` |
| Frontend | `@companyos/<name>-ui` | `@companyos/console-ui` |

### 5.2 Kubernetes Service Naming

```
<service-name>.<namespace>.svc.cluster.local
```

- **Namespaces**: `production`, `staging`, `preview-<pr-id>`
- **Service Names**: kebab-case matching package name

---

## 6. Environment Strategy

### 6.1 Environment Tiers

| Environment | Purpose | Infrastructure | Data |
|-------------|---------|----------------|------|
| **local** | Developer workstation | docker-compose | Seed fixtures |
| **preview** | PR validation | Ephemeral K8s namespace | Anonymized subset |
| **staging** | Pre-production testing | Dedicated cluster | Production mirror (redacted) |
| **production** | Live traffic | Multi-AZ HA cluster | Real data |

### 6.2 Configuration Management

- **Local**: `.env` files (gitignored)
- **Preview/Staging/Production**: Kubernetes ConfigMaps + External Secrets
- **Validation**: Zod schemas validate all config at startup (fail-fast)

---

## 7. Default Security Posture

### 7.1 Zero-Trust Defaults

| Control | Default |
|---------|---------|
| Network Policy | Default-deny ingress/egress |
| mTLS | Required for all service-to-service |
| RBAC | Minimal service accounts |
| Pod Security | Restricted (no root, drop capabilities) |
| Image Policy | Signed images only (Cosign verified) |

### 7.2 Supply Chain Security

- **SBOM**: CycloneDX generated for every build
- **Vulnerability Scanning**: Trivy blocks critical/high CVEs
- **Dependency Pinning**: pnpm lockfile integrity verification
- **Provenance**: SLSA Level 2 attestations

---

## Next Steps

1. Review with architecture council
2. Pilot with 2-3 new services
3. Iterate on scaffolding CLI based on feedback
4. Document exception process for non-standard requirements

---

## Related Documents

- [ADR-0014: Golden Path Platform Adoption](../adr/ADR-0014-golden-path-platform.md)
- [Scaffolding Templates](./SCAFFOLDING_TEMPLATES.md)
- [CI/CD Pipeline Design](./CICD_PIPELINE.md)
- [Service Onboarding Checklist](./ONBOARDING_CHECKLIST.md)
