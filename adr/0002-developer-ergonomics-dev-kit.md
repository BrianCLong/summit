# 0002-developer-ergonomics-dev-kit

## Status

Accepted

## Context

New engineers reported multi-day setup time, inconsistent local stacks, and missing guardrails that caused CI flakes. We need a paved-road environment that standardizes API, worker, UI, database, policy, and observability services while providing seeded data and fast smoke tests.

## Decision

We deliver the Golden Path DevKit:

- Devcontainer + Docker Compose profile running API, worker, UI, Postgres, Redis, Neo4j, OPA, OTEL collector, Prometheus, Grafana, and mock integrations with hot reload volumes.
- Fixture datasets defined in `server/db/fixtures/local-dev.json` with repeatable seed scripts (`npm run devkit:seed`).
- Make targets and npm scripts to boot (`make dev` / `npm run devkit:stack`), reseed, and teardown the stack.
- 60-second smoke suite guarded by a signed pre-push hook plus cosign provenance verification in CI.
- Documentation, dashboards, synthetics, and evidence to align with onboarding and reliability SLOs.

## Consequences

- Time-to-first-commit drops under one day because the entire stack is reproducible and seeded automatically.
- Local smoke checks and cosign verification catch drift before CI, reducing flake below 1%.
- Additional Docker services add resource requirements, so nightly parity checks and cached images must stay active to avoid drift.
