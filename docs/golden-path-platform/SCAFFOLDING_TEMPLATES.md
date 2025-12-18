# Scaffolding & Templates Design

> **Version**: 1.0.0
> **Status**: Draft
> **Last Updated**: 2025-12-06

## Overview

This document specifies the scaffolding system that enables teams to create new services, libraries, pipelines, and frontends with all Golden Path defaults pre-configured. The scaffold CLI automatically includes tests, linting, OPA/policy hooks, SBOM generation, SLO definitions, and observability from day one.

---

## 1. Scaffold CLI

### 1.1 Installation

```bash
# Available as a workspace tool
pnpm --filter @companyos/scaffold-cli build

# Or run directly
pnpm dlx @companyos/scaffold create
```

### 1.2 Commands

```bash
# Interactive mode
companyos create

# Direct creation
companyos create api-service --name users-api --port 8080
companyos create worker --name notifications-worker --queue events
companyos create batch-job --name daily-report --schedule "0 6 * * *"
companyos create data-service --name graph-data --database neo4j
companyos create frontend --name console-ui --framework next
companyos create library --name auth-utils
companyos create pipeline --name etl-customers
```

### 1.3 Common Options

| Flag | Description | Default |
|------|-------------|---------|
| `--name` | Service/package name | Required |
| `--description` | Package description | Empty |
| `--team` | Owning team (for alerts) | Prompted |
| `--tier` | Criticality tier (1-3) | 2 |
| `--port` | HTTP port (API services) | 8080 |
| `--dry-run` | Preview without creating | false |

---

## 2. Template Specifications

### 2.1 API Service Template

**Command**: `companyos create api-service --name <name>`

**Generated Structure**:
```
services/<name>/
├── .github/
│   └── workflows/
│       └── ci.yml
├── src/
│   ├── index.ts              # Graceful shutdown, signal handlers
│   ├── app.ts                # Express + middleware stack
│   ├── config.ts             # Zod-validated config
│   ├── logger.ts             # Pino structured logging
│   ├── metrics.ts            # Prometheus client
│   ├── routes/
│   │   ├── health.ts         # /health, /health/ready, /health/live
│   │   └── index.ts          # Route registration
│   └── middleware/
│       ├── auth.ts           # JWT/OIDC validation
│       ├── rateLimit.ts      # Rate limiting
│       └── tracing.ts        # OpenTelemetry context
├── tests/
│   ├── unit/
│   │   └── app.test.ts
│   └── integration/
│       └── health.test.ts
├── slos/
│   └── slos.yaml
├── dashboards/
│   └── grafana.json
├── policies/
│   └── authz.rego
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── jest.config.js
├── .eslintrc.json
├── .env.example
└── README.md
```

**Included Defaults**:

```typescript
// src/config.ts
import { z } from 'zod';

export const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(8080),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  OTEL_SERVICE_NAME: z.string().default('{{SERVICE_NAME}}'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
});

export type Config = z.infer<typeof configSchema>;
export const config = configSchema.parse(process.env);
```

```typescript
// src/metrics.ts
import { Registry, Counter, Histogram, collectDefaultMetrics } from 'prom-client';

export const registry = new Registry();
collectDefaultMetrics({ register: registry });

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [registry],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [registry],
});
```

```yaml
# slos/slos.yaml
apiVersion: sloth.slok.dev/v1
kind: PrometheusServiceLevel
metadata:
  name: {{SERVICE_NAME}}-slos
spec:
  service: "{{SERVICE_NAME}}"
  slos:
    - name: "availability"
      objective: 99.9
      description: "{{SERVICE_NAME}} HTTP availability"
      sli:
        events:
          errorQuery: sum(rate(http_requests_total{service="{{SERVICE_NAME}}",status=~"5.."}[{{.window}}]))
          totalQuery: sum(rate(http_requests_total{service="{{SERVICE_NAME}}"}[{{.window}}]))
      alerting:
        name: "{{SERVICE_NAME}}HighErrorRate"
        pageAlert:
          disable: false
        ticketAlert:
          disable: false
    - name: "latency"
      objective: 99.0
      description: "{{SERVICE_NAME}} p99 latency under 500ms"
      sli:
        events:
          errorQuery: sum(rate(http_request_duration_seconds_bucket{service="{{SERVICE_NAME}}",le="0.5"}[{{.window}}]))
          totalQuery: sum(rate(http_request_duration_seconds_count{service="{{SERVICE_NAME}}"}[{{.window}}]))
```

