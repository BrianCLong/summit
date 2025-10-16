# [MODE: WHITE+BLUE+GOLD] Summit / IntelGraph — PRD & Security Spec (MVP‑2 → GA)

> **Classification:** Internal / Pre‑GA. Do not distribute externally without review.
>
> **Scope:** 360° product spec + PRD for MVP‑2 and GA, with security, governance, and operationalization emphasized from Directorate K++’s vantage.

---

## A) Executive Summary

- **Now:** Public repo is live with deployable-first stack (React + GraphQL + Neo4j + Postgres/pgvector + Redis; Docker compose), golden-path smoke tests, core intel workflows, and MVP‑0/1 features (authN/Z, graph analytics, AI copilot, ingestion, observability) shipping.
- **Next (MVP‑2):** Make it **tenant-safe, auditable, and production-operable**: multi-tenant isolation, provenance & evidence ledger, policy-as-code enforcement, hardened ingest & export, and IR/finintel guardrails. Deliver SOC2-ready controls, minimal viable multi‑env CI/CD, and SLO-backed dashboards.
- **GA:** **Scale + Trust**: HA/DR, perf SLOs, enterprise SSO & SCIM, data lifecycle & retention, privacy controls, per-tenant cost guardrails, signed releases, and customer-facing runbooks/support.
- **Measures that matter:** TTD ≤ 5m (P1 sec events), MTTR ≤ 45m, ≥ 95% policy/test pass rate on CI, p95 API < 250ms @ 1k rps, 0 sev‑1 security regressions in last 60 days pre‑GA.

---

## B) Context: Where We Are (Repository Reality)

**Golden Path / DevEx**

- Makefile-driven bootstrap (`make bootstrap`, `make up`, `make smoke`). Optional AI/Kafka add‑ons (`make up-ai`, `make up-kafka`, `make up-full`). Local endpoints: client:3000, GraphQL:4000, Neo4j:7474.
- Developer docs index + onboarding present; repo contains dashboards, runbooks, security, connectors, and CI assets.

**Platform Features (current claim/coverage)**

- **MVP‑0 (Complete):** Auth + RBAC + OPA stubs, persisted queries, rate limiting; core investigations + graph CRUD; deployable Docker stack; basic observability.
- **MVP‑1 (Complete):** AI/ML extraction (text, vision, speech), vector search, cross‑modal matching, collab UX, performance tuning, security hardening, CI smoke tests.
- **UI/Analytics:** Cytoscape-based graph viz; NL driving of insights; WCAG targeting; time‑series/geo layers.

**Repo Surface (indicative folders)**

- `RUNBOOKS/`, `SECURITY/`, `grafana/dashboards/`, `alerting/`, `controls/`, `policy/` (OPA), `connectors/`, `api/`, `client/`, `gateway/`, `graph-service/`, `docs-site/`, `docs/`, `audit/`, `feature-flags/`.

**Assessed Strengths**

- Deployable-first culture; strong golden-path discipline; rich analytics surface; early security artifacts; evidence-first posture.

**Immediate Gaps**

- **Multi‑tenancy** (namespaces, data boundaries, noisy-neighbor control) not provably enforced end‑to‑end.
- **Provenance & Chain-of-Custody** not formalized as first-class artifact (hashing, signer model, tamper-evident storage).
- **Role/Attribute models** need to graduate from RBAC to ABAC with case-scoped controls and least-privilege defaults.
- **Data lifecycle** (classification, retention, purge, legal hold) lacks policy + automation.
- **IR/telemetry** uneven: good dashboards but missing “break-glass” flows, autolinked evidence, and severity playbooks.
- **Privacy & compliance** scaffolding present but not mapped to SOC2/ISO/NIST with proofs and status.

---

## C) Product Vision (12–18 months)

**IntelGraph becomes the secure, deployable-first intelligence fabric** that:

- Fuses graph analytics with AI reasoning for investigations.
- Offers **provable** controls: policy‑as‑code, immutable evidence, reproducible insights.
- Operates **multi‑tenant by default**, with per‑tenant cost/SLO guardrails and export‑safe results.
- Ships with **auditable runbooks** and **API contracts** that enterprises can trust.

---

## D) Personas & Jobs-to-Be-Done

