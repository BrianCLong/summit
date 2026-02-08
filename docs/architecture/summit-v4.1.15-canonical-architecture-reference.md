# Summit v4.1.15 Canonical Architecture Reference (Developer Agents + Systems Architects)

> **Summit Readiness Assertion referenced**: The platform’s readiness posture, ingestion integrity, orchestration guarantees, and governance invariants are defined in the Summit Readiness Assertion and treated as binding authority for this reference.【F:docs/SUMMIT_READINESS_ASSERTION.md†L1-L47】

## 0) Purpose

Summit is an **agentic AI OSINT platform** built around **knowledge graphs + GraphRAG + real-time ingestion + multi-agent orchestration**, delivered as a modular system with a GraphQL/REST API layer and a local-first quickstart (Docker Compose).【F:docs/executive/2026-01-31-summit-platform-briefing.md†L10-L37】

**Version scope**: Summit **v4.1.15** — **Deferred pending authoritative release record** (no authoritative version record located in repo sources referenced below).

---

## I) System philosophy + end-to-end flow (strict order)

1. **Ingestion (Switchboard):** consume external inputs (CSV, S3, REST APIs, webhooks); normalize; route into the platform’s ingestion/data pipelines.【F:docs/executive/2026-01-31-summit-platform-briefing.md†L24-L37】
   - Normalization pipeline example (geo-temporal): `CSV/JSON/GPX → Parser → Normalizer → H3 Indexer → PostgreSQL + Manifest`.【F:docs/ingest_normalize.md†L1-L23】
   - Deduplication logic: **Deferred pending dedup policy/source reference**.
2. **Contextualization (IntelGraph + Data Layer):** map inputs to entities/relationships/evidence and persist into the graph and relational stores; IntelGraph is the semantic backbone for entities/relationships and system state/history.【F:docs/architecture/phase1-intelgraph.md†L1-L24】
3. **Orchestration (Maestro Conductor):** create tasks, dispatch to runners, emit events, and enforce governance policies before execution; pipeline runs persist state in Postgres and sync evidence/claims to IntelGraph (Neo4j).【F:docs/architecture/phase1-maestro.md†L1-L22】【F:docs/MAESTRO_GUIDE.md†L14-L48】
4. **Synthesis (GraphRAG):** graph-first retrieval with multi-hop traversal plus optional vector augmentation, assembling deterministic context with Evidence IDs for explainability.【F:docs/architecture/graph-rag-reference.md†L1-L46】
5. **Audit (Provenance Ledger):** append-only evidence and claim chains with verifiable disclosure bundles and Merkle-root signatures; Kafka events emitted for downstream consumers.【F:docs/architecture/prov-ledger.md†L1-L53】

---

## II) Functional engines (“brains”) — role + IO

### 1) IntelGraph
- **Role:** Semantic backbone storing entities/relationships for unified system state and history.【F:docs/architecture/phase1-intelgraph.md†L1-L7】
- **Inputs:** Task/events metadata, evidence/claims (from Maestro and other producers).【F:docs/MAESTRO_GUIDE.md†L21-L38】【F:docs/architecture/phase1-maestro.md†L20-L22】
- **Outputs:** Traversable graph context for retrieval/analysis; graph nodes for runs/evidence/claims.【F:docs/MAESTRO_GUIDE.md†L21-L48】
- **State Writes:** Neo4j graph nodes (`Run`, `Evidence`, `Claim`).【F:docs/MAESTRO_GUIDE.md†L21-L48】
- **Failure modes:** Graph sync failure, missing evidence links — **Deferred pending runtime/error contract**.
- **Retries/Idempotency:** Governed by upstream orchestration idempotency and run semantics — **Deferred pending orchestration contract**.

### 2) Maestro Conductor
- **Role:** Central orchestration engine that manages task lifecycle, dispatches to runners, and enforces governance checks before execution.【F:docs/architecture/phase1-maestro.md†L1-L27】
- **Inputs:** Task creation requests with risk category; pipeline execution requests with `idempotency_key`.【F:docs/architecture/phase1-maestro.md†L8-L22】【F:docs/MAESTRO_GUIDE.md†L6-L19】
- **Outputs:** Task lifecycle events (`TASK_CREATED`, `TASK_STARTED`, etc.), evidence + claims linked to runs.【F:docs/architecture/phase1-maestro.md†L20-L22】【F:docs/MAESTRO_GUIDE.md†L21-L38】
- **State Writes:** Postgres `runs` table; `evidence_ledger` hashed into Merkle tree; Neo4j sync of `Run`, `Evidence`, `Claim` nodes.【F:docs/MAESTRO_GUIDE.md†L21-L48】
- **Failure modes:** Runner dispatch failures; governance blocks transitions — **Deferred pending operational SLOs/error taxonomy**.
- **Retries/Idempotency:** `idempotency_key` supports exactly-once initiation semantics for critical runs.【F:docs/MAESTRO_GUIDE.md†L6-L19】

