# ADR 0001: GraphQL API is the primary platform boundary

- Status: Accepted
- Date: 2025-12-29
- Scope: Summit / IntelGraph runtime services

## Context

The platform exposes intelligence analysis capabilities through a single GraphQL endpoint backed by Apollo Server and Express. The API hosts WebSocket subscriptions, initializes telemetry, enforces auth context, and orchestrates downstream dependencies (Neo4j, PostgreSQL, Redis, Socket.IO). It also serves the built web client in production deployments, making it the user-facing entry point and integration surface.【F:server/src/index.ts†L1-L160】【F:ARCHITECTURE_MAP.generated.yaml†L40-L115】

## Decision

- Retain the GraphQL API as the canonical boundary for user and automation traffic (queries, mutations, subscriptions, REST fallbacks).
- Keep WebSocket subscriptions and Socket.IO presence within the same process to reuse auth context and backpressure controls.
- Continue serving production web assets from the API unless a CDN front-end is explicitly provisioned.
- Instrument the API with OpenTelemetry/Prometheus by default to preserve SLO observability.【F:ARCHITECTURE_MAP.generated.yaml†L62-L78】

## Consequences

- API availability directly affects both web and automation users; HA deployment and traffic shaping are mandatory.
- Tight coupling of UI asset serving to the API simplifies deployment but binds UI availability to API uptime.
- Centralized telemetry from the API remains the primary signal for incident detection and performance regression tracking.
