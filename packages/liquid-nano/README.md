# @summit/liquid-nano

Liquid Nano is a strict-mode TypeScript runtime designed for pilot deployments on edge hardware. The package includes the runtime core, sample applications, deployment tooling, monitoring assets, and extensive documentation to accelerate production readiness.

## Features

- Plugin-based runtime with diagnostics and metrics
- Sample HTTP ingestion application with persistence hooks
- Dockerfile, Docker Compose stack, and Kubernetes manifests
- Grafana dashboards, Prometheus rules, and Alertmanager routes
- Security hardening checklist and troubleshooting guides
- Jest test suite with integration coverage >80%

## Scripts

```bash
npm run --workspace @summit/liquid-nano build         # Compile TypeScript to dist/
npm run --workspace @summit/liquid-nano test:coverage # Run unit + integration tests
npm run --workspace @summit/liquid-nano lint          # ESLint validation
npm run --workspace @summit/liquid-nano typecheck     # Strict TS checks
```

## Pilot Deployment

1. Build and publish the Docker image: `deploy/scripts/publish.sh ghcr.io/<org>/liquid-nano:pilot`
2. Apply Kubernetes manifests from `deploy/kubernetes/`
3. Import Grafana dashboard JSON and Prometheus alert rules under `monitoring/`

Refer to the docs bundle (`docs/README.md`) for detailed architecture, deployment, monitoring, and troubleshooting guidance.
