# Summit v4.1.15 Canonical Architecture Reference

## 0) Purpose

Summit is an **agentic AI OSINT platform** that turns raw real-time data into connected intelligence via autonomous pipelines, backed by an **evidence-first provenance/audit ledger**.

## I) System philosophy + end-to-end flow (strict order)

1.  **Ingestion (Switchboard):** consume external inputs; normalize; deduplicate; route (webhooks + batch e.g., CSV/S3).
2.  **Contextualization (IntelGraph + Data Layer):** map inputs to entities/relationships/evidence; persist across **Neo4j + Postgres + Redis**.
3.  **Orchestration (Maestro Conductor):** evaluate live graph state; trigger **job DAGs**; enforce policy; retries; SLO tracking.
4.  **Synthesis (GraphRAG):** vector retrieval + entity extraction + **multi-hop graph traversal**; produce explainable outputs.
5.  **Audit (Provenance Ledger):** record state changes + evidence links for compliance + explainability.

## II) Functional engines (“brains”) — define each with role + IO

*   **Switchboard (`services/ingest`):** High-throughput ingest gateway; routing; dedup; supports streaming + batch.
    *   **Inputs:** CSV, JSON, S3, Postgres (Workstream 69), Webhooks.
    *   **Outputs:** Normalized events to Redis Streams.
    *   **State Writes:** Redis (event buffer), Postgres (metadata).
*   **IntelGraph (`packages/intelgraph`, `server/`):** Graph data model + source of truth for entities, relationships, evidence, provenance; enables link analysis.
    *   **Inputs:** Normalized entities/relationships from Switchboard/Maestro.
    *   **Outputs:** Graph query results (Cypher), Entity resolution.
    *   **State Writes:** Neo4j (graph), Postgres (relational attributes).
*   **Maestro Conductor (`maestro/`):** Workflow orchestrator; policy enforcement; retries; SLOs; **graph-state-driven scheduling** via DAGs.
    *   **Inputs:** Runs, Artifacts, Policy definitions.
    *   **Outputs:** Job execution status, Release gates, Compliance manifests.
    *   **State Writes:** Postgres (run history), Redis (job queues).
*   **GraphRAG pipeline (`services/graphrag`):** Retrieval system combining vector similarity + graph traversal for high-fidelity synthesis.
    *   **Inputs:** User queries, Entity context.
    *   **Outputs:** Synthesized answers, Evidence citations.
    *   **State Writes:** Neo4j (vector index interactions - *Needs verification*), Qdrant (vectors - *Needs verification*).
*   **Provenance Ledger (`services/prov-ledger`):** Append-only audit trail for evidence-first outputs.
    *   **Inputs:** Claims, Evidence, Authority IDs.
    *   **Outputs:** Merkle roots, Provenance chains, Verification reports.
    *   **State Writes:** Postgres (ledger), Redis (cache).

## III) Multi-agent ecosystem (operators/clients)

*   **Jules (likely `services/agents/src/reviewer.ts`):** Code analyzer + PR reviewer.
*   **Codex (likely `services/agents/src/planner.ts`):** Task brief generator; converts goals → actionable instructions.
*   **Observer (likely `services/agents/src/detection/`):** Telemetry/monitoring + system health (AnomalyDetectionService).
*   **Agent steering:** Conventions/directories for constraints and context: **.agent-guidance, .agentic-prompts, .cursor/rules**.

## IV) Repository directory + connection map (high level)

**Core infrastructure:**
*   `maestro/`: Orchestration logic & API.
*   `services/ingest/`: Switchboard ingestion services.
*   `server/` & `packages/intelgraph`: IntelGraph core & API.
*   `services/api-gateway`: API surface (GraphQL/REST).

**Data & storage:**
*   Neo4j (Docker): Graph persistence.
*   Postgres (Docker): Relational persistence.
*   Redis (Docker): Cache & Message Broker.
*   Qdrant: *Needs verification* (referenced in docs, not in root docker-compose).

**Agentic intelligence:**
*   `services/agents/`: Autonomous agents (Jules, Codex, Observer implementations).
*   `packages/agents/`: *Needs verification* (referenced in workspace but missing in file list).

**Knowledge & logic:**
*   `services/companyos-*/`: Business logic services.
*   `packages/intelgraph/`: Domain models.

**DevOps/CI/CD:**
*   `.github/`: Actions & Workflows.
*   `docker/`: Container definitions.
*   `k8s/`: Kubernetes manifests (Argo, KEDA).

**Testing/quality:**
*   `tests/`: Integration/E2E tests.
*   `packages/*/test`: Unit tests.

## V) Specialized modules (tier + verify)

*   **Active / Core:**
    *   `summit_misinfo/`: Python-based scoring and signals library (`ead.py`, `scoring.py`).
*   **Experimental / Prototype:**
    *   `summit-cog-war/`: "SummitCogWar" initiative; Manifesto and early-stage roadmap for cognitive warfare (Red CogSwarm, Blue MindShield).
*   **Needs Verification:**
    *   `adversarial-misinfo-defense-platform` (Not found).
    *   `active-measures-module` (Not found).
    *   `cognitive-targeting-engine` (Likely `services/digital-twin-cognition` or `packages/psyops-module`).

## VI) Technical specs (agent-relevant)

*   **Languages:** TypeScript dominant (Verified), Python (Specialized modules/Data Science).
*   **Package manager:** pnpm (Verified in `package.json`).
*   **Runtime:** Node.js 18+ (Verified `engines` in `package.json`).
*   **Data stores:** Neo4j 5.x, Postgres 16, Redis 7 (Verified in `docker-compose.yml`).
*   **Security posture:** Helmet.js; strict CORS allowlist; SQL injection prevention (Verified dependencies in `package.json`).

## VII) What to verify next

1.  **Qdrant Integration:** Confirm if Qdrant is deployed via K8s or external service, as it's missing from root `docker-compose.yml`.
2.  **Agent Identity Mapping:** Definitively confirm "Jules" maps to `services/agents/src/reviewer.ts` via code inspection (current mapping is inferred from filenames).
3.  **Missing Modules:** Locate `adversarial-misinfo-defense-platform` and `active-measures-module` or confirm they are renamed/deprecated.
4.  **`packages/agents` existence:** `pnpm-workspace.yaml` references `agents/*` but the directory was not found in the root listing (only `services/agents`).
5.  **GraphRAG State Writes:** Confirm if GraphRAG writes vectors to Neo4j directly or relies on a separate vector store (Qdrant/Pgvector).
6.  **"Summit v4.1.15" Tag:** Confirm if the current HEAD corresponds exactly to v4.1.15 (Root `package.json` says 4.1.15, `services/agents` says 4.2.3).
7.  **Maestro DAG Definitions:** Locate the actual DAG definition files to understand the job topologies.
8.  **Observer Integration:** Verify how `services/agents/src/detection` connects to the `maestro` orchestration (e.g., does it trigger DAGs?).
9.  **Cognitive Targeting Engine:** Confirm if `services/digital-twin-cognition` is the implementation of this module.
10. **AuthZ Layer:** Verify `services/authz-gateway` or `policy-lac` roles in the "Ingestion" flow (implied but not explicit in top-level flow).
