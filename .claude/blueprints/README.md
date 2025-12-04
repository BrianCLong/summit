# Claude Code Blueprints

> **Purpose**: Monorepo scaffolding templates for prompt implementations, aligned with Summit/IntelGraph conventions.

## Overview

This directory provides production-ready templates for services, CI/CD pipelines, deployment manifests, and test fixtures. Each prompt in the library can leverage these blueprints to auto-wire deliverables into the Summit platform.

## Directory Structure

```
.claude/blueprints/
├── README.md                    # This file
├── templates/
│   ├── service/                 # Service boilerplate
│   │   ├── package.json.template
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   ├── tests/
│   │   └── Dockerfile
│   ├── ci/                      # GitHub Actions workflows
│   │   ├── service-ci.yml
│   │   ├── package-ci.yml
│   │   └── security.yml
│   ├── helm/                    # Kubernetes Helm charts
│   │   ├── Chart.yaml.template
│   │   ├── values.yaml.template
│   │   └── templates/
│   └── terraform/               # Infrastructure as Code
│       ├── main.tf.template
│       ├── variables.tf
│       └── outputs.tf
└── fixtures/
    └── golden-tests/            # Canonical test data
        ├── dq-scenarios.json
        ├── migration-datasets/
        └── policy-test-cases.yml
```

## Using Blueprints

### 1. Scaffold New Service from Prompt

```bash
# Example: Implement DQ-001 prompt
claude-scaffold \
  --prompt DQ-001 \
  --service-name dq-dashboard \
  --output services/dq-dashboard

# Generated structure:
# services/dq-dashboard/
# ├── package.json (from template, customized)
# ├── tsconfig.json
# ├── src/
# │   ├── index.ts
# │   ├── metrics/
# │   └── api/
# ├── tests/
# ├── Dockerfile
# ├── .github/workflows/dq-dashboard-ci.yml
# ├── helm/
# └── terraform/
```

### 2. Manual Scaffolding

Copy templates and customize:

```bash
cp -r .claude/blueprints/templates/service services/my-service
cd services/my-service

# Replace placeholders
sed -i 's/{{SERVICE_NAME}}/my-service/g' package.json
sed -i 's/{{DESCRIPTION}}/My service description/g' package.json
```

## Template Variables

All templates support variable substitution:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{SERVICE_NAME}}` | Service name (kebab-case) | `dq-dashboard` |
| `{{SERVICE_TITLE}}` | Human-readable title | `Data Quality Dashboard` |
| `{{DESCRIPTION}}` | Service description | `DQ monitoring and alerts` |
| `{{PORT}}` | Service port | `8090` |
| `{{AUTHOR}}` | Author/team | `Engineering Team` |
| `{{PROMETHEUS_ENABLED}}` | Enable Prometheus | `true` |
| `{{DB_REQUIRED}}` | Requires database | `true` |

## Templates

### Service Template

Provides:
- **package.json**: pnpm workspace-compatible, with Summit conventions
- **tsconfig.json**: TypeScript config extending base
- **src/**: Minimal entrypoint and structure
- **tests/**: Jest configuration
- **Dockerfile**: Multi-stage build optimized for layer caching
- **README.md**: Service documentation template

### CI Template

Provides:
- **service-ci.yml**: Full CI pipeline (lint, test, build, deploy)
- **package-ci.yml**: Package-specific CI
- **security.yml**: Security scanning (CodeQL, Trivy, Gitleaks)

Features:
- pnpm caching
- Turbo caching
- Docker layer caching
- Playwright/E2E tests
- SBOM generation
- Slack notifications

### Helm Template

Provides:
- **Chart.yaml**: Helm chart metadata
- **values.yaml**: Default values (customizable per environment)
- **templates/**:
  - `deployment.yaml`: Kubernetes Deployment
  - `service.yaml`: Kubernetes Service
  - `ingress.yaml`: Ingress configuration
  - `configmap.yaml`: Environment configuration
  - `secret.yaml`: Sensitive configuration
  - `servicemonitor.yaml`: Prometheus monitoring

### Terraform Template

Provides:
- **main.tf**: Primary resources
- **variables.tf**: Input variables
- **outputs.tf**: Exported values
- **providers.tf**: Cloud provider configuration

Supports:
- AWS (ECS, RDS, S3, etc.)
- Azure (AKS, PostgreSQL, Blob Storage)
- GCP (GKE, Cloud SQL, GCS)

## Golden Test Fixtures

### Purpose

Canonical test data shared across services to ensure consistency and enable integration testing.

### Fixtures

#### `dq-scenarios.json`
Data quality test scenarios for DQ-001 prompt:
```json
{
  "scenarios": [
    {
      "name": "High completeness dataset",
      "dataset_id": "test-001",
      "records": 1000,
      "completeness": 0.95,
      "consistency": 0.90,
      "timeliness": 0.88
    }
  ]
}
```

#### `migration-datasets/`
Legacy data exports for MIG-001 prompt:
- CSV exports
- JSON exports
- STIX bundles
- MISP events

#### `policy-test-cases.yml`
Policy simulation test cases for GOV-001 prompt:
```yaml
test_cases:
  - name: "Admin can access all entities"
    user:
      roles: [admin]
      clearance: "TOP_SECRET"
    query: "MATCH (e:Entity) RETURN e LIMIT 10"
    expected_allowed: true
