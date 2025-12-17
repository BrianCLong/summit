# @companyos/scaffold-cli

Golden Path Platform scaffolding CLI for CompanyOS services.

## Installation

```bash
# Build the CLI
pnpm --filter @companyos/scaffold-cli build

# Or run directly via pnpm
pnpm dlx @companyos/scaffold-cli <command>
```

## Commands

### `companyos create`

Create a new service from a Golden Path template.

```bash
# Interactive mode
companyos create

# Direct creation
companyos create api-service --name users-api --port 8080
companyos create worker --name notifications-worker
companyos create batch-job --name daily-report --schedule "0 6 * * *"
companyos create data-service --name graph-data --database neo4j
companyos create frontend --name console-ui --framework next
companyos create library --name auth-utils
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `-n, --name <name>` | Service name (kebab-case) | Required |
| `-d, --description <desc>` | Service description | Auto-generated |
| `-t, --team <team>` | Owning team | Prompted |
| `--tier <tier>` | Service tier (1-3) | 2 |
| `-p, --port <port>` | HTTP port | 8080 |
| `--dry-run` | Preview without creating | false |

### `companyos validate`

Validate a service against Golden Path requirements.

```bash
companyos validate my-service
companyos validate ./services/my-service --verbose
```

**Checks performed:**

- Directory structure (src/, tests/, slos/, etc.)
- Configuration files (package.json, tsconfig.json)
- Health endpoints (/health, /health/ready, /health/live)
- Observability (metrics, SLOs, dashboards)
- Security (OPA policies, Dockerfile best practices)
- CI/CD configuration

### `companyos doctor`

Check development environment for Golden Path requirements.

```bash
companyos doctor
```

**Checks performed:**

- Node.js version (>= 18)
- pnpm version (>= 8)
- Docker installation and daemon status
- Git configuration
- Workspace configuration (pnpm-workspace.yaml, turbo.json)

## Generated Files

When creating an API service, the following files are generated:

```
services/my-service/
├── .github/
│   └── workflows/
│       └── ci.yml              # CI workflow using Golden Path pipeline
├── src/
│   ├── index.ts                # Entry point with graceful shutdown
│   ├── app.ts                  # Express application setup
│   ├── config.ts               # Zod-validated configuration
│   ├── logger.ts               # Pino structured logging
│   ├── metrics.ts              # Prometheus metrics
│   └── routes/
│       └── health.ts           # Health check endpoints
├── tests/
│   └── unit/
│       └── app.test.ts         # Initial test suite
├── slos/
│   └── slos.yaml               # SLO definitions
├── dashboards/
│   └── (grafana.json)          # Grafana dashboard (optional)
├── policies/
│   └── authz.rego              # OPA authorization policy
├── Dockerfile                  # Multi-stage production build
├── docker-compose.yml          # Local development
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript configuration
├── jest.config.js              # Test configuration
├── .eslintrc.json              # Linting configuration
├── .env.example                # Environment template
└── README.md                   # Service documentation
```

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev create api-service --name test-service --dry-run

# Build
pnpm build

# Test
pnpm test

# Lint
pnpm lint
```

## Related Documentation

- [Platform Blueprint](../../docs/golden-path-platform/PLATFORM_BLUEPRINT.md)
- [Scaffolding Templates](../../docs/golden-path-platform/SCAFFOLDING_TEMPLATES.md)
- [CI/CD Pipeline](../../docs/golden-path-platform/CICD_PIPELINE.md)
- [Onboarding Checklist](../../docs/golden-path-platform/ONBOARDING_CHECKLIST.md)
