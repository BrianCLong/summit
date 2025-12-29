# ADR 0002: Polyglot data layer with Neo4j, PostgreSQL (pgvector), and Redis

- Status: Accepted
- Date: 2025-12-29
- Scope: Data layer

## Context

Summit relies on multiple data technologies to satisfy distinct workloads: Neo4j for relationship-centric graph queries, PostgreSQL (with pgvector) for structured metadata/audit trails/embeddings, and Redis for caching, sessions, rate limiting, and BullMQ queues. All three are first-class Compose services referenced by the API and worker runtimes.【F:ARCHITECTURE_MAP.generated.yaml†L147-L199】

## Decision

- Preserve Neo4j as the system of record for graph relationships and analytics (Cypher/GDS/APOC).
- Use PostgreSQL as the authoritative store for metadata, audit logs, and vector embeddings; keep migrations under `server/db/migrations/postgres` aligned with releases.【F:ARCHITECTURE_MAP.generated.yaml†L155-L160】
- Keep Redis as the shared cache/queue layer for the API and background worker to handle sessions, rate limits, and job dispatch.【F:ARCHITECTURE_MAP.generated.yaml†L166-L182】

## Consequences

- Availability of all three stores is critical; loss of any service degrades core functionality (graph queries, metadata access, or job processing).
- Operational playbooks must cover backup/restore for Neo4j and PostgreSQL and persistence/eviction tuning for Redis.
- Data access layers in the API and worker must remain aware of cross-store consistency boundaries and retry semantics.