### 3) Switchboard
- **Role:** Local-first, zero-trust command center unifying agents, signals, and collaborators with multimodal co-pilot; connects to Maestro/agents and data backends.【F:docs/modules/switchboard-blueprint.md†L1-L57】
- **Inputs:** Human/operator actions, agent signals, real-time status bus events, external integrations — **Deferred pending runtime wiring references**.
- **Outputs:** Command routing to orchestration layer, collaboration events, policy-aware UI actions — **Deferred pending runtime wiring references**.
- **State Writes:** Local cache (SQLite/Parquet) and edge services; data backends include Neo4j/Postgres/Elastic/ClickHouse in the blueprint diagram.【F:docs/modules/switchboard-blueprint.md†L33-L55】
- **Failure modes:** Network/edge connectivity loss; policy-denied actions — **Deferred pending resilience runbook**.
- **Retries/Idempotency:** Client/edge retry semantics — **Deferred pending client retry spec**.

### 4) GraphRAG pipeline
- **Role:** Graph-first retrieval that performs multi-hop traversal over Neo4j, optional vector augmentation, and deterministic context assembly with Evidence IDs.【F:docs/architecture/graph-rag-reference.md†L8-L46】
- **Inputs:** User queries → planner → graph retriever + Cypher traversal; optional vector store enrichment.【F:docs/architecture/graph-rag-reference.md†L21-L46】
- **Outputs:** Response with citations tied to Evidence IDs; execution traces with Cypher paths for explainability.【F:docs/architecture/graph-rag-reference.md†L45-L61】
- **State Writes:** Retrieval traces and evidence paths (recorded for audit) — **Deferred pending trace schema**.
- **Failure modes:** Non-deterministic retrieval, missing evidence IDs — **Deferred pending retrieval contract**.
- **Retries/Idempotency:** Retrieval retry policy — **Deferred pending retry contract**.

### 5) Provenance Ledger
- **Role:** Immutable evidence and claim chains, disclosure bundles with Merkle-root signatures, tenant isolation, and event emission to Kafka.【F:docs/architecture/prov-ledger.md†L1-L53】
- **Inputs:** Evidence registration, claim creation, disclosure bundle requests.【F:docs/architecture/prov-ledger.md†L43-L53】
- **Outputs:** Evidence IDs, claim records, disclosure manifests, Kafka events (`claim.created`, `disclosure.created`).【F:docs/architecture/prov-ledger.md†L20-L33】
- **State Writes:** Postgres (primary), Redis (cache), Kafka (events).【F:docs/architecture/prov-ledger.md†L15-L33】
- **Failure modes:** Storage write failure; signature/manifest verification error — **Deferred pending runbook/error taxonomy**.
- **Retries/Idempotency:** API-level idempotency — **Deferred pending API contract**.

---

## III) Multi-agent ecosystem (operators/clients)

- **Jules (Release Captain):** Architecture/strategy/release-gate authority with full repo access and merge authority.【F:AGENTS.md†L39-L48】
- **Codex (Engineer):** Implementation/testing/documentation role with code commit + test execution permissions.【F:AGENTS.md†L49-L56】
- **Aegis (Guardian):** Policy evaluation and risk scoring with block/deny authority and audit logging.【F:AGENTS.md†L57-L62】
- **Observer:** Telemetry/monitoring + system health — **Deferred pending role definition** (no explicit observer role definition located).

**Agent steering / context directories (present in repo):**
- `.agent-guidance/` (agent review + verification guidance).【F:.agent-guidance/agentic-review-checklist.md†L1-L8】
- `.agentic-prompts/` (prompt libraries + governance).【F:.agentic-prompts/README.md†L1-L12】
- `.cursor/rules/` (editor rulesets for GraphQL/TS/React/testing).【F:.cursor/rules/project.mdc†L1-L12】

---

## IV) Repository directory + connection map (high level)

Mapped to documented repository structure (see `docs/REPOSITORY_STRUCTURE.md`).【F:docs/REPOSITORY_STRUCTURE.md†L1-L86】

**Core infrastructure**
- `server/` (GraphQL API), `api/` (REST services), `gateway/`, `services/` — API surface and orchestration touchpoints.【F:docs/REPOSITORY_STRUCTURE.md†L21-L60】

**Data & storage**
- `graph-service/` (Neo4j interface), `db/` + `migrations/` (DB config/migrations).【F:docs/REPOSITORY_STRUCTURE.md†L45-L52】

**Agentic intelligence**
- `ml/`, `copilot/`, `ai-ml-suite/`, `cognitive-insights/`, `nlp-service/` — AI/ML components and cognitive analysis engines.【F:docs/REPOSITORY_STRUCTURE.md†L33-L44】

**Knowledge & logic**
- `connectors/`, `data-pipelines/`, `streaming/`, `analytics/` — ingestion and processing surfaces that feed contextualization.【F:docs/REPOSITORY_STRUCTURE.md†L54-L60】

**DevOps/CI/CD**
- `k8s/`, `helm/`, `terraform/`, `deploy/`, `.github/` — deployment automation and workflows.【F:docs/REPOSITORY_STRUCTURE.md†L62-L70】