---

### 2.2 Worker Service Template

**Command**: `companyos create worker --name <name> --queue <queue-name>`

**Generated Structure**:
```
services/<name>/
├── src/
│   ├── index.ts              # Consumer lifecycle
│   ├── config.ts             # Queue connection config
│   ├── consumer.ts           # Message handler
│   ├── handlers/             # Message type handlers
│   │   └── index.ts
│   ├── dlq.ts                # Dead letter queue logic
│   └── metrics.ts            # Consumer-specific metrics
├── tests/
│   ├── unit/
│   │   └── handlers.test.ts
│   └── integration/
│       └── consumer.test.ts
├── slos/
│   └── slos.yaml             # Processing success rate SLOs
├── ...
```

**Worker-Specific Metrics**:
```typescript
// src/metrics.ts
export const messagesProcessedTotal = new Counter({
  name: 'messages_processed_total',
  help: 'Total messages processed',
  labelNames: ['handler', 'status'],
  registers: [registry],
});

export const messageProcessingDuration = new Histogram({
  name: 'message_processing_duration_seconds',
  help: 'Message processing duration',
  labelNames: ['handler'],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60],
  registers: [registry],
});

export const consumerLag = new Gauge({
  name: 'consumer_lag_messages',
  help: 'Consumer lag in messages',
  labelNames: ['partition'],
  registers: [registry],
});
```

---

### 2.3 Batch Job Template

**Command**: `companyos create batch-job --name <name> --schedule "<cron>"`

**Generated Structure**:
```
pipelines/<name>/
├── src/
│   ├── __main__.py           # Entry point
│   ├── config.py             # Pydantic settings
│   ├── job.py                # Main job logic
│   ├── extract.py            # Data extraction
│   ├── transform.py          # Transformation
│   └── load.py               # Data loading
├── tests/
│   └── test_job.py
├── k8s/
│   └── cronjob.yaml          # Kubernetes CronJob manifest
├── slos/
│   └── slos.yaml
├── Dockerfile
├── pyproject.toml
├── requirements.txt
└── README.md
```

**CronJob Template**:
```yaml
# k8s/cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: {{JOB_NAME}}
spec:
  schedule: "{{SCHEDULE}}"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      backoffLimit: 2
      activeDeadlineSeconds: 3600
      template:
        spec:
          serviceAccountName: {{JOB_NAME}}
          restartPolicy: OnFailure
          containers:
            - name: job
              image: {{IMAGE}}
              resources:
                requests:
                  memory: "256Mi"
                  cpu: "100m"
                limits:
                  memory: "1Gi"
                  cpu: "500m"
              envFrom:
                - secretRef:
                    name: {{JOB_NAME}}-secrets
```

---

### 2.4 Data Service Template

**Command**: `companyos create data-service --name <name> --database <pg|neo4j|redis>`

**Generated Structure**:
```
services/<name>/
├── src/
│   ├── index.ts
│   ├── app.ts
│   ├── config.ts
│   ├── db/
│   │   ├── client.ts         # Database client setup
│   │   ├── migrations/       # Migration files
│   │   └── seed.ts           # Development seed data
│   ├── repositories/         # Data access layer
│   │   └── index.ts
│   └── services/             # Business logic
│       └── index.ts
├── tests/
│   ├── unit/
│   └── integration/
│       └── db.test.ts        # Database integration tests
├── migrations/
│   └── .gitkeep
├── prisma/                   # If PostgreSQL
│   └── schema.prisma
├── ...
```

**Database Health Check**:
```typescript
// src/routes/health.ts
router.get('/health/ready', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});
```

---

### 2.5 Frontend Application Template

