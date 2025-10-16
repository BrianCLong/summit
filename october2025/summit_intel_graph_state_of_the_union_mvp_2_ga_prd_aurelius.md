# Summit / IntelGraph — State of the Union + MVP‑2 & GA PRD

**Owner:** Aurelius IG  
**Date:** 2025‑09‑30 (America/Denver)  
**Repo:** `github.com/BrianCLong/summit`  
**Document Type:** 360° State Review + Product Requirements (MVP‑2, GA) + Specs + Delivery Plan

---

## 0) Executive Summary

**Thesis.** Summit (aka IntelGraph Platform) is already a deployable-first, graph‑centric investigation & analysis platform with AI copilots and a modern, containerized stack. MVP‑0/1 deliver authentication/RBAC/OPA, React+GraphQL UI, Neo4j+Postgres(+pgvector)+Redis, ingestion (CSV/STIX/TAXII), AI extraction (CV/NLP/ASR), vector search, real‑time collab, and full observability.

**What’s next.** MVP‑2 focuses on enterprise‑grade multi‑tenant hardening, data lineage/provenance, evidence workflows, air‑gapped/offline operation, policy‑driven redaction, and first‑class plugin/runtime isolation. GA elevates this to horizontal scale (sharded graph + streaming), zero‑trust federation, regulated‑sector compliance packs, and a hardened marketplace for extensions.

**Business impact.** MVP‑2 unlocks paid pilots in public‑sector and regulated private‑sector with auditable provenance, while GA enables multi‑account SaaS and on‑prem SKUs with defensible IP in policy‑aware graph reasoning, provenance‑secure embeddings, and explainable copilot actions.

**Top 5 priorities (next 90 days).**

1. **Multi‑tenant tenancy model v2**: org/workspace/role schema; row‑/label‑level graph security; tenant‑aware caches.
2. **Provenance & Lineage**: OpenLineage + cryptographic event log; evidence chains; signed model outputs.
3. **Copilot Runtime Isolation**: policy‑constrained tool calls (OPA), rate‑limiters, sandbox, and cost guards.
4. **Air‑Gap Mode**: registry mirroring, model bundles, offline licensing; push/pull sync.
5. **Enterprise Observability**: per‑tenant budgets, cost/latency SLOs, p95/p99 dashboards; red team harness.

---

## 1) Current State (as‑is)

### 1.1 Golden Path & Capabilities

- **Golden path:** Investigation → Entities → Relationships → Copilot → Results (smoke tests pass).
- **Core (MVP‑0):** Auth (JWT), RBAC, OPA policies; GraphQL API; React 18 (MUI v5); Neo4j 5; PostgreSQL 16 (+pgvector); TimescaleDB; Redis; Docker Compose; CI; Grafana/Prometheus; OpenTelemetry; Nginx.
- **Advanced (MVP‑1):** AI extraction (CV: object/face/OCR; ASR+diarization; NLP: NER/sentiment/topics); embeddings & vector search; cross‑modal matching; real‑time collaboration; persisted queries; tenant isolation v1; audit logging; performance (LOD, clustering); WCAG AA accessibility; GEOINT via Leaflet; quality/confidence scoring.
- **Optional services:** Kafka ingest/graph pipeline; data flow simulators.

### 1.2 Codebase & Structure (high‑level)

- **Frontend:** `frontend/` (React 18, Redux Toolkit/RTK Query, Cytoscape.js, Vite, Playwright/Jest).
- **Backend/API:** `api/` + `gateway/` (Node 20 TS, Apollo Server v4, Express, Socket.io, persisted ops).
- **Graph & Data:** `graph-service/`, `db/` migrations, `etl/openlineage/`, `data‑pipelines/`, `featurestore/`.
- **AI/ML:** `ai-ml-suite/`, `cognitive‑insights`, `graph‑xai`, `eval/`, `benchmarks/harness/`.
- **Ops:** `deploy/`, `docker/`, `charts/`, `grafana/dashboards/`, `.ci/`, `RUNBOOKS/`, `SECURITY/`.
- **Governance:** `governance/`, `controls/`, `audit/`, `.security/`.
- **Developer UX:** `cli/`, `compose/`, `examples/`, `docs/`, `ONBOARDING.md`.

### 1.3 Non‑functional posture (inferred)

- **Deployability‑first:** `make bootstrap && make up && make smoke` golden path.
- **Observability:** Otel→Prometheus→Grafana; dashboards exist; basic budgets absent.
- **Security:** JWT+OPA, audit logging; persisted queries; needs deeper MTLS/service mesh & secrets mgmt.
- **Data mgmt:** Neo4j primary; Postgres/Timescale; vector index; lineage wiring present (OpenLineage dir) but not E2E.
- **Testing:** Unit/E2E present; red‑team & chaos artifacts exist; needs policy fuzzing & cost‑guard tests.

