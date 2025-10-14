---
title: "IntelGraph + Maestro Conductor — Current State, MVP‑2 & GA PRD"
version: 0.1
lastUpdated: 2025-09-30
owner: docs@intelgraph.io
status: Draft for review
---

> One platform, two personas: **IntelGraph (Analyst)** and **Maestro Conductor (Builder/Operator)**. This doc is our single source of truth for **where we are**, **what MVP‑2 delivers**, and **what GA requires** across product, engineering, security, and docs.

## 0) Executive Summary

**Bottom line:** The repo is a large, multi-service mono–repo with promising scaffolding:

- **UI:** `conductor-ui` (React + Express dev backend) with health/metrics surface.
- **APIs:** `services/api-gateway` (Apollo Server GraphQL) + `gateway/` (TypeScript stubbed gateway) + `services/api` (Express + Socket.IO skeleton).  
- **Data:** Compose stacks for **Postgres** and **Neo4j**; policy scaffolding; export stubs.
- **Security & Supply Chain:** 49+ GH workflows (CI, CodeQL, OPA/conftest, attest-sbom, auto‑rollback). 139+ `.rego` policies and Cosign verification middleware present.
- **Docs:** Many ADRs, runbooks, phase plans, acceptance checklists; strong doc‑as‑code intent, but drift and discoverability issues.

**Reality check:** Several services are **stubs or partials**; end‑to‑end happy paths are not consistently runnable. The **minimal compose** reliably brings up core data stores; UI/API paths require hardening and wiring. Testing is uneven; observability is partial.

**MVP‑2 objective:** Deliver one **crisp, demo‑ready and operable E2E**: *ingest → graph build → query/visualize → insight → export*, with **policy, audit, and provenance** enforced. Ship with a **tight Diátaxis doc set** and CI quality gates.

**GA objective:** Multi‑tenant hardened release with **SSO/RBAC**, **scaling profiles**, **HA Neo4j/Postgres**, **observability SLOs**, **SLAs**, **backups/DR**, **signed artifacts**, and **upgrade/migration tooling**.

---

## 1) Current State Assessment (as of 2025‑09‑30)

### 1.1 Repo Map (high‑value areas)

- **/conductor-ui**  
  - `frontend/` React app (CRA), `backend/` Express dev server with Cosign verification middleware; health (`/healthz`), metrics (`/metrics`), and proxied Grafana config hooks.
  - `studio-lite/` present; needs wiring notes.
- **/services** (selected):
  - `api-gateway/` — Apollo GraphQL server: schema/resolvers/middleware (policy guard) present; needs integration tests and schema contracts.
  - `api/` — Express + Socket.IO skeleton with `createApp`, `createSocketIOServer`; events for `ai:entity:{id}` and `job:{jobId}` per `/client/README.md`.
  - `agent-runtime/`, `workflow/`, `exporter/`, `graph-core/`, `docling-svc/`, `license-registry/`, `tenant-admin/`, `policy-audit/`, `prov-ledger/` — present; most need API surface and tests.
- **/gateway** — TypeScript gateway stub with mocked handlers; not production‑wired.
- **Compose & Infra**  
  - `docker-compose.minimal.yml` runs **Postgres** and **Neo4j** with healthchecks; other stacks exist (`ai`, `dev`, `gpu`, `observability`, `opa`, `mcp`). Need one curated **developer default** with documented env.
- **Security/Policy**
  - `.github/workflows/` includes CI, CodeQL, OPA/conftest, attest SBOM, auto‑rollback.
  - `conductor-ui/backend/supply-chain/cosign-verify.js` middleware for artifact verification.
  - `SECURITY/`, `.security/`, `POLICY/` trees; many `.rego` policies; require policy catalog and tests.
- **Docs**  
  - Strong presence: ADRs, runbooks, acceptance checklists, phase docs. Navigation and versioning need consolidation (Diátaxis + versioned `/docs/latest`).

### 1.2 What Works Today (evidence‑based)

- Start **databases locally** via `docker-compose.minimal.yml` (Postgres 16‑alpine, Neo4j with auth and health checks).  
- Bring up **Conductor UI (dev)** with health/metrics panels; basic fetches succeed.
- Launch **API Gateway (dev)**; GraphQL server starts; policy middleware hook points exist.
- **Realtime client contract** documented in `/client/README.md` for `realtime` and `graph-analytics` namespaces.
- **CI/Security** pipelines defined and runnable in GH Actions.

