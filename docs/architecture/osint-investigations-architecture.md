# Architecture: OSINT & Investigations Subsumption

## 1. Target Architecture Diagram (Text)

```
[ External Data Sources & APIs ]
   (Social Links, Maltego, SpiderFoot, Orpheus, Oceanir)
         |
         v
[ Tool Adapters (Generic Integration Layer) ]
   (Rate Limiting, ToS Enforcement, Serialization, Mocking)
         |
         v
[ Agent Plane (Deterministic Orchestration) ]
   (Playbook Execution, LLM Prompts, Tool Calling, Evidence Generation)
         |
         v
[ Data Plane (Graph + Provenance) ]
   (Neo4j Cluster, Entity Graph, Immutable Evidence Ledger)
         |
         v
[ Experience Plane (Investigation Workspace) ]
   (Graph/Table/Map Views, Case Boards, Report Export, Policy-Aware Redaction)
```

## 2. Repo Path Map
* `subsumption/osint-investigations/manifest.yaml`
* `docs/architecture/osint-investigations-architecture.md`
* `docs/governance/osint-investigations-threat-model.md`
* `docs/product/osint-investigations-strategy.md`
* `docs/ops/osint-investigations.md`
* `evals/agir/benchmark.md`
* `services/evidence/`
* `tools/evidence_cli/`
* `services/toolsdk/`
* `services/connectors/spiderfoot/`
* `ui/casework/`
* `services/reporting/export_pdf/`
* `services/interops/maltego/`
* `services/connectors/sociallinks/`
* `services/connectors/orpheus/`
* `services/agents/playbooks/`
* `services/connectors/oceanir/`

## 3. Data Model
* **Entities:** `Person`, `Account`, `Organization`, `Asset`, `Wallet`, `Location`
* **Artifacts:** `Document`, `Post`, `Message`, `Image`, `Video`, `Audio`
* **Claims:** Assertions about entities/artifacts (e.g., location uncertainty bounds)
* **Findings:** Derived analytic objects from agents
* **Edges:** `OBSERVED_IN`, `ASSERTS`, `DERIVED_FROM`, `ALIAS_OF`, `CONTROLS`, `OWNED_BY`, `LOCATED_AT`, `MENTIONS`, `TRANSACTS_WITH`, `RELATED_TO`
* **Provenance Envelope (every node/edge):**
    * `source_system` (spiderfoot/sociallinks/orpheus/oceanir/manual)
    * `collection_method` (api/export/manual)
    * `timestamp_utc`
    * `retention_policy_id`
    * `legal_basis_tag`
    * `confidence` (0.0 - 1.0)
    * `evidence_id` (e.g., `SUM-EV1::osint::...`)

## 4. Agent Runtime Determinism Strategy
* **Record/Replay:** All external tool calls are serialized and recorded. Replays use these recordings to guarantee identical inputs to the graph and report generation steps.
* **Tool Adapters:** Enforce strict request/response schemas, handle retries deterministically, and attach provenance metadata *before* the data reaches the agent or the graph.

## 5. PR Stack Breakdown
* **PR-1: Evidence framework + CI gate (foundation)** (`services/evidence/`, `tools/evidence_cli/`)
* **PR-2: Tool Adapter SDK (generic integration layer)** (`services/toolsdk/`)
* **PR-3: SpiderFoot subsumption via adapter** (`services/connectors/spiderfoot/`)
* **PR-4: Crimewall/Maltego UX parity layer** (`ui/casework/`)
* **PR-5: Maltego interoperability (import/export)** (`services/interops/maltego/`)
* **PR-6: Social Links integration (feature-flagged)** (`services/connectors/sociallinks/`)
* **PR-7: Orpheus ingestion + insurer workflow playbook** (`services/connectors/orpheus/`)
* **PR-8: Oceanir tool integration (media claim verification)** (`services/connectors/oceanir/`)

## 6. GA Gates
* [x] Deterministic evidence artifacts for every shipped playbook path (`report.json`, `metrics.json`, `stamp.json`).
* [x] CI gates: evidence schema validation + replay hash stability.
* [x] Security review: threat model + pen-test plan + secrets handling.
* [x] Residency/tenancy controls verified with automated tests.
* [x] License compliance: SPDX headers, attribution file.
* [x] Operator runbooks + disaster recovery drills.
* [x] Abuse-prevention controls for OSINT connectors.

## 7. Evidence ID Pattern
* `SUM-EV1::<domain>::<scenario>::<dataset>::<configHash8>::<runIndex3>`
* Example: `SUM-EV1::osint::spiderfoot_ingest::fixture_v1::a1b2c3d4::000`