- **Investigator/Analyst:** Build cases, link entities, ask questions in natural language, export defensible reports.
- **Security/Compliance Officer:** Verify controls, review access, attest to policy conformance, respond to audits.
- **Data Engineer:** Onboard sources safely, monitor ingest health, remediate schema drift.
- **SOC/IR Lead:** Triage alerts, pivot across graph, collect evidence, initiate comms and containment.
- **Platform Owner:** Run the stack reliably, meet SLOs, manage tenants, cost, upgrades.

---

## E) MVP‑2 PRD (Scope, Specs, Acceptance)

### E.1 Goals (Outcome‑driven)

1. **Tenant-Safe by Default**: deterministic data and compute isolation with policy gates.
2. **Proof-Carrying Analysis (PCA) v1**: provenance ledger + evidence manifests attached to investigations.
3. **Operational Readiness**: alert→triage→contain runbooks, SLO dashboards, and automated policy checks.
4. **Compliance-Ready**: map core controls to SOC2/ISO/NIST; ship attestations/tests in‑repo.

### E.2 In/Out of Scope

- **In:** Multi‑tenant isolation, ABAC/OPA, PCA ledger, ingestion hardening, export controls, monitoring/alerting, release signing, SSO (OIDC), basic SCIM, DLP guardrails, minimal data lifecycle (retention+purge), incident playbooks, perf baselines.
- **Out (defer to GA):** Multi‑region HA, customer-managed keys, full eDiscovery, marketplace connectors at scale, advanced billing & quotas, FedRAMP baselines.

### E.3 Functional Requirements

**FR‑1 Multi‑Tenant Isolation (Graph + API + Cache)**

- Per‑tenant **namespace** across Postgres schemas, Neo4j labels/DBs, Redis keys, S3 prefixes.
- **Row‑level security (RLS)** in Postgres; **authz filters** injected in GraphQL resolvers; **Neo4j** DB‑per‑tenant or label + property guard with enforced `tenant_id` and constraints.
- **Background jobs** (ingest, AI) run with scoped credentials and resource quotas.

**FR‑2 ABAC & Case‑Scoped Access**

- Attributes: `tenant_id`, `case_id`, `role`, `purpose`, `classification`, `sensitivity`, `geo`.
- **OPA policies** enforce deny‑by‑default, purpose binding, time‑boxed access, and export review.

**FR‑3 PCA Ledger v1**

- For every investigation: immutable manifest recording **inputs, transforms, model/runtime versions, hashes, signers, and decisions**; anchored via content hashes.
- Evidence bundles are downloadable and verifiable offline.

**FR‑4 Ingestion & Export Guardrails**

- Connectors gated by schema contracts, PII classifiers, and taint labels; outbound exports require policy review (DLP, classification, watermarking).

**FR‑5 Observability & IR**

- Golden SLOs: API latency, error rates, job lag, Neo4j query p95, ingest success %, model queue depth.
- Alerts map to runbooks with **RACI**; evidence auto‑collected to the case.

**FR‑6 Security‑Critical UX**

- Admin views for tenants, roles, policies, and audit events; user‑visible provenance in UI; export warning/justification modal.

**FR‑7 Enterprise SSO (OIDC) & SCIM (basic)**

- OIDC with PKCE, refresh rotation; SCIM 2.0 user+group sync (create/deprovision, membership).

### E.4 Non‑Functional Requirements (NFRs)

- **Availability:** 99.9% single‑region (dev/test/stage/prod), RTO ≤ 2h, RPO ≤ 15m.
- **Performance:** p95 API < 250ms @ 1k rps; Neo4j read p95 < 150ms on top 10 queries.
- **Security:** Zero P1 vulns open > 7 days; 100% critical flows under policy tests; SBOM for all images.
- **Privacy:** Data classes tagged; retention defaults 180d; purge ≤ 24h SLA; export logs immutable.
- **Compliance:** SOC2‑lite evidence pack produced per release.

### E.5 Acceptance Criteria (per epic)

- **AC‑MT (Multi‑Tenant):** Tenant A cannot read/compute on Tenant B data under fuzz tests (10k random trials); policy unit tests covering top 20 queries; red/blue tabletop passes.
- **AC‑PCA:** Reproducible investigation: re‑running with identical inputs yields identical hashes; evidence manifest cryptographically verifiable; UI shows provenance timeline.
- **AC‑IR:** Simulated P1 alert routes to on‑call, dashboard lights red, runbook followed, evidence attached, MTTR simulation ≤ 45m.
- **AC‑SSO/SCIM:** IdP integration (Okta/Auth0/Entra) demoed; SCIM deprovision removes access within 5m.