### 1.3 Gaps & Risks

- **E2E wiring:** No single compose or Make target that brings **UI + API + Graph + Policy** to a working demo path.
- **Data model drift:** Graph schema and GraphQL schema not version‑locked; no schema registry.
- **AuthN/Z:** SSO, multi‑tenant boundaries, and RBAC incomplete; policy middleware not fully enforced E2E.
- **Observability:** Metrics exist in pockets; need tracing (OTel), log correlation, dashboards, and SLOs.
- **Testing:** Sparse integration/e2e; flaky confidence for merges; no golden datasets.
- **Docs IA:** Many docs, limited *findability*; versioning and “Latest” alias absent; diagrams partially missing.
- **Release hygiene:** No crisp release playbook tying artifacts → SBOM → attestations → environment promotion gates.

---

## 2) Product Scope & Personas

- **Analyst (IntelGraph):** builds/queries entity graphs, runs analytics, reviews insights, exports.
- **Operator/Admin (Maestro Conductor):** configures sources, policies, tenants; manages runs and supply chain.
- **Security/Compliance:** audits policy, provenance, attestations.

**Primary MVP‑2 use case:** *As an Analyst, I can ingest a dataset, see entities/edges materialized in Neo4j, run centrality/community detection, view results in UI, and export filtered results — all governed by org/tenant policy with audit trail.*

---

## 3) MVP‑2 — PRD

### 3.1 Goals

1) **One‑click dev up**: `make dev` → UI + API + Graph + Policy + Observability (basic) running locally.  
2) **Ingest → Graph → Analyze → Visualize → Export** (Demo dataset):
   - Source: CSV/JSONL or sample fixtures (organizations, people, relationships).  
   - Transform: deterministic mapping → Postgres staging → Neo4j write.  
   - Analytics: Degree/PageRank + Connected Components; persisted back to graph.  
   - Visualize: simple graph view + top N insights panel.  
   - Export: JSONL/CSV with signed manifest + provenance.
3) **Governance:** Tenant header propagation; OPA policy guard on GraphQL mutations; audit log + prov‑ledger writes.
4) **Docs & Quality Gates:** Diátaxis baseline + smoke/e2e tests + SBOM/attest + release notes.

### 3.2 Non‑Goals (MVP‑2)

- HA clusters, cross‑region DR, billing, marketplace listings, full studio, advanced ML.

### 3.3 Requirements & Acceptance Criteria

**Functional**
- **Ingestion**
  - Upload or pick **`/fixtures/mvp2/seed.{csv,jsonl}`** in UI.
  - Backend validates schema, stages to Postgres; emits job events to `job:{id}`.
  - Graph loader writes nodes/edges to Neo4j with tenant scoping labels.
  - ✅ *AC‑ING‑01:* upload → job completes with `SUCCEEDED`; rows/load counts surfaced in UI.
- **Analytics**
  - Run degree, PageRank, CC via `graph-core` (or server‑side GDS) and persist scores.
  - ✅ *AC‑ANL‑01:* user sees top‑K entities by PageRank with scores and drill‑down query.
- **Visualization**
  - UI shows small interactive graph (≤5k nodes) and a table view with filters.
  - ✅ *AC‑VIS‑01:* click node → attributes+scores; filter by score > threshold.
- **Export**
  - Download CSV/JSONL, signed by Conductor; include manifest + digest + timestamp.
  - ✅ *AC‑EXP‑01:* exported files verify with `cosign verify-blob` wrapper.
- **Policy/Audit**
  - Tenant header `X-Tenant-ID` required; GraphQL mutations blocked if policy denies.
  - Audit log captured for ingest, analytics run, export; provenance event stored.
  - ✅ *AC‑POL‑01:* mutation denied when user lacks role; denial reason surfaced.

**Non‑Functional**
- **Performance:** Demo dataset (≤100k edges) processes under 3 min locally.
- **Reliability:** Retries for ingest steps; idempotent graph merges.
- **Security:** No secrets in repo; `.env.example` only; CSP tuned (remove `unsafe-*` in prod builds).
- **Observability:** Basic OTel traces across UI→API→graph; Grafana dashboard JSONs committed.
- **Docs:** “Get Started in 10 minutes” + How‑to for the E2E; Troubleshooting; Reference pages.

### 3.4 Deliverables (MVP‑2)