---

## 2) Gap Analysis (what’s missing for pilots & GA)

| Area                 | Gap                                                                      | Impact                                | Fix (MVP‑2)                                                                                    | GA Elevation                                                                 |
| -------------------- | ------------------------------------------------------------------------ | ------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Tenancy & Security   | Label/row‑level graph security uneven; cache leakage risk; weak SCIM/IdP | Data bleed, enterprise blockers       | Org→Workspace→Project model; tenant‑aware caches; SCIM 2.0; SSO/SAML/OIDC; per‑tenant KMS keys | Attribute‑based access (ABAC) with graph labels; confidential compute option |
| Provenance & Lineage | Partial OpenLineage; no crypto‑secure chains                             | Auditability, trust, court‑worthiness | Event DAG with content hashes; Sigstore/cosign‑style signing; model output attestations        | Cross‑tenant federated lineage; time‑boxed retention policies                |
| Copilot Safety/Cost  | Tool calls not fully sandboxed; no budgets                               | Safety, runaway costs                 | OPA‑guarded tool registry; per‑tenant budgets/quotas; rate‑limiters; kill‑switch               | Formal policy verification; contract‑level SLAs                              |
| Offline/Air‑gap      | No shrink‑wrap bundles; registry deps                                    | Gov/defense deployment friction       | Model & container bundle maker; offline license; delta sync                                    | Deterministic builds; content‑addressed artifact store                       |
| Scale & HA           | Single Neo4j instance; limited sharding                                  | Large tenants, SaaS                   | Read replicas; CDC→Kafka; cold/warm tiering; job queue                                         | Sharded graph or AuraDS/Neo4j Fabric; multi‑region                           |
| Compliance           | Controls present but unmapped to frameworks                              | Sales friction                        | Compliance packs (CJIS/IRS‑1075/FedRAMP‑lite/ISO 27001)                                        | Full audit program; externalized policy library                              |
| UX & Collab          | Presence exists; review workflows thin                                   | Analyst velocity                      | Evidence notebooks; chain‑of‑custody review; timelines; diffing                                | Role‑tailored workspaces; plugin marketplace                                 |
| Eval/Bench           | KPIs not formalized; goldens partial                                     | Unclear deltas                        | Bench harness with seeds; power/cost KPIs; robustness suite                                    | Long‑run regression board; customer datasets                                 |

---

## 3) MVP‑2 PRD (next ship)

### 3.1 Goals & Success Metrics

- **Goals:** Enterprise‑safe multi‑tenant operations; verifiable provenance; safe, cost‑bounded copilot; offline deployment; pilot‑grade observability.
- **North‑star metrics:**
  - p95 **query latency** < 250 ms (GraphQL read) under 500 QPS; p95 copilot tool exec < 3 s.
  - **Cold start** (compose up→usable UI) ≤ 120 s on 8‑core/16GB dev host.
  - **Zero tenant cross‑leak** in fuzz tests; **<1%** false‑allow in policy fuzzing.
  - **Provenance coverage**: ≥ 95% of write ops & model outputs signed and linked.
  - **Cost guardrails**: Hard budgets enforceable; no task exceeds configured limits.

### 3.2 Users & Personas

- **Intel Analyst (primary):** Investigations, entity linking, evidence chains, queries, reporting.
- **Case Lead:** Review/approve evidence, manage chain‑of‑custody, assign tasks.
- **Data Engineer:** Configure connectors, quality checks, lineage mappings.
- **SecOps Admin:** Policies, SSO/SCIM, audit, budget limits, tenancy.

### 3.3 In‑Scope Features

1. **Tenancy v2**
   - Schema: `tenant → org → workspace → project → investigation` with role sets and OPA policies.
   - **Graph label security**: Node/edge labels carry ACL/ABAC attrs; enforced in Cypher via query rewrite.
   - **Tenant‑aware caches**: Redis key namespaces; GraphQL persisted ops bound to tenant; CDN headers.
   - **SSO/SCIM**: OIDC/SAML SSO; SCIM 2.0 user/group provisioning; Just‑in‑Time (JIT) roles.

2. **Provenance & Evidence**
   - **Write‑path hooks**: Every mutation emits an OpenLineage event with content hash (BLAKE3), actor, policy.
   - **Crypto attestations**: Service keypairs (per‑tenant) sign events; model outputs embed signature + model/version.
   - **Evidence notebooks**: Markdown+attachments with immutable versions; review/approval workflow; chain‑of‑custody timeline.