### E.6 System Design Deltas for MVP‑2

- **Service boundaries:** introduce `provenance-ledger` service (append‑only, signed events); `policy-gate` sidecar for API and jobs.
- **Data model:** add `tenant_id`, `classification`, `case_id`, `retention_ttl` across entities/edges; enforce constraints and indexes.
- **Pipelines:** ingest → classify → validate → persist → index → notify; export → select → review → watermark → deliver.
- **Security:** keys via KMS, secret rotation, image signing (cosign), admission policies for clusters (if k8s used later).

### E.7 Backlog → Epics → Issues (MVP‑2)

- **EP‑1 Multi‑Tenant Isolation**
  - DB migrations for `tenant_id` + RLS; Neo4j DB‑per‑tenant option.
  - Resolver guards + integration tests.
- **EP‑2 ABAC/OPA Bundle**
  - Author `package summit.authz.*`; unit tests; policy fetcher client; deny‑by‑default rollout.
- **EP‑3 PCA Ledger v1**
  - Hashers/signers; manifest schema; UI timeline; export tool.
- **EP‑4 Ingest & Export Controls**
  - Schema registry; PII/DLP checks; watermarking; export approval flow.
- **EP‑5 Observability & IR**
  - Dashboards, SLOs, alert routes; runbooks with RACI.
- **EP‑6 Enterprise SSO/SCIM (basic)**
  - OIDC + SCIM sync; admin UX.
- **EP‑7 Release Security**
  - SBOM, cosign, provenance in OCI; CI policy gates.

---

## F) GA PRD (Scope, Specs, Acceptance)

### F.1 Goals

- **Trusted at scale** across orgs/regions with hard SLAs, audited controls, and cost/perf guardrails.

### F.2 Functional Additions

- **HA/DR:** Multi‑AZ + optional multi‑region; backup/restore drills; typed migrations.
- **Advanced Governance:** Case‑scoped encryption contexts; customer‑managed keys (CMK) with envelope encryption.
- **Access at Scale:** Attribute hierarchies, project/case roles, approval workflows, break‑glass with recording.
- **Data Lifecycle v2:** Legal hold, retention exceptions, redaction-on-export, SAR/DSAR workflows.
- **Compliance Packs:** SOC2 Type II, ISO 27001 Annex A mapping, NIST 800‑53 moderate overlays; audit dashboards.
- **Billing/Quotas:** Per‑tenant quotas (storage, compute, graph ops); budget alerts.
- **Connectors Catalog:** Hard‑tested, signed connectors with sandboxed exec; marketplace readiness.
- **Supportability:** Crash‑only design, safe mode, config drift detection, upgrade playbooks.

### F.3 NFRs

- **Availability:** 99.95% (prod), RTO ≤ 30m, RPO ≤ 5m (backed by managed services or k8s).
- **Performance:** p95 API < 180ms @ 5k rps; graph traversal SLAs by query class.
- **Security & Privacy:** Zero trust defaults; memory‑safe areas for model prompts/PII; privacy-by-design reviews.
- **Compliance:** External audit pass; evidence coverage ≥ 95%; no critical findings.

### F.4 Acceptance Highlights

- Multi‑region failover tabletop succeeds; encrypted exports pass external verification; SCIM group drift alarms in ≤ 5m; quarterly access reviews completed with one‑click attestations.

---

## G) Architecture: Reference & Deltas

### G.1 Current Stack (baseline)

- **Frontend:** React 18, MUI, Redux/RTK, Cytoscape, Vite; Jest/RTL, Playwright.
- **Backend:** Node 20 TS, Apollo GraphQL, Express, Socket.io, persisted queries.
- **Data:** Neo4j 5, Postgres 16 + pgvector, TimescaleDB, Redis 7; local FS / S3‑compat.
- **Infra:** Docker, Compose; OTel + Prometheus + Grafana; Nginx for prod; GH Actions CI.

### G.2 MVP‑2 Additions

- **Services:** `provenance-ledger`, `policy-gate` sidecar, `export-review` service.
- **Schemas:** Add classification/tenant/case/retention fields; audit/event tables; evidence bundles.
- **Policies:** OPA bundles fetched by `clients/cos-policy-fetcher` (or equivalent) with sig checks.
- **Pipelines:** Ingest & export gates; model registry metadata recorded into PCA.

### G.3 GA Additions

