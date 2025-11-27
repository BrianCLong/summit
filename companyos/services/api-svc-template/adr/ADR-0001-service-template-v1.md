# ADR-0001: API Service Template v1

## Status
Accepted

## Context
CompanyOS teams need a consistent baseline for new API services that matches Summit CI/CD patterns, observability defaults, and security expectations. Previous ad-hoc scaffolds drifted in structure, making it harder to onboard new contributors and apply shared policies.

## Decision
Adopt a standard `api-svc-template` layout that ships with:
- Express entrypoint with health route and Prometheus metrics endpoint.
- OpenTelemetry-aware request logging with Pino.
- OPA authorization helper for customer read operations.
- pnpm-based workflow with Makefile, Dockerfile, and GitHub Actions CI aligned to the Summit defaults.
- Config profiles for default/dev/prod plus .env example for local use.
- Smoke script and Vitest coverage for the health endpoint.

## Consequences
- New services start from the same baseline, reducing drift and setup time.
- CI and container build pipelines are defined on day one, enabling SBOM and signing jobs.
- Teams can extend the template with additional routes while keeping health/metrics stable for platform tooling.
