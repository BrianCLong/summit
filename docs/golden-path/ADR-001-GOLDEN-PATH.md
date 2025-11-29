# ADR 001: Golden Path Service Architecture

## Context
New services need a standardized foundation to ensure compliance, observability, and security.

## Decision
We define a "Golden Service" template for TypeScript/Node.js.

## Components
- **Framework**: Express 5.
- **Observability**: Prometheus (prom-client) + Pino (logging).
- **Config**: Zod schema validation.
- **CI/CD**: Reusable GitHub Workflow (`golden-service-pipeline.yml`).
- **Security**: Trivy scanning, SBOM generation.

## Consequences
- Consistent service structure.
- Reduced bootstrapping time.
- Enforced security and observability standards.