- **Orchestration:** Optionally migrate to k8s; GitOps; canary/blue‑green; HPA/VPA; priority classes.
- **Storage:** Object store with WORM buckets for evidence; PITR for Postgres; Neo4j causal cluster.
- **Crypto:** KMS envelopes per tenant/case; TDE where available; key rotation SLOs.

---

## H) Security & Compliance (Directorate View)

### H.1 Threat Model (condensed)

- **Actors:** Insider w/ excess rights; compromised analyst account; data broker scraping; supply‑chain tampering; noisy neighbor tenant; model‑induced data leakage.
- **Surfaces:** GraphQL API, background workers, connectors, exports, model prompts/results, dashboards.
- **Top Risks:** Cross‑tenant access, provenance gaps, export exfiltration, supply‑chain, weak IR.

### H.2 Controls (MVP‑2 → GA)

| Area           | MVP‑2 Control                                                                          | GA Hardening                                                         |
| -------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Isolation      | RLS + tenant scoping in resolvers & queries; Neo4j DB‑per‑tenant or strong label guard | Multi‑AZ/region isolation, resource quotas, noisy‑neighbor detection |
| AuthZ          | ABAC via OPA bundles; deny‑by‑default; case‑scoped tokens                              | Attribute hierarchies, approval workflows, just‑in‑time access       |
| Provenance     | PCA ledger, signed manifests, evidence WORM store                                      | External verifier CLI, timestamping service, cross‑org notarization  |
| Supply Chain   | SBOM, cosign signed images, pinned digests                                             | SLSA L3+, provenance attestations in release artifacts               |
| Data Lifecycle | Classification tags, 180d retention, purge jobs                                        | Legal hold, DSAR, redaction, configurable policies                   |
| Observability  | OTel traces + SLO dashboards + alerting → runbooks                                     | Synthetics, chaos drills, error budget policy                        |

---

## I) Artifacts (ready-to-ship)

### I.1 OPA/ABAC Bundle (MVP‑2)

```rego
package summit.authz

default allow = false

# Input contract: { user: {id, role, tenant, attrs}, action, resource: {kind, tenant, case, classification}, purpose }

allow {
  resource.tenant == user.tenant
  purpose_permitted
  classification_ok
  case_scope_ok
}

purpose_permitted { input.purpose == "investigation" }

classification_ok {
  not resource.classification in {"SECRET","TOP-SECRET"}
} else = false

case_scope_ok {
  some cid
  resource.case == cid
  cid in user.attrs.cases
}
```

**Unit Test Examples**

```rego
package summit.authz_test

import data.summit.authz

test_deny_cross_tenant { # should be false
  not authz.allow with input as {
    "user": {"tenant": "A", "attrs": {"cases": ["c1"]}},
    "resource": {"tenant": "B", "case": "c1", "classification": "CONFIDENTIAL"},
    "purpose": "investigation"
  }
}
```

### I.2 Sigma Detections (GraphQL & Export Exfil)

```yaml
# Suspicious GraphQL query volume cross-tenant (MVP-2)
logsource:
  product: application
  service: graphql
  category: query

rule: Summit-GraphQL-CrossTenant-Spike
status: experimental
level: high

detection:
  selection:
    operationName|contains: ['listEntities', 'search', 'export']
  filter:
    tenantId_mismatch: true # derived field from gateway
  timeframe: 5m
  condition: selection and filter | count() by userId > 100

fields: [userId, tenantId, ip, ua, operationName, variables]

falsepositives:
  - cross-tenant admin audit
```

```yaml
# Export without approval (MVP-2)
logsource:
  product: application
  service: export-service

rule: Summit-Export-NoApproval
level: high

detection:
  selection:
    export.approval.status: 'none'
    export.bytes: '> 1MB'
  condition: selection
```

### I.3 Runbook: P1 Cross‑Tenant Access Suspected (condensed)

1. **Trigger:** `Summit-GraphQL-CrossTenant-Spike` fires.
2. **Triage (≤ 5m):** Confirm tenant mismatch; snapshot evidence; page on‑call.
3. **Contain (≤ 15m):** Revoke token; disable account or rotate creds; enable heightened policy gate.
4. **Eradicate (≤ 30m):** Identify leaking queries/connectors; patch policy and resolvers; backfill audits.
5. **Recover (≤ 45m):** Re‑enable with scoped access; run regression tests.
6. **Lessons:** Create retro; update OPA tests and dashboards.

### I.4 Dashboards (Grafana panels minimal set)

