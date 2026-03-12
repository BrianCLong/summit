# Summit Intelligence OS - Architecture

> **Canonical Reference**: See [Summit System Architecture](./SUMMIT_SYSTEM_ARCHITECTURE.md) for the comprehensive system-level view.

## Parity Kernel + Proof Moat

Summit is built on the thesis of "coverage + actionability + trust" with an evidence-first wedge, operating as a GA-ready, audit-grade Intelligence OS. It combines graph-first identity resolution, continuous diffs, case workflows, and deterministic signed evidence bundles.

## Core Components (Service Boundaries)

* **Module Runtime (`services/runtime/`)**: Executes modules in a sandboxed environment (container/WASM) with strict, policy-controlled egress.
* **Scheduler (`services/scheduler/`)**: Handles cron jobs, triggers continuous monitoring, and orchestrates run snapshots.
* **Ingest & Capture Proxy (`services/capture/`)**: Intercepts and records all outbound HTTP/DNS traffic through a policy layer, storing raw responses for offline replay and provenance.
* **Graph Store (`services/graph/`)**: Manages the entity graph, maintaining provenance edges and confidence scores. It handles entity merging across different runs.
* **Evidence Store (`services/evidence/`)**: A content-addressed storage system (S3/MinIO/local FS) for managing deterministic evidence bundles and their cryptographic signatures.
* **Scoring & Correlation (`services/rules/`, `services/scoring/`)**: Implements user-editable rules (YAML/JSON) and explainable scoring pipelines.
* **Cases & Workflow (`services/cases/`)**: Manages case folders, investigative tasks, notes, hypotheses, and required approvals.
* **Integrations Hub (`services/integrations/`)**: Connects to SIEM, SOAR, EDR, IAM, and VM ticketing systems. It supports outbound risk list dissemination and inbound data enrichment.

## Dependency Graph

1. `scheduler` triggers `runtime`
2. `runtime` makes external requests via the `capture` proxy, which stores raw artifacts in `evidence`
3. `runtime` outputs findings to the `graph` and `rules/scoring` engines
4. The `rules/scoring` engines generate final findings and store them in `evidence`
5. `cases` reference both `graph` entities and `evidence` bundles
6. `integrations` subscribes to findings/risk lists and pushes actionable intelligence to external tools

## Determinism & Multi-Tenancy

* **Tenant Isolation**: Graph and evidence storage are isolated by tenant namespaces. Cryptographic signatures use per-tenant keys.
* **Residency**: The evidence store and graph are pinned to specific geographic regions. Integrations enforce strict egress policies.
* **Determinism**: Replay mode executes pipelines with external network access disabled, using only captured artifacts. CI enforces strict hash-stability for all outputs.