```

## Acceptance Packs

Each prompt should include an acceptance pack:

```
services/dq-dashboard/
└── acceptance/
    ├── acceptance.yml         # Acceptance criteria as code
    ├── fixtures/              # Test data
    ├── expected/              # Expected outputs
    └── scripts/
        ├── run-acceptance.sh  # Execute all checks
        └── verify.sh          # Verification script
```

**acceptance.yml** format:
```yaml
service: dq-dashboard
version: 1.0.0

prerequisites:
  - postgres_running: true
  - prometheus_running: true

scenarios:
  - name: "DQ metrics computed"
    steps:
      - run: "curl http://localhost:8090/metrics"
        expect:
          status: 200
          contains: "dq_completeness"

  - name: "Alert fires on anomaly"
    steps:
      - run: "inject-anomaly.sh"
      - wait: 10s
      - run: "check-alerts.sh"
        expect:
          exit_code: 0
```

## Best Practices

### Service Development

1. **Follow CLAUDE.md conventions**: Use pnpm, TypeScript, ESM modules
2. **Include health checks**: `/health`, `/health/ready`, `/health/live`
3. **Export metrics**: Prometheus `/metrics` endpoint
4. **Structured logging**: Use Winston or Pino with JSON format
5. **Graceful shutdown**: Handle SIGTERM/SIGINT

### Testing

1. **Unit tests**: >80% coverage (Jest)
2. **Integration tests**: Test with real dependencies (Docker Compose)
3. **Contract tests**: Verify API contracts stable
4. **E2E tests**: Playwright for UI flows

### Deployment

1. **Multi-stage Dockerfile**: Build, test, runtime stages
2. **Health probes**: Liveness and readiness probes configured
3. **Resource limits**: CPU/memory limits in Helm
4. **Auto-scaling**: HPA configuration for high-traffic services
5. **Secrets management**: Use Kubernetes secrets, not hardcoded values

### Security

1. **No secrets in code**: Use environment variables
2. **Least privilege**: Minimal IAM permissions
3. **Network policies**: Restrict pod-to-pod communication
4. **Image scanning**: Trivy in CI
5. **Dependency scanning**: pnpm audit + Dependabot

## Customization

### Extending Templates

Create service-specific overrides:

```
services/my-service/
├── package.json (extends template)
├── custom-config.yml
└── deploy/
    ├── helm/ (overrides blueprint)
    └── terraform/ (overrides blueprint)
```

### Adding New Templates

1. Create template in `.claude/blueprints/templates/<type>/`
2. Document variables and usage
3. Add to this README
4. Include example usage in prompt

## Maintenance

- **Owner**: Engineering Team
- **Review Cadence**: Quarterly or as needed
- **Update Triggers**:
  - New platform capabilities
  - Changed deployment patterns
  - Security/compliance updates

## Version History

- **2025-11-29**: Initial blueprint system creation

## Related Documentation

- [Prompt Library README](../prompts/README.md)
- [METADATA_SCHEMA.md](../prompts/METADATA_SCHEMA.md)
- [CLAUDE.md](/home/user/summit/CLAUDE.md)

---

**Remember**: Blueprints accelerate development while enforcing consistency! 🚀
