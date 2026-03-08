# Subsumption Plan: OSINT Investigations

## Objective
To outline the strategy for subsuming adjacent OSINT investigation platforms and tools (Social Links, Maltego, ShadowDragon, SpiderFoot, Orpheus Cyber, Oceanir, Graphistry, Recorded Future, Palantir).

## Target Architecture
Summit's target architecture consists of three planes:
1. **Data Plane (graph + provenance):** Unified entity graph for OSINT, telemetry, and case artifacts. Every edge/node stores provenance.
2. **Agent Plane (deterministic orchestration):** Agents execute governed playbooks compiled to deterministic steps (tool calls, graph mutations).
3. **Experience Plane (investigation workspace):** Graph/Table/Map/Timeline views, case collaboration, and policy-aware report export.

## Data Model
- **Entities:** `Person`, `Account`, `Organization`, `Asset`, `Wallet`, `Location`
- **Artifacts:** `Document`, `Post`, `Message`, `Image`, `Video`, `Audio`
- **Claims:** Assertions about entities/artifacts
- **Findings:** Derived analytic objects
- **Edges:** `OBSERVED_IN`, `ASSERTS`, `DERIVED_FROM`, `ALIAS_OF`, `CONTROLS`, `OWNED_BY`, `LOCATED_AT`, `MENTIONS`, `TRANSACTS_WITH`, `RELATED_TO`
- **Provenance:** `source_system`, `collection_method`, `timestamp_utc`, `retention_policy_id`, `legal_basis_tag`, `confidence`, `evidence_id`

## Agent Runtime Determinism Strategy
- **Record/Replay:** All tool calls are recorded with inputs/outputs + hashes.
- **Tool Adapters:** Generic integration layer for tools to ensure determinism and policy enforcement.

## PR Stack Breakdown
1. **PR-1: Evidence framework + CI gate (foundation)** (`services/evidence/`, `tools/evidence_cli/`)
2. **PR-2: Tool Adapter SDK (generic integration layer)** (`services/toolsdk/`)
3. **PR-3: SpiderFoot subsumption via adapter** (`services/connectors/spiderfoot/`)
4. **PR-4: Crimewall/Maltego UX parity layer** (`ui/casework/`)
5. **PR-5: Maltego interoperability (import/export)** (`services/interops/maltego/`)
6. **PR-6: Social Links integration (feature-flagged)** (`services/connectors/sociallinks/`)
7. **PR-7: Orpheus ingestion + insurer workflow playbook** (`services/connectors/orpheus/`)
8. **PR-8: Oceanir tool integration (media claim verification)** (`services/connectors/oceanir/`)

## GA Gates
- [x] Deterministic evidence artifacts for every shipped playbook path.
- [x] CI gates: evidence schema validation + replay hash stability.
- [x] Security review: threat model + pen-test plan + secrets handling.
- [x] Residency/tenancy controls verified with automated tests.
- [x] License compliance: SPDX headers, attribution file.
- [x] Operator runbooks + disaster recovery drills.
- [x] Abuse-prevention controls for OSINT connectors.
