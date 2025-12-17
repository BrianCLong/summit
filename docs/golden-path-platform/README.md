# Golden Path Platform

> Making the right thing the easy thing for CompanyOS service development.

## Overview

The Golden Path Platform provides a paved-road approach for building, deploying, and operating services within CompanyOS. By providing opinionated templates, standardized CI/CD pipelines, and policy-as-code governance, we enable teams to ship faster while maintaining security and reliability standards.

## Quick Start

```bash
# Install the scaffold CLI
pnpm --filter @companyos/scaffold-cli build

# Create a new API service
pnpm dlx @companyos/scaffold create api-service --name my-service

# Validate against Golden Path requirements
pnpm dlx @companyos/scaffold validate my-service

# Check your development environment
pnpm dlx @companyos/scaffold doctor
```

## Documentation

| Document | Description |
|----------|-------------|
| [Platform Blueprint](./PLATFORM_BLUEPRINT.md) | Service types, tech stack, directory structures |
| [Scaffolding Templates](./SCAFFOLDING_TEMPLATES.md) | Template specifications and CLI usage |
| [CI/CD Pipeline](./CICD_PIPELINE.md) | Pipeline stages, policy gates, rollback strategies |
| [C4 Architecture](./C4_ARCHITECTURE.md) | System context, containers, and data flow |
| [Onboarding Checklist](./ONBOARDING_CHECKLIST.md) | Requirements for Golden Path Ready status |
| [ADR-0014](./ADR-0014-golden-path-platform.md) | Architecture decision record |

## Service Types

| Type | Description | Example |
|------|-------------|---------|
| **API Service** | Synchronous REST/GraphQL endpoints | User API, Gateway |
| **Worker** | Async message/event consumers | Notification handler |
| **Batch Job** | Scheduled data processing | ETL pipeline |
| **Data Service** | Database access layer | Graph data service |
| **Frontend** | SPAs and micro-frontends | Console UI |
| **Library** | Shared packages | Auth utilities |

## Pipeline Stages

```
Lint → Test → Security → Build → Publish → Deploy → Verify → Promote → Monitor
```

All stages include automatic policy enforcement:
- Secret detection blocks merge
- Critical CVEs block deployment
- Unsigned images rejected
- SLO violations trigger rollback

## Directory Structure

```
service-name/
├── src/                  # Source code
├── tests/                # Unit and integration tests
├── slos/                 # SLO definitions
├── dashboards/           # Grafana dashboards
├── policies/             # OPA authorization policies
├── Dockerfile            # Multi-stage container build
├── package.json          # Dependencies and scripts
└── README.md             # Service documentation
```

## Governance

- **OPA Policies**: ABAC, deployment gates, error budget protection
- **Kyverno**: Kubernetes admission control (image signing, pod security)
- **Audit Ledger**: Immutable deployment and policy decision records

## Getting Help

- **Slack**: `#golden-path-platform`
- **Documentation**: This directory
- **Office Hours**: Tuesdays 2-3pm PT

## Contributing

See the main [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines on contributing to the Golden Path Platform.