3. **Copilot Guardrails**
   - **OPA‑gated tool registry**: Tool manifests (inputs, cost estimate, data classes). Deny by default.
   - **Budgets & quotas**: Per‑tenant/user daily/monthly budgets; request admission controller.
   - **Sandbox**: Runtime isolation (Firecracker/micro‑VMs or Node VM w/ seccomp profile); network egress policy.

4. **Air‑Gapped Mode**
   - **Bundle builder**: `make bundle` creates OCI + model assets + license manifest; offline install script.
   - **Offline license**: Signed capability tokens; audit trail on use.
   - **Sync**: USB/rsync delta packages for content and model updates.

5. **Observability & FinOps**
   - **Dashboards**: p50/p95/p99 latency, error rates, per‑tenant spend, tool usage, cache hit rate, graph QPS.
   - **Alerting**: SLO burn rates, budget threshold alerts, anomalous copilot behavior (policy tripping).

### 3.4 Out of Scope (MVP‑2)

- Full multi‑region; marketplace; sharded graph; confidential computing; third‑party billing.

### 3.5 Detailed Specs

#### 3.5.1 API/Service Contracts

- **GraphQL**: Persisted queries only in prod; add authz context `{tenantId, orgId, roles, abac}` to resolvers.
- **Mutations**: Return `provenanceId` and `signature` fields; expose `GET /provenance/:id` (REST) for chain fetch.
- **Webhooks**: Lineage events to Kafka topic `lineage.events.v1` (when enabled).

#### 3.5.2 Data Model Additions

```sql
-- Tenancy
create table tenants (id uuid pk, name text, kms_key_id text, created_at timestamptz);
create table orgs (id uuid pk, tenant_id uuid fk, name text);
create table workspaces (id uuid pk, org_id uuid fk, name text);
create table projects (id uuid pk, workspace_id uuid fk, name text);

-- Evidence & provenance
create table evidence (
  id uuid pk, project_id uuid fk, title text, md text, created_by uuid,
  created_at timestamptz, version int, immutable boolean default true,
  chain_parent uuid, hash bytea, signature bytea
);
create table lineage_events (
  id uuid pk, ts timestamptz, actor uuid, tenant_id uuid, resource text,
  action text, content_hash bytea, signature bytea, model text, model_ver text,
  extra jsonb
);
create index on lineage_events (tenant_id, ts);
```

#### 3.5.3 Security & Policy

- **OPA bundles** checked into `governance/` with CI validation; **policy fuzzing** seeds under `tests/policy/`.
- **Secrets**: Move to Vault or SOPS‑age; per‑tenant KMS keys (AWS KMS/HashiCorp).
- **Network**: MTLS between services (Traefik/Envoy sidecars acceptable in MVP‑2); egress allow‑list.

#### 3.5.4 Copilot Runtime

- **Tool manifest (YAML)**:

```yaml
apiVersion: v1
kind: Tool
metadata: { name: extract_entities, owner: ai }
spec:
  inputs: [text, image]
  max_cost_usd: 0.05
  policy_tags: [pii, export]
  opa_package: tools.extract_entities
  sandbox: { profile: 'restricted' }
```

- **Admission flow**: request → static cost estimate → OPA check → budget check → sandbox exec → signed result.

#### 3.5.5 Observability Schemas

- **Metrics:** `graph_query_latency_ms{op,tenant}`, `copilot_tool_cost_usd{tool,tenant}`, `policy_denials_total{rule}`.
- **Logs:** Structured JSONL with `trace_id`, `tenant_id`, `provenance_id`.

#### 3.5.6 Performance Targets & Benchmarks

- **Query suite:** top 20 GraphQL operations; synthetic graph (10M nodes/50M edges).
- **Hardware:** 16 vCPU / 64 GB / NVMe SSD; Neo4j + API on separate nodes.
- **KPIs:** Throughput@p95, memory footprint, cache hit rate, GC pauses; cost/query for copilot tools.

### 3.6 Acceptance Criteria (DoD for MVP‑2)

- All new services behind `make up‑ai`/`make up‑full` continue to pass `make smoke`.
- Tenancy fuzz tests (10k random perms) show **0 cross‑tenant reads/writes**.
- ≥ 95% mutations produce signed lineage events resolvable via UI and API.
- Budgets enforced with unit tests and live kill‑switch verified.
- p95 GraphQL read < 250 ms @ 500 QPS; copilot tasks within budget limits.
- Air‑gap bundle installs cleanly on a network‑isolated host; all CI green.