- **Code**
  - `services/api-gateway`: GraphQL schema for Entities/Edges + Jobs; resolvers call graph‑core and ingest.  
  - `services/graph-core`: adapters for Neo4j (GDS or Cypher) with analytics functions.
  - `services/exporter`: endpoint to stream CSV/JSONL + manifest signer.
  - `services/prov-ledger`: append‑only provenance events; simple Postgres table.
  - `conductor-ui`: pages — Ingest, Runs, Graph View, Exports; Socket.IO to show progress.
  - `make dev` + **`docker-compose.mvp2.yml`** launching UI, API gateway, Postgres, Neo4j, exporter, prov.
- **Policies**
  - OPA bundle: `policies/mvp2/` with tests; gate GraphQL mutations and export scopes.
- **Observability**
  - OTel SDK init, context propagation; dashboards for Ingest throughput, Graph write latency, Export counts.
- **Tests**
  - e2e (Playwright/Cypress) for E2E flow; contract tests for GraphQL schema.
- **Docs**
  - Diátaxis baseline (see §6): tutorials, how‑tos, reference, concepts. Diagrams (Mermaid/PlantUML).

### 3.5 Out‑of‑Scope Cleanups (keep small but important)

- Remove dead stubs in `gateway/` or clearly mark `@deprecated` with archive path.
- Normalize service naming (`api-gateway` vs `gateway/graphql-bff`).
- Pin Node 20.x, PNPM 9.x; align TS config and lint rules.

---

## 4) GA — PRD

### 4.1 Goals

- **Security & Tenancy:** SSO (OIDC/SAML), hierarchical RBAC, per‑tenant data isolation (schemas/labels), policy catalogs, audit lake.
- **Scale & HA:** HA Postgres (Patroni or managed), Neo4j Enterprise w/ cluster or Aura, horizontal scale for API, queued workers.
- **Ops:** Backups/DR, blue/green with progressive delivery, error budgets + SLOs, capacity profiles (S, M, L).
- **Supply Chain:** Reproducible builds, signed images/artifacts, SBOM+attest in release pipeline with policy gates.
- **Upgradeability:** Schema migrations with backward compatibility, versioned GraphQL, migration guides.
- **UX polish:** Studio, query builder, saved searches, annotations, role‑aware views.

### 4.2 GA Acceptance Criteria (abridged)

- **Auth:** OIDC/SAML + SCIM; SC‑improved RBAC; tenant boundary tests.
- **Data:** PITR backups; monthly DR test; anonymized sample datasets for tests.
- **Reliability:** P95 API < 300ms for read queries on medium profiles; job success >99% rolling 7d.
- **Compliance:** CIS Docker/K8s baseline; SOC2/SIEM‑friendly audit export; DPO‑friendly data handling docs.
- **Supportability:** Runbooks, on‑call rotation guides, incident templates; feature flags documented.
- **Docs:** Versioned `/docs/vX.Y/` with `/docs/latest` alias; migration notes per release.

### 4.3 GA Deliverables

- **Kubernetes Helm charts** with values for S/M/L profiles and toggles (Neo4j aura vs self‑hosted).  
- **Managed secrets** via External Secrets; OPA/Gatekeeper constraints; Kyverno optional.  
- **OTel collector** + dashboards; SLO burn‑rate alerts.  
- **Release pipeline** with attestations and environment promotion policies.

---

## 5) Architecture (MVP‑2 target)

```mermaid
flowchart LR
  subgraph UI
    CUI[Conductor UI]
  end

  subgraph API
    GQL[GraphQL API Gateway]\n(Apollo)
    EXP[Exporter]
    PROV[Provenance]
  end

  subgraph Data
    PG[(Postgres Staging)]
    N4J[(Neo4j Graph)]
  end

  subgraph Policy & Obs
    OPA[OPA Policy Guard]
    OTL[OTel Tracing]
  end

  CUI <-- Socket.IO / GraphQL --> GQL
  GQL -->|stage| PG
  GQL -->|merge| N4J
  GQL -->|analytics| N4J
  GQL --> PROV
  GQL --> OPA
  GQL --> OTL
  CUI --> EXP
  EXP --> PROV
```

**Key contracts**
- GraphQL types: `Entity`, `Edge`, `Job`, `AnalysisRun`, `Export`.
- Events: `job:{id}` (`progress`, `result`, `complete`, `error`).
- Tenancy: `X-Tenant-ID` header; label in Neo4j: `:Tenant_{id}` on nodes/edges.

