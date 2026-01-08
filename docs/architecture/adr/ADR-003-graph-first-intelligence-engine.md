# ADR-003: Graph-first intelligence engine

- Status: Accepted
- Date: 2025-12-06
- Deciders: Architecture Guild
- Contributors: Graph Engineering, Data Science
- Tags: graph, analytics, inference

## Context

IntelGraph centers on entity-centric intelligence, joining streaming signals with historical context. Traditional request/response workflows make it difficult to capture provenance, reason over relationships, and drive agentic workflows. The platform already maintains graph storage (Neo4j/PG hybrid) and graph-aware services (query copilots, provenance ledger, investigators) that need a shared architecture model.

## Decision

Anchor the platform on a graph-first intelligence engine: treat entities and relationships as the primary interface, with services producing and consuming graph events. Core services (query copilots, provenance ledger, enrichment workers, orchestrators) publish graph mutations and derive insights from the same knowledge base. API and UI layers expose graph-native operations (paths, influence, timelines) instead of bespoke, service-specific schemas.

## Consequences

- Cohesive reasoning: agents and users operate on a unified knowledge graph, improving explainability and traceability.
- Extensibility: new domains integrate by emitting graph events and declaring relationship types, reducing schema sprawl.
- Performance considerations: graph workloads require tuned storage, indexing, and caching strategies; batch jobs and streaming ingestion need back-pressure controls.

## Options Considered

- Option A: Service-specific relational schemas (rejected: siloed context and duplicated lineage handling).
- Option B: Document-first persistence with ad-hoc joins (rejected: brittle and hard to audit).
- Option C: Graph-first engine with evented services (chosen).