---

## 4) GA PRD (6–9 months)

### 4.1 Goals

- SaaS + on‑prem productization, sharded/high‑availability graph, zero‑trust federation, compliance SKUs, and plugin marketplace.

### 4.2 Capabilities

1. **Sharded Graph & Elastic Compute**: Neo4j Fabric or alternative (JanusGraph/Scylla‑backed) for horizontal scale; CDC→Kafka→Flink for derived stores.
2. **Policy‑Aware Federation**: Cross‑tenant data exchange via signed contracts; opaque IDs with escrowed joins; Row‑level encryption by label.
3. **Marketplace & Plugins**: Signed extensions (wasm/python), permissioned tool store, revocation lists, revenue share.
4. **Explainable Copilot**: Action graph (semantically typed) with backtraces; per‑decision saliency; reproducible runs.
5. **Compliance Packs**: FedRAMP Moderate path, CJIS, ISO 27001/27701, SOC 2 Type II; turnkey audit evidence collection.
6. **Billing & Entitlements**: Metering per tenant; plan limits; license server (online/offline); key escrow.

### 4.3 Non‑functional Targets

- p95 read < 150 ms @ 2k QPS; HA failover < 30s; RPO ≤ 60s; RTO ≤ 15m.
- Cost/query and cost/embedding reduced by 30% vs MVP‑2 through caching & batching.
- Security posture: MTLS mesh, secrets rotation, continuous policy verification, SBOM/SLSA v1.0.

### 4.4 GA Acceptance

- 3 reference customers (one air‑gapped), 99.9% SLO, completed SOC2 Type I, pen‑test with MED/LOW findings only.

---

## 5) System Architecture (target)

```text
+-------------------+      +------------------+       +------------------+
|   React Client    | <--->|  GraphQL Gateway |<----->|  Policy / OPA    |
| (Cytoscape, RTK)  |      |  (Apollo v4)     |       |  Bundles + PDP   |
+-------------------+      +------------------+       +------------------+
           |                         |                           |
           v                         v                           v
+-------------------+      +------------------+       +------------------+
|  Copilot Runtime  |----->|  Services (TS)   |<----->|  Lineage Bus     |
|  (Sandbox, Budget)|      |  Ingest, ETL,    |       |  (Kafka+OpenLn)  |
+-------------------+      |  Evidence, Search|       +------------------+
           |                +------------------+                  |
           v                         |                            v
+-------------------+                v                   +------------------+
| Vector/Feature DB |        +---------------+           |   Data Lake      |
|  (pgvector)       |<------>|   Neo4j 5     |<----------|  (S3/MinIO)      |
+-------------------+        |  (Fabric)     |           +------------------+
                             +---------------+
```

---

## 6) Workstreams & Milestones

### 6.1 MVP‑2 (Timebox: 12 weeks)

- **W1–2:** Tenancy schema, cache namespacing, SSO/SCIM skeleton; policy bundle CI.
- **W3–4:** Lineage event hooks, signature service, provenance API+UI; evidence notebooks.
- **W5–6:** Copilot tool registry, OPA checks, budgets & rate‑limits; sandbox profile.
- **W7–8:** Air‑gap bundler & installer; offline license tokens; delta sync PoC.
- **W9–10:** Dashboards, SLO burn alerts, FinOps metrics; red team harness.
- **W11–12:** Perf tuning, fuzzing, pen test, docs, smoke/golden refresh, pilot enablement.

### 6.2 GA (Timebox: 6–9 months after MVP‑2)

- Fabric/sharding path; marketplace; compliance packs; billing; HA/DR.

---

## 7) Implementation Plan (Repro Pack + CI)

