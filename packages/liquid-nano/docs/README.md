# Liquid Nano Pilot Bundle

The Liquid Nano pilot bundles a strict-mode TypeScript runtime, deployment artifacts, and operational guides for executing nano-service workloads at the network edge. This documentation explains the architectural primitives, provides deployment walkthroughs, and links to monitoring and troubleshooting resources that support the pilot rollout.

## Contents

- [Architecture](./architecture.md)
- [Deployment Guide](./deployment.md)
- [Monitoring Playbook](./monitoring.md)
- [Troubleshooting Guide](./troubleshooting.md)
- [Security Hardening](./security.md)
- [Performance Benchmarks](./performance.md)
- [Testing Strategy](./testing.md)

## Quick Start

1. Install dependencies and build the package:
   ```bash
   npm install
   npm run --workspace @summit/liquid-nano build
   ```
2. Execute the HTTP bridge demo:
   ```bash
   node examples/edge/http-bridge-demo.mjs
   ```
3. Inspect coverage and linting:
   ```bash
   npm run --workspace @summit/liquid-nano test:coverage
   npm run --workspace @summit/liquid-nano lint
   ```

## Pilot Goals

- Validate Liquid Nano runtime execution semantics.
- Prove deployment automation via Docker and Kubernetes manifests.
- Instrument baseline telemetry dashboards.
- Deliver >80% automated test coverage with integration and e2e validation.
- Establish security guardrails and troubleshooting playbooks for field teams.

## Directory Map

```
packages/liquid-nano/
├── config/                # Configuration templates for runtime + observability
├── deploy/                # Dockerfiles, compose stacks, and Kubernetes manifests
├── docs/                  # Operational documentation bundle
├── examples/              # Executable demos showcasing runtime usage
├── monitoring/            # Prometheus rules and Grafana dashboards
├── scripts/               # Utilities for deployment, benchmarking, and tests
├── src/                   # Strict-mode TypeScript runtime implementation
└── __tests__/             # Unit, integration, and e2e tests run via Jest
```

The pilot bundle is intentionally comprehensive so platform, SRE, and security stakeholders can collaborate on a production-ready rollout with minimal additional scaffolding.