**Command**: `companyos create frontend --name <name> --framework <next|vite>`

**Generated Structure (Next.js)**:
```
apps/<name>/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── api/
│   │       └── health/
│   │           └── route.ts
│   ├── components/
│   │   └── ui/               # Shared UI components
│   ├── hooks/
│   ├── lib/
│   │   ├── api.ts            # API client
│   │   └── auth.ts           # Auth utilities
│   └── styles/
│       └── globals.css
├── tests/
│   ├── unit/
│   └── e2e/
│       └── smoke.spec.ts
├── public/
├── slos/
│   └── slos.yaml             # Core Web Vitals SLOs
├── Dockerfile
├── next.config.js
├── tailwind.config.js
├── package.json
├── tsconfig.json
└── README.md
```

**Frontend SLOs**:
```yaml
# slos/slos.yaml
slos:
  - name: "core-web-vitals-lcp"
    objective: 75.0  # 75% of users < 2.5s
    description: "Largest Contentful Paint"
    sli:
      type: distribution
      metric: web_vitals_lcp_seconds
      threshold: 2.5
  - name: "core-web-vitals-fid"
    objective: 75.0
    description: "First Input Delay"
    sli:
      type: distribution
      metric: web_vitals_fid_milliseconds
      threshold: 100
```

---

### 2.6 Shared Library Template

**Command**: `companyos create library --name <name>`

**Generated Structure**:
```
packages/<name>/
├── src/
│   ├── index.ts              # Public exports
│   └── types.ts              # TypeScript interfaces
├── tests/
│   └── index.test.ts
├── package.json
├── tsconfig.json
├── jest.config.js
├── .eslintrc.json
├── README.md
└── CHANGELOG.md
```

**Package.json Template**:
```json
{
  "name": "@companyos/{{LIBRARY_NAME}}",
  "version": "0.0.0",
  "description": "{{DESCRIPTION}}",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc -b",
    "test": "jest",
    "lint": "eslint src tests",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.3"
  }
}
```

---

### 2.7 Data Pipeline Template

**Command**: `companyos create pipeline --name <name>`

**Generated Structure**:
```
pipelines/<name>/
├── src/
│   ├── __main__.py
│   ├── config.py             # Pydantic settings
│   ├── pipeline.py           # Pipeline orchestration
│   ├── extract.py
│   ├── transform.py
│   └── load.py
├── contracts/
│   ├── input.avsc            # Input schema
│   └── output.avsc           # Output schema
├── tests/
│   ├── conftest.py
│   ├── test_extract.py
│   ├── test_transform.py
│   └── test_load.py
├── slos/
│   └── slos.yaml
├── Dockerfile
├── pyproject.toml
├── requirements.txt
├── requirements-dev.txt
└── README.md
```

---

## 3. Automatic Inclusions

Every scaffold automatically includes the following without opt-in:

### 3.1 Testing Infrastructure

| Component | Implementation |
|-----------|----------------|
| Unit Tests | Jest (TS) / pytest (Python) with coverage thresholds |
| Test Fixtures | Sample data in `tests/fixtures/` |
| CI Integration | Tests run on every PR |

**Coverage Thresholds** (enforced in CI):
```javascript
// jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 80,
      statements: 80,
    },
  },
};
```

### 3.2 Linting & Formatting

| Tool | Purpose | Config |
|------|---------|--------|
| ESLint | TS/JS linting | `.eslintrc.json` with platform rules |
| Prettier | Code formatting | Shared `.prettierrc` |
| Ruff | Python linting | `pyproject.toml` |
| Black | Python formatting | `pyproject.toml` |

### 3.3 OPA/Policy Hooks

Each service includes a `policies/` directory with:

```rego
# policies/authz.rego
package {{service_name}}.authz

default allow = false

# Allow health checks without auth
allow {
  input.path == "/health"
}

allow {
  input.path == "/health/ready"
}

allow {
  input.path == "/health/live"
}

allow {
  input.path == "/metrics"
  input.source.internal == true
}

# Require valid JWT for other endpoints
allow {
  input.jwt.valid == true
  input.jwt.exp > time.now_ns() / 1000000000
}
```