**Testing/quality**
- `tests/`, `e2e/`, `benchmarks/` — test suites and performance validation.【F:docs/REPOSITORY_STRUCTURE.md†L76-L82】

---

## V) Specialized modules (tier + verify)

> **Triage rule:** Classify only when evidence is found in README/entrypoints/tests/CI wiring.

| Module | Tier | Evidence | Notes |
| --- | --- | --- | --- |
| `adversarial-misinfo-defense-platform/` | Needs-triage | None located | Deferred pending triage |
| `active-measures-module/` | Needs-triage | None located | Deferred pending triage |
| `cognitive-targeting-engine/` | Needs-triage | None located | Deferred pending triage |
| `cognitive_nlp_engine/` | Needs-triage | None located | Deferred pending triage |
| `cognitive_insights_engine/` | Needs-triage | None located | Deferred pending triage |
| `auto_scientist/` | Needs-triage | None located | Deferred pending triage |
| `antigravity/` | Needs-triage | None located | Deferred pending triage |
| `agentic_web_visibility/` | Needs-triage | None located | Deferred pending triage |

**Triage Playbook** (apply in order):
1. **README/Docs**: confirm purpose, owner, and run instructions.
2. **Entrypoints**: locate main binary/service (`package.json`, `main`, `Dockerfile`, `cmd/`, `src/index`).
3. **Imports/Dependencies**: verify if referenced by core services (`server/`, `gateway/`, `services/`).
4. **CI Coverage**: check workflows/tests for module inclusion.
5. **Deployment Wiring**: inspect `docker-compose*`, `k8s/`, `helm/` for runtime references.
6. **Ownership**: confirm `CODEOWNERS` or module-specific ownership — **Deferred pending ownership map**.

---

## VI) Technical specs (agent-relevant)

- **Languages:** TypeScript-heavy with JavaScript + Python also present — **Deferred pending authoritative stats**.【F:docs/executive/2026-01-31-summit-platform-briefing.md†L64-L70】
- **Package manager:** pnpm — **Deferred pending authoritative tooling manifest**.【F:docs/executive/2026-01-31-summit-platform-briefing.md†L64-L70】
- **Runtime:** Node.js 18+ — **Deferred pending authoritative runtime manifest**.【F:docs/executive/2026-01-31-summit-platform-briefing.md†L64-L70】
- **Data stores:** Neo4j, Postgres, Redis, Qdrant — **Deferred pending authoritative data-layer manifest**.【F:docs/executive/2026-01-31-summit-platform-briefing.md†L34-L36】【F:docs/executive/2026-01-31-summit-platform-briefing.md†L64-L70】
- **Security posture:** Helmet, CORS allowlist, rate limiting, request validation — **Deferred pending security baseline record**.【F:docs/executive/2026-01-31-summit-platform-briefing.md†L46-L60】
- **Operations:** Refer to `RUNBOOKS/` and `SECURITY/` for procedures and compliance requirements — **Deferred pending operations baseline**.

---

## VII) MAESTRO Security Alignment (required)

- **MAESTRO Layers:** Foundation Models, Data Operations, Agents, Tools, Infrastructure, Observability, Security & Compliance.【F:docs/security/threat-modeling-framework.md†L16-L38】
- **Threats Considered:** Prompt injection, data poisoning, tool abuse, goal hijacking, policy bypass, audit gaps.【F:docs/security/threat-modeling-framework.md†L74-L118】
- **Mitigations:** Input/output validation, guardrails, least privilege, continuous monitoring, auditability with immutable logs.【F:docs/security/threat-modeling-framework.md†L39-L68】

---

## VIII) What to verify next (top 10 unknowns)

1. **v4.1.15 release artifacts** and authoritative release notes — Deferred pending authoritative release record.
2. **Switchboard ingest routing/dedup** integration points — Deferred pending ingestion wiring reference.
3. **IntelGraph storage backend(s)** beyond Neo4j (if any) — Deferred pending storage manifest.
4. **GraphRAG vector store implementation** (Qdrant vs alternatives) — Deferred pending vector store decision record.
5. **Provenance Ledger production status** vs proposed architecture — Deferred pending production status record.【F:docs/architecture/prov-ledger.md†L1-L33】
6. **Maestro Conductor retry policies** and failure-handling contracts — Deferred pending orchestration runbook.
7. **Evidence ledger schema** (`evidence_ledger`) and Merkle tree implementation details — Deferred pending schema reference.【F:docs/MAESTRO_GUIDE.md†L21-L38】
8. **Policy enforcement surfaces** (gateway vs service-level) and ABAC rule sources — Deferred pending policy enforcement record.【F:docs/executive/2026-01-31-summit-platform-briefing.md†L46-L60】
9. **Observability hooks** for orchestration + GraphRAG pipelines — Deferred pending observability baseline.
10. **Module ownership/DRIs** for specialized modules list — Deferred pending ownership roster.
