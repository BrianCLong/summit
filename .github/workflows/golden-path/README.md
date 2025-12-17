# Golden Path Platform - Reusable CI/CD Workflows

This directory contains reusable GitHub Actions workflows that implement the Golden Path CI/CD pipeline.

## Available Workflows

| Workflow | Description |
|----------|-------------|
| `_golden-path-pipeline.yml` | Main orchestrator workflow |
| `_lint.yml` | Linting and code quality checks |
| `_test.yml` | Unit and integration tests |
| `_security.yml` | Security scanning (SAST, secrets, CVE) |
| `_build.yml` | Container build with signing |
| `_deploy.yml` | Kubernetes deployment |
| `_verify.yml` | Post-deploy verification |
| `_promote.yml` | Progressive rollout |

## Usage

Services should call the main pipeline workflow:

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  pipeline:
    uses: ./.github/workflows/_golden-path-pipeline.yml
    with:
      service: my-service
      working-directory: services/my-service
    secrets: inherit
```

## Configuration

See [CI/CD Pipeline Design](../../docs/golden-path-platform/CICD_PIPELINE.md) for full documentation.
