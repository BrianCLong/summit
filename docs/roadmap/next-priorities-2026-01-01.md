# Next Summit Priorities (2026-01-01)

## Context snapshot

- Roadmap status shows the **immutable audit log (C2)** and **local vector store (A1)** remain incomplete while the **connector SDK & registry (B1)** is only partially delivered.
- Copilot query paths are already RC-ready, so the biggest user-visible gaps are durability (audit), retrieval quality (vector store), and data ingress breadth (connectors).
- Compliance pressure is highest around audit integrity, and GA readiness is blocked until the log is tamper-resistant and centralized.
- Retrieval wins compound across Copilot and graph analytics, meaning the vector store and ingestion pipeline unlock the most visible value quickly.
- The ingestion mesh must add an SDK and registry soon to avoid bespoke connectors that are hard to govern or upgrade.

## Promoted tasks for this cycle

### 1) Ship Immutable Audit Log (C2) — priority: critical

- **Impact:** Unblocks GA compliance; reduces incident response MTTR by making every privileged action provable.
- **Risk level:** Medium. Risks include storage schema design mistakes and ensuring append-only guarantees under failure.
- **Acceptance criteria:**
  - Append-only audit log with cryptographic chaining or tamper checks.
  - Persistence backend defined with retention and aggregation path (no console-only logging).
  - Centralized ingestion from existing audit emitters with queue/backpressure handling.
  - Basic query/export endpoint and dashboard stub for SOC/IR usage.
  - CI check or migration ensuring the audit table is created and versioned.

### 2) Stand up Local Vector Store Service (A1) — priority: high

- **Impact:** Improves Copilot and graph retrieval quality; prepares for broader RAG ingestion.
- **Risk level:** Medium. Main risks are performance regressions and storage selection churn.
- **Acceptance criteria:**
  - Dedicated vector store service module with configurable backend (start with local disk or SQLite/pgvector).
  - CRUD APIs for collections, documents, and embeddings with tests covering happy-path and error cases.
  - Background job or hook to populate the store from existing ingestion flows.
  - Observability: basic metrics for upsert/query latency and storage size.
  - Golden path updated to include vector store bootstrap if required.

### 3) Deliver Connector SDK & Registry (B1) — priority: high

- **Impact:** Enables standardized connectors, faster onboarding of new sources, and safer lifecycle management.
- **Risk level:** Medium. Risks include breaking existing CSV connector paths and over-designing the registry schema.
- **Acceptance criteria:**
  - Minimal SDK interface defining connector lifecycle (init, validate, ingest, teardown) with TypeScript typings.
  - Registry manifest structure plus loader that discovers and validates connectors.
  - Example connectors (CSV existing; stub RSS/Atom) registered through the new registry without breaking current flows.
  - Documentation for building and registering a connector, linked from the roadmap.
  - CI or lint rule that fails on unregistered connectors.
