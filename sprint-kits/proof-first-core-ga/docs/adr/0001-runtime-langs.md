# ADR 0001: Runtime Languages

## Context

We evaluated service and UI stack options to balance reliability, hiring pool, and tooling maturity.

## Decision

Adopt Go for backend services (prov-ledger, er-service, cost-guard) and TypeScript for gateway/UI layers (GraphQL API, query copilot, tri-pane web app).

## Status

Accepted.

## Consequences

- Shared linting and testing pipelines for Go and TypeScript enable unified CI/CD.
- Requires Go and Node toolchains in development containers and CI runners.
- Encourages consistent telemetry instrumentation using OTEL libraries available in both ecosystems.
