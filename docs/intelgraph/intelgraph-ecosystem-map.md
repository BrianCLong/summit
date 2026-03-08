# IntelGraph Ecosystem Map (Summit / Maestro)

## 1. IntelGraph as the Core Substrate

IntelGraph is the multi-tenant, time-aware, evidence-first graph intelligence layer underpinning Summit and Maestro.

### Core Responsibilities

| Capability            | What It Means in Practice                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| Canonical schema      | `Actor`, `Asset`, `Incident`, `Risk`, `Control`, `Policy`, `Model`, `Dataset`, `Task`, `Plan`, `Artifact` |
| Multi-tenant          | Every core entity carries `tenantId` (logical sharding)                                                   |
| Evidence-first        | Claims are paired with `Evidence` objects and explicit provenance records                                 |
| Time-aware            | `validFrom` / `validTo` support temporal reasoning                                                        |
| Governance embedded   | Policies, roles, permissions, ABAC, and audit lineage are first-class                                     |
| Graph-native planning | CKPs (Compiled Knowledge Plans) act as reusable execution plans                                           |

IntelGraph is simultaneously:

- The truth layer.
- The governance registry.
- The agent memory substrate.
- The audit and receipt engine.

## 2. Canonical Architecture Layout (Repo-Tightened)

### API Surface

- GraphQL: `src/api/graphql/...`
- REST ingestion: `src/api/rest/...`
- Package surface: `apps/intelgraph-api`

Federation-ready schema domains include:

- Tenants
- Policies
- Assets
- Artifacts
- Provenance
- Risk / Control

### Service Layer

- `server/src/services/IntelGraphService.ts`

Responsibilities:

- Zod-validated DTOs
- Neo4j driver orchestration
- Provenance ledger recording
- Prometheus metrics
- Decision and evidence writes

This service is the controlled gateway into the graph substrate.

### Infra and Deployment

- Helm charts: `charts/intelgraph-api`, `charts/intelgraph`, `charts/intelgraph-maestro`
- GitHub governance automation: `.github/workflows/ci-*.yml`, `.github/workflows/_reusable-*.yml`, `.github/MILESTONES/`, `.github/policies/`
- Dashboards: `deploy/grafana/intelgraph-*.json`
- Airflow: `airflow/dags/intelgraph_pipeline.py`

## 3. Platform Threading

### Summit Core

- Writes entities, claims, and evidence.
- Reads via GraphQL / DSL.
- Exposes GraphRAG surfaces under `src/graphrag/`.

### Maestro Conductor

- Uses IntelGraph for GA provenance and disclosure outputs.
- Treats IntelGraph as canonical run ledger for agent receipts and decision traceability.

### Pattern Mining and Analytics

- Targets a reusable set of provenance-aware graph pattern templates (20+ planned).
- Produces shareable CKPs for repeatable analytic workflows.

### Switchboard / CompanyOS

- Emits evidence via `/api/v1/ingest/companyos-decision`.
- Uses non-blocking sink semantics into IntelGraph to preserve runtime resilience.

### Analyst UX (Jupyter)

- Surface: `apps/jupyterkit`
- Pattern: `%intelgraph nl "query"`
- Current state: mock NL→Cypher with a clear extension path to policy-gated translation.

## 4. Governance and Security Posture

### Strengths

- OPA-backed ABAC
- CI scanning (CodeQL + Trivy)
- Prometheus + OpenTelemetry coverage
- Provenance ledger abstraction
- Module integrity gate with large legacy catalog coverage
- Multi-tenant enforcement baked into schema contracts

### Known Gaps

| Area              | Issue                                                                 |
| ----------------- | --------------------------------------------------------------------- |
| Secrets           | `.env` appears in repo history / working trees and requires hardening |
| Ledger durability | In-memory ledger paths still present                                  |
| Lockfiles         | Mixed `pnpm` + `npm` lockfiles increase drift risk                    |
| Dev passwords     | Docker defaults remain in local compose configs                       |

### Integrity Gate Model

The integrity gate follows a ratchet model: block new violations while cataloging and burning down legacy issues.

## 5. Maturity Assessment

| Axis                      | Status                 |
| ------------------------- | ---------------------- |
| Graph core                | Strong                 |
| Governance modeling       | Strong                 |
| Orchestration integration | In progress            |
| Durable provenance        | Mid-flight             |
| Secrets hygiene           | Needs tightening       |
| Deployment maturity       | Production-aspiring    |
| External packaging        | Emerging (skill packs) |

## 6. Strategic Positioning

IntelGraph is not merely a graph database wrapper. It is:

- A governance-native OSINT substrate
- A decision provenance ledger
- A multi-agent memory layer
- A policy-enforced graph runtime
- A pattern execution platform (CKP + miner templates)

Strategic leverage comes from collapsing agent actions, decisions, model evaluations, risk scores, and policy enforcement into a single evidence-backed, time-semantic graph substrate.

## 7. GA-Readiness Gap Matrix (Actionable Next Step)

| Workstream                | Current State              | Gap                                                          | Priority | Suggested Evidence Artifact                                        |
| ------------------------- | -------------------------- | ------------------------------------------------------------ | -------- | ------------------------------------------------------------------ |
| Contract surface mapping  | Partially documented       | Missing complete GraphQL + REST machine-readable inventory   | High     | `docs/intelgraph/contract-map-v1.md` + generated endpoint manifest |
| Durable provenance ledger | Partially abstracted       | In-memory paths and limited export/signing guarantees        | High     | Ledger durability ADR + signing/verification test outputs          |
| CKP portfolio             | Early template strategy    | No canonical high-value OSINT pack set                       | Medium   | CKP catalog with test fixtures and replay evidence                 |
| GA hardening alignment    | Controls exist             | Milestone-to-control-to-test traceability not fully explicit | High     | GA hardening matrix linked to `.github/MILESTONES/`                |
| NL→Cypher policy gating   | Prototype in notebook flow | Missing hardened translation service + guardrails            | Medium   | Threat model + policy tests + deterministic query checks           |

## 8. Final Position

The repository is already structured to support these upgrades without major structural refactors. The immediate path is to harden durability, standardize contract evidence, and close policy-gated execution gaps while preserving the governed, evidence-first architecture.
