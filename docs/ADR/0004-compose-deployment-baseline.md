# ADR 0004: Docker Compose as the default deployment and verification topology

- Status: Accepted
- Date: 2025-12-29
- Scope: Local, CI, and baseline deployment

## Context

The repository defines docker-compose stacks for core services (API, web, worker, PostgreSQL, Redis, Neo4j, OPA, observability) and optional profiles for AI/Kafka pipelines. CI workflows and onboarding instructions rely on Compose to validate the "golden path" before any higher-order orchestration (e.g., Kubernetes).【F:ARCHITECTURE_MAP.generated.yaml†L40-L440】【F:ARCHITECTURE_MAP.generated.yaml†L720-L740】

## Decision

- Treat Docker Compose files as the authoritative source for service wiring, environment defaults, and golden-path smoke tests.
- Keep optional AI and Kafka services behind profiles to prevent unexpected dependencies for standard developers and CI runs.
- Maintain Kubernetes overlays in `kubernetes/` but ensure parity by deriving configs from the Compose definitions where possible.

## Consequences

- Configuration drift between Compose and Kubernetes must be actively managed; Compose changes should trigger parity checks.
- Any new service intended for core workflows must be added to Compose and validated by CI smoke tests before Kubernetes promotion.
- Documentation and runbooks should reference Compose commands as the starting point for reproduction and debugging.