**/design/** problem framing; novelty matrix; threat/abuse cases.  
**/spec/** formal method spec; interfaces; pseudocode.  
**/impl/** Python/TS services; Makefile; Dockerfiles; Helm charts; CLI.  
**/experiments/** perf/eval harness; seeds; configs.  
**/benchmark/** KPIs; datasets; scripts; plots.  
**/ip/** patent scaffold + prior art; FTO notes.  
**/compliance/** LICENSE report; SBOM (SPDX); SLSA provenance; policy mappings.  
**/integration/** SDK stubs; example PR; release notes.

**CI (GitHub Actions):** matrix builds; SBOM generation; OPA policy tests; unit/e2e; smoke; bundle build artifact; cosign attestations; artifact retention.

---

## 8) Detailed Engineering Tasks (MVP‑2 backlog)

### 8.1 Tenancy v2

- [ ] DDL migrations (tenant/org/ws/project) + data backfill scripts.
- [ ] Graph label ABAC: query rewrite middleware for Cypher; tests.
- [ ] Redis namespacing strategy; cache busting hooks; perf tests.
- [ ] SSO (OIDC) integration; SCIM user/group sync; JIT role mapping.

### 8.2 Provenance & Evidence

- [ ] OpenLineage client in gateway + services; event schema + hash (BLAKE3).
- [ ] Sig service (ed25519 per tenant); key rotation; storage.
- [ ] Evidence UI: timeline, diff, sign/verify, export (PDF/JSONL).
- [ ] Provenance REST endpoint + GraphQL fields; permissions.

### 8.3 Copilot Guardrails

- [ ] Tool manifest spec; registry service; OPA bundles.
- [ ] Budget/quota service; admission controller; kill‑switch UI.
- [ ] Sandbox profile & egress policy; telemetry & per‑tool cost metrics.

### 8.4 Air‑Gap & Packaging

- [ ] `make bundle` (OCI + models + LICENSE inventory + SBOM).
- [ ] Offline installer; license token generation/validation.
- [ ] Delta update format; integrity verification.

### 8.5 Observability & FinOps

- [ ] Grafana dashboards; SLO burn rate alerts; tenant cost cards.
- [ ] Policy denial counters; anomaly alerts; audit export job.

### 8.6 Performance & Hardening

- [ ] Perf suite (500 QPS); LRU tuning; prepared statements; Neo4j cache; RTK Query cache windows.
- [ ] Chaos tests (dependency failures); pen‑test fixes; dependency updates.

---

## 9) Risks & Mitigations

- **Graph scale limits** → Fabric/sharding roadmap; CDC mirrors to derived stores.
- **Policy complexity** → Policy design reviews; property‑based tests; staging canary.
- **Model licensing** → Prefer Apache‑2/BSD; maintain LICENSE inventory; dual‑licensing where needed.
- **Air‑gap entropy** → Deterministic builds; content‑addressable storage; bundle verification.
- **UX burden** → Evidence workflows iterative designs; analyst advisory loop.

---

## 10) IP & Differentiation (Aurelius angles)

- **Policy‑aware graph query rewrite** (ABAC at label/edge level) with formal verification.
- **Provenance‑secure embeddings**: embed signatures & model cards into vector payloads; verifiable retrieval chains.
- **Explainable copilot action graph** with budget‑aware planning and reversible steps.
- **Air‑gapped model bundle format** with license & SBOM attestations; offline usage metering.
- **Federated lineage contracts** for cross‑org evidence exchange with escrowed joins.

_(Prepare /ip/draft_spec.md with two independent claims + ≥8 dependents; maintain /ip/prior_art.csv & /ip/fto.md.)_

---

## 11) Commercialization & Packaging

- **SKUs:**
  - _Community (OSS)_: single‑tenant, no copilot sandbox, no compliance packs.
  - _Enterprise_: tenancy v2, provenance, budgets, SSO/SCIM, dashboards, air‑gap support.
  - _Gov/Air‑gap_: offline bundles, license server offline, compliance pack, support SLAs.
- **Pricing:** per‑tenant base + seat + usage (tool‑minutes/vector ops).
- **Partners/Targets:** SI/cyber vendors; gov integrators; regulated FI/health; graph DB vendors.

---

## 12) Rollout & Release Management

- **Branches:** `main` (stable), `develop`, feature branches; protected merges; release trains q2w.
- **Release Artifacts:** Docker images (cosign signed), SBOM, Helm charts, bundles, release notes.
- **Telemetry Guardrails:** opt‑in, privacy‑preserving; per‑tenant toggles; PII scanners on ingest.

---

## 13) Appendix — Checklists

### 13.1 Definition of Done (MVP‑2)

- [ ] All acceptance metrics met; smoke/golden path passes.
- [ ] CI: unit/e2e, policy tests, SBOM, signatures.
- [ ] Docs: ONBOARDING updated; runbooks for air‑gap; dashboards exported.
- [ ] Security review & pen‑test; LOW/MED only; remediations filed.
- [ ] Pilot enablement kit shipped (sample datasets, scripts, demo).

### 13.2 Tooling

- **Make targets:** `bootstrap`, `up`, `up-ai`, `up-kafka`, `up-full`, `smoke`, `bundle`, `bench`, `perf`.
- **CLI:** tenant/admin commands; budget/quota management; provenance export.

---

_Prepared by Aurelius — multi‑Nobel‑caliber AI Scientist/Engineer for Summit/IntelGraph._