- API p95/p99 latency; error rate; request volume
- Neo4j query p95 per operation
- Ingest throughput & failure rate; job lag
- Policy allow/deny counts; export approvals vs denials
- Security alerts by severity; MTTA/MTTR trend

### I.5 Data Schemas (deltas)

- Add columns/properties: `tenant_id`, `case_id`, `classification`, `retention_ttl` across entities/edges/attachments.
- **Indexes/constraints:** `(tenant_id, id)` composite; unique `(tenant_id, case_id)` per case; Neo4j constraint `ASSERT exists(n.tenant_id)`; query hints updated.

### I.6 CI/CD Policy Gates

- **Pre‑merge:** unit + policy tests + smoke; SBOM diff; secret scan; cosign verify.
- **Pre‑release:** provenance attest, changelog, evidence pack; signed OCI images.

---

## J) Roadmap (Quarterized)

**Q4 CY2025 (MVP‑2 focus)**

- EP‑1..EP‑7 complete; SOC2‑lite evidence pack; pilot with 1–2 design partners.

**Q1 CY2026**

- GA hardening sprints: HA/DR, CMK, lifecycle v2, SSO/SCIM scale, access reviews, support playbooks.

**Q2 CY2026 (GA)**

- External audit + performance verification; release v1.0 GA.

---

## K) KPIs/KRIs & SLOs

- **Security KRIs:** cross‑tenant attempts/week, export denials, policy test coverage, SBOM drift, vulns age.
- **Ops SLOs:** API p95, error budget, job lag, ingest success %.
- **Product KPIs:** case cycle time, analyst satisfaction, time‑to‑insight, successful exports post‑review.

---

## L) Proof-Carrying Analysis (PCA)

**Assumptions**

- Repo state reflects the live baseline; MVP‑0/1 feature claims in README are accurate; folders imply existing assets requiring formalization.

**Evidence**

- Public repository structure and README indicate features, quickstart, endpoints, and claims; presence of dashboards, runbooks, and security directories supports deployable-first posture.

**Caveats**

- Some claims may be aspirational; acceptance criteria calibrate what must be demonstrably true before we label MVP‑2/GA.

**Verification Plan**

- Implement policy/test harness; run smoke + synthetic cross‑tenant attempts; validate SLOs under load; produce signed evidence pack per release.

---

## M) Compliance Mapping (starter)

| Control Area        | SOC2    | ISO 27001 | NIST 800‑53    | Artifact                    |
| ------------------- | ------- | --------- | -------------- | --------------------------- |
| Access Control      | CC6     | A.9       | AC‑2/AC‑3/AC‑6 | OPA bundle + tests          |
| Change Mgmt         | CC7     | A.12      | CM‑3/CM‑6      | CI/CD policy gates          |
| Security Monitoring | CC7     | A.12      | AU‑6/IR‑5      | Grafana + alerts + runbooks |
| Data Retention      | CC8     | A.18      | MP‑6/PL‑2      | Retention jobs + configs    |
| Incident Response   | CC7/CC4 | A.16      | IR‑4/IR‑5      | IR runbooks + evidence      |
| Vendor/Supply Chain | CC7     | A.15      | SA‑12          | SBOM + cosign + SLSA plan   |

---

## N) Risk Ledger (initial)

| ID    | Risk                            | Likelihood | Impact | Owner    | Mitigation                                    | Residual |
| ----- | ------------------------------- | ---------- | ------ | -------- | --------------------------------------------- | -------- |
| R‑001 | Cross‑tenant data exposure      | Med        | High   | Eng Sec  | ABAC+RLS+tests; Sigma rule; red team tabletop | Low      |
| R‑002 | Provenance gaps → audit failure | Med        | Med    | Platform | PCA ledger + evidence WORM                    | Low      |
| R‑003 | Export exfiltration             | Med        | High   | Product  | Export review + DLP + watermarking            | Med      |
| R‑004 | Supply‑chain compromise         | Low        | High   | DevEx    | SBOM+cosign+pinning                           | Low      |
| R‑005 | SLO breach under load           | Med        | Med    | SRE      | Perf tuning + autoscale + error budget policy | Med      |

---

## O) Go/No‑Go Checklist

- ***

## P) Appendices

- **Appendix A:** Data classification taxonomy (PUBLIC/INTERNAL/CONFIDENTIAL/SECRET).
- **Appendix B:** Example export watermark manifest.
- **Appendix C:** Red/Blue tabletop outline for cross‑tenant attack.

> End of document.