---

## 6) Documentation Plan (Diátaxis)

**Get Started**
- Install & `make dev` (MVP‑2 stack).  
- First run: load sample dataset → view graph → run analytics → export.

**Tutorials**
- Build your first investigation graph.  
- Add a new data source adapter.

**How‑tos**
- Configure tenancy and policies.  
- Verify exports with Cosign.  
- Observe the pipeline with Grafana.

**Reference**
- GraphQL schema; Realtime events; REST endpoints (Exporter).  
- Config/env matrix; RBAC roles; OPA policies catalog.

**Concepts**
- Graph modeling patterns; Provenance and audit; Policy‑as‑code.

**Operations**
- Runbooks: backups, restore, DR test; on‑call cheat sheet; capacity.

**Release Notes**
- Snapshot per release; migration guides; deprecations.

**Glossary**
- Tenant, Provenance, Attestation, SBOM, SLO, GDS, etc.

---

## 7) Implementation Plan & Milestones

**Week 0 (now)**  
- Choose MVP‑2 slice; freeze scope; create `docker-compose.mvp2.yml`; pin toolchain versions; repo hygiene (deprecated archives).

**Week 1**  
- Ingest path (UI upload → stage in Postgres → merge in Neo4j) with progress events; write audit/prov events.

**Week 2**  
- Analytics (PageRank/CC) + persistence; Graph view; export service with signed manifest; OPA guard on mutations.

**Week 3**  
- Observability (OTel baseline) + dashboards; e2e tests; harden CSP; doc set complete.

**Exit (MVP‑2)**  
- Demo script; one‑click dev up; acceptance checklist green.

---

## 8) Concrete Tasks (tracked items)

- [ ] **Compose**: `deploy/compose/docker-compose.mvp2.yml` with UI, API gateway, Postgres, Neo4j, exporter, prov.
- [ ] **Make**: `make dev` → `compose.mvp2` + seeding; `make test-e2e`.
- [ ] **API**: GraphQL schema + resolvers for Entities/Edges/Jobs; policy guard.
- [ ] **Graph**: `services/graph-core` Neo4j adapter; analytics funcs; tests.
- [ ] **Exporter**: Streamer + manifest signer; CLI verify docs.
- [ ] **Prov**: Postgres table + append API; write on ingest/analysis/export.
- [ ] **UI**: Ingest page, Runs page, Graph view, Exports; Socket.IO progress.
- [ ] **Observability**: OTel SDK wiring; collector config; dashboards JSON.
- [ ] **Policies**: `policies/mvp2/` + conftest; CI gate.
- [ ] **Docs**: Diátaxis sections + diagrams; glossary; release notes.

---

## 9) Quality Gates & Definition of Done

- CI green: lint, typecheck, unit + integration + e2e; CodeQL; conftest policy tests; SBOM + attest.
- Docs updated: page(s), examples, diagrams, cross‑links, changelog; pass markdown/vale/a11y linters.
- Security: image signing, CSP hardened; no secrets in repo.
- Observability: dashboards load; traces propagate across services.

---

## 10) Open Questions / Risks

- Neo4j Community vs Enterprise/GDS features; licensing choices for GA.
- Multi‑tenant enforcement strategy: label‑based vs separate DB per tenant.
- Policy placement: sidecar vs in‑process vs API gateway plugin.
- Export data handling for PII — redaction policies.

---

## 11) Appendix — File Pointers (for reviewers)

- **Compose:** `docker-compose.minimal.yml` (baseline); add `deploy/compose/docker-compose.mvp2.yml`.
- **UI (dev):** `/conductor-ui` — `backend/server.js`, `src/App.js`.
- **API:** `/services/api-gateway` — `src/index.ts`, `schema`, `middleware/policy`.
- **Realtime contract:** `/client/README.md`.
- **Security/Policy:** `.github/workflows/*`, `.rego` policies, `supply-chain/cosign-verify.js`.
- **Docs:** `/docs/ADR/*`, `RUNBOOKS/*`, `docs_phase_*`, `docs/CONDUCTOR_ACCEPTANCE_CHECKLIST.md`.

---

> **Next steps:** Accept/annotate this PRD, then I’ll open structured issues/PRs per task list with owners, labels, and checklists aligned to this doc.