### 3.4 SBOM Generation

CI automatically generates SBOM via CycloneDX:

```yaml
# Included in CI template
- name: Generate SBOM
  uses: CycloneDX/gh-node-module-generatebom@v1
  with:
    output: sbom.json

- name: Upload SBOM
  uses: actions/upload-artifact@v4
  with:
    name: sbom
    path: sbom.json
```

### 3.5 SLO Definitions

Every service includes `slos/slos.yaml` with:

- **API Services**: Availability (99.9%), Latency p99 (<500ms)
- **Workers**: Processing success (99.9%), Latency p95 (<30s)
- **Batch Jobs**: Completion rate (99%), Duration within window
- **Frontends**: Core Web Vitals (LCP, FID, CLS)

### 3.6 Observability Defaults

| Component | Default |
|-----------|---------|
| Metrics | Prometheus client with RED metrics |
| Logging | Pino (TS) / structlog (Python) JSON format |
| Tracing | OpenTelemetry SDK auto-instrumentation |
| Dashboard | Pre-built Grafana JSON in `dashboards/` |

**Standard Log Format**:
```json
{
  "level": "info",
  "time": "2024-01-15T10:30:00.000Z",
  "service": "users-api",
  "traceId": "abc123",
  "spanId": "def456",
  "msg": "Request processed",
  "method": "GET",
  "path": "/users/123",
  "status": 200,
  "duration_ms": 45
}
```

---

## 4. Template Variables

All templates support these variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{SERVICE_NAME}}` | Kebab-case service name | `users-api` |
| `{{SERVICE_TITLE}}` | Title case for display | `Users API` |
| `{{PACKAGE_NAME}}` | Full package name | `@companyos/users-api` |
| `{{PORT}}` | HTTP port | `8080` |
| `{{TEAM}}` | Owning team | `platform` |
| `{{TIER}}` | Service tier (1-3) | `2` |
| `{{DESCRIPTION}}` | Package description | `User management API` |
| `{{AUTHOR}}` | Git author | `team@company.com` |
| `{{YEAR}}` | Current year | `2024` |

---

## 5. Post-Scaffold Steps

After running `companyos create`, the CLI:

1. **Initializes Git** (if not in monorepo)
2. **Installs dependencies** via `pnpm install`
3. **Runs initial build** to verify setup
4. **Executes linting** to confirm configuration
5. **Prints next steps** checklist

```bash
✅ Created users-api in services/users-api

Next steps:
  1. cd services/users-api
  2. Review .env.example and create .env
  3. Run 'pnpm dev' to start development server
  4. Update README.md with service-specific documentation
  5. Configure team ownership in package.json
  6. Run 'pnpm test' to verify test setup

Documentation:
  - Platform Blueprint: docs/golden-path-platform/PLATFORM_BLUEPRINT.md
  - CI/CD Pipeline: docs/golden-path-platform/CICD_PIPELINE.md
  - Onboarding Checklist: docs/golden-path-platform/ONBOARDING_CHECKLIST.md
```

---

## 6. Extending Templates

### 6.1 Custom Templates

Teams can create custom templates in `.companyos/templates/`:

```
.companyos/
└── templates/
    └── ml-service/
        ├── template.yaml      # Template configuration
        └── files/             # Template files
            ├── src/
            ├── Dockerfile
            └── ...
```

### 6.2 Template Configuration

```yaml
# template.yaml
name: ml-service
description: Machine learning service with GPU support
extends: api-service
variables:
  - name: MODEL_NAME
    prompt: "Model name"
    default: "my-model"
  - name: GPU_MEMORY
    prompt: "GPU memory (GB)"
    default: "8"
hooks:
  post-create:
    - "pip install torch transformers"
```

---

## Related Documents

- [Platform Blueprint](./PLATFORM_BLUEPRINT.md)
- [CI/CD Pipeline Design](./CICD_PIPELINE.md)
- [Service Onboarding Checklist](./ONBOARDING_CHECKLIST.md)
