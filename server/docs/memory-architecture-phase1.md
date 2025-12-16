# GAM-Inspired Memory Architecture – Phase 1 Foundation

This document captures the foundational storage work for the dual-agent memory layer. It defines the tables, constraints, and repository interfaces added in Phase 1 so future phases can layer the Memorizer and Researcher services on top.

## Domain entities

- **memory_sessions** – tenant-scoped conversation or task containers with project/environment metadata and policy tags.
- **memory_pages** – ordered, lossless interaction pages belonging to a session. Each page captures decorated raw content, optional memo, actor metadata, provenance IDs, and an optional pgvector embedding for hybrid retrieval.
- **memory_events** – fine-grained structured events that hang off pages for provenance, timeline reconstruction, and graph linking.

## Storage highlights

- Explicit tenant scoping on every table plus indices to keep isolation checks cheap.
- Pgvector support (vector(1536) with IVFFlat index) for embedding similarity over pages.
- Strict ordering via `(session_id, sequence)` and `(page_id, sequence)` unique constraints to avoid duplicate inserts on retries.
- Metadata, classification, and policy tag columns to align with governance and ABAC hooks planned for Phase 4.

## Repository APIs

All repository calls require a tenant ID to avoid cross-tenant leakage by default.

- `createSession(input)` / `getSessionById(id, tenantId)` / `listSessionsForTenant(tenantId, opts)` / `archiveSession(id, tenantId)`
- `createPage(input)` / `listPagesForSession(sessionId, tenantId, opts)` / `getPageById(id, tenantId)`
- `createEvent(input)` / `listEventsForPage(pageId, tenantId, opts)` / `getEventById(id, tenantId)`

Embeddings are normalized through `toPgVector`, returning a pgvector literal string or `null` to keep inserts idempotent. Each write funnels through the pooled `pg` client so observability and tenant scoping remain consistent with the rest of Summit.

## Next steps

- Phase 2 will layer the Memorizer service on these repositories, emitting IntelGraph edges for every page/event and wiring ingestion hooks into Maestro/LLMRouter.
- Phase 3 will build the Researcher planner that blends graph traversals with embeddings/BM25 and returns a compiled context plus an evidence bundle.
