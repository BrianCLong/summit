# CompanyOS + Switchboard — MVP‑2 & GA PRD + Spec

**Author:** SummerBabe (Architecture & Core Dev)

**Repo scanned:** `github.com/BrianCLong/summit` (public)

**Date:** Sep 30, 2025 (America/Denver)

---

## Executive Summary
We’re in a strong build-out phase with many of the right primitives already present in the repo: policy/controls, provenance/evidence, observability/alerting, CI/CD hooks, connectors, a workflow surface (Switchboard/Conductor UI), data pipelines, and packaging scaffolding (charts/deploy). The next two phases—**MVP‑2** and **GA**—should lock in zero‑trust policy gates, provenance receipts on all privileged flows, p95 performance on a realistic multi‑tenant graph, and cost attribution with per‑tenant finops dashboards. GA should add hosted SaaS hardening, compliance packs, and white‑label kit readiness.

This document provides a 360° PRD + Spec and a concrete execution plan that maps onto the current repository structure.

---

## Where We Are (Current State Assessment)
> Snapshot derived from the current repository structure, scripts, and conventions.

### Codebase Shape (selected top‑level dirs)
- **`companyos/`** — Core platform logic (graph/entities, workflow, policy hooks) — foundation for Internal Platform & SaaS.
- **`conductor-ui/`, `dashboard/`, `apps/`, `client/`** — User surfaces (Switchboard-style tri‑pane UX, ops dashboards, clients/SDKs).
- **`api/`, `apis/`, `contracts/`** — HTTP/JSON and typed interfaces; good base to converge to OAS3 and SDK generation.
- **`controls/`, `SECURITY/`, `.security/`** — Policy, guardrails, threat models, and security notes.
- **`audit/`, `.evidence/`** — Provenance/evidence scaffolding; needs universal coverage of critical flows.
- **`alerting/`, `alertmanager/`, `analytics/`, `benchmarks/`, `observability via charts/dashboard`** — Monitoring and SLO instrumentation scaffolding.
- **`deploy/`, `charts/`, `docker/`, `.ci/`, `.githooks/`, `.husky/`, `.devcontainer/`** — Packaging & DX; Helm/K8s flavored; CI hooks exist.
- **`connectors/`** — Ingest/adapters exist; design for pluggability appears underway.
- **`data-pipelines/`, `airflow/dags/`** — Batch/stream pipelines; early but promising.
- **`RUNBOOKS/`, `adr/`** — Docs-as-code present; continue the discipline.
- **`brands/`, `compose/`** — Theming/brand and local stack orchestration.

### Strengths
- Zero‑trust mindset evident (controls, security, audits present).
- Provenance-first artifacts exist; the schema/coverage needs to be standardized and enforced.
- Multi‑tenant intent present (dashboards, connectors, cost awareness hooks in analytics/finops scaffolding).
- CI/CD, container, charts present; good base for Policy‑as‑Gate deployments.
- UI surfaces for Switchboard/Conductor and Ops dashboards exist; need consolidation & polish.

### Gaps / Risks
- **Policy Coverage:** Not all privileged flows appear to be policy‑gated with OPA/ABAC and preflight simulation.
- **Provenance Coverage:** Evidence/Receipt emission likely partial; needs universal coverage + signing/notary.
- **Performance:** Target p95 <1.5s on 50k‑node graph not yet demonstrated with exemplars + perf gates.
- **FinOps:** Per‑tenant cost attribution likely incomplete; needs metering pipeline + dashboards.
- **Tenancy Isolation:** Clear boundary (schema, secrets, resource quotas) must be codified and tested.
- **Docs & Contracts:** OAS3 canonical spec + typed SDK generation not unified; acceptance tests must gate merges.
- **Compliance Readiness:** SOC2/ISO control mappings exist in spirit; require explicit packs, evidence, and runbooks.
- **SaaS Hardening:** RPO/RTO drill automation, region/sharding policies, purge manifests E2E.

---

## North Star & SLOs
- **North Star:** Operate Summit on CompanyOS + Switchboard internally, then externalize as white‑label + hosted SaaS without sacrificing zero‑trust, provenance, or margin.
- **SLOs (Phase Targets):**
  - **MVP‑2:** p95 < 1.5s across 6 critical flows on a 50k‑node multi‑tenant graph; p99 error rate <0.5%.
  - **GA:** API uptime ≥99.9%; **RPO ≤15 min**, **RTO ≤60 min**; policy coverage ≥90% of privileged flows; receipts on 100% of privileged actions.

---

## MVP‑2 — Product Requirements (PRD)
### Users & Jobs
- **Internal Operators:** run the business, approve high‑risk ops with rationale, incident mgmt, runbooks.
- **Builders/Analysts:** author policies, model entities/relationships, query lineage, explore graph.
- **Partners (early):** try white‑label kit, theme the UI, integrate identity/storage.

### In‑Scope
1. **Policy Layer (OPA/ABAC) v1.0**
   - Role/attribute catalogs; environment‑scoped attributes; preflight policy simulation.
   - Git‑versioned policy bundle with regression suite; policy decision logging.
2. **Provenance Ledger v1.0**
   - Evidence/Receipt schemas; universal emit on privileged flows; signing + notary adapter; selective disclosure API.
3. **Graph & Workflow Core**
   - Entities, lineage, entitlements; command palette + approvals with rationale; incident/runbook hub.
4. **Observability Pack v1.0**
   - Grafana dashboards for SLOs (latency/error), policy decisions, receipt rates; synthetic probes; trace exemplars.
5. **FinOps v0.9**
   - Metering pipeline (ingest units, storage GB‑mo, query credits, seats); per‑tenant usage table; basic cost attribution.
6. **Reference API + SDKs (TS first)**
   - OAS3 canonical spec; generated SDK; Postman collection; contract tests must pass to merge.
7. **Packaging v1.0**
   - Helm charts + Terraform modules; seed data; sample policies; one‑click internal install.
8. **Security & Supply Chain v1.0**
   - SBOMs + SLSA attestations, image signing (cosign), policy‑gated deploys.

### Out‑of‑Scope (MVP‑2)
- Hosted SaaS billing + payments integration.
- Advanced data residency/sharding and BYOK; these land in GA.
- Marketplace of connectors (keep a minimal set for now).

### Acceptance Criteria (MVP‑2)
- **Policy:** ≥90% of privileged endpoints/actions call OPA; simulation CLI returns PASS/FAIL; decisions are logged and queryable.
- **Provenance:** 100% of privileged flows emit signed receipts to ledger; selective‑disclosure endpoint returns redacted proofs.
- **Perf:** Perf harness run on 50k‑node, 10‑tenant dataset; p95<1.5s across: create‑entity, grant‑entitlement, run‑workflow, approval, policy‑simulate, provenance‑fetch.
- **Observability:** Dashboards live; 3 SLOs declared with error budgets; synthetic probes configured.
- **FinOps:** Metering writes per‑tenant usage; dashboard shows cost per tenant with ≥80% attribution confidence.
- **Docs:** API handbook, runbooks, policy cookbook; quickstart validated from zero to functional in <30 minutes.

---

## GA — Product Requirements (PRD)
### Additional In‑Scope
1. **Hosted SaaS Hardening**
   - Multi‑tenant isolation enforcement (namespaces/quotas/ABAC); DR playbooks with automated drills; chaos tests.
2. **Compliance Packs**
   - SOC2/ISO mappings, DPIA templates, retention configs, purge manifest E2E with receipts.
3. **White‑Label Kit v1.0**
   - Theme/brand packs, role catalogs, policy profiles, export/import of configuration; partner demo environment.
4. **FinOps & Billing v1.0**
   - Per‑tenant cost attribution ≥95% accuracy; pricing tiers (Internal/Pro/Enterprise); invoicing hooks.
5. **Data Residency & Keys**
   - Region tags, residency policies, KMS rotation, customer‑managed keys (BYOK) for Enterprise.

### Acceptance Criteria (GA)
- **Reliability:** API uptime ≥99.9% measured over 30d; RPO ≤15m, RTO ≤60m validated in drills with evidence.
- **Security:** Zero critical vulns; least‑privilege IAM; dual‑control deletes.
- **Provenance:** Evidence bundles exportable; verify receipts across 100% of admin flows.
- **FinOps:** Tenant cost dashboards live; invoices generated via hooks; pricing pages/docs shipping.
- **Packaging:** Helm/Terraform modules published; white‑label guide; SaaS SRE runbook; multi‑region reference.

---

## System Specification (Design & Implementation Plan)
### 1) Reference Architecture
- **Core:** CompanyOS (graph engine + policy layer + provenance ledger) exposed via APIs.
- **Switchboard:** Conductor‑style UI: tri‑pane (Graph / Timeline / Map), command palette, approvals & rationale, incident/runbook center.
- **Policy:** OPA sidecar or library, ABAC; policy bundles shipped with app; policy simulator endpoint + CLI.
- **Provenance:** Append‑only evidence store with receipt signing (Sigstore/cosign keyless or KMS); selective disclosure (JSON‑LD/SD‑JWT style) for privacy.
- **Eventing:** Durable bus (Kafka/NSQ/SQS equivalent), idempotent consumers, DLQ; replay emits provenance.
- **Observability:** OpenTelemetry traces; metrics; logs; Grafana dashboards + alert rules checked into repo.
- **Storage:** Pluggable backends (S3/GCS/Azure) via connectors; tenant‑scoped buckets/prefixes; server‑side encryption.
- **Identity:** OIDC/OAuth2; SCIM for provisioning; JIT claims mapping to ABAC.

### 2) Data Model (Sketch)
- **Entities:** `Person`, `Company`, `Asset`, `Workflow`, `Policy`, `Receipt`, `EvidenceBundle`, `Tenant`, `Invoice`, `Runbook`, `Incident`.
- **Edges/Lineage:** `OWNS`, `MEMBER_OF`, `ENTITLED_TO`, `TRIGGERS`, `EMITS`, `GOVERNS`, `BILLS_TO`.
- **Receipts:** `{id, actor, action, target, policy_decision, evidence_refs[], hash, signature, timestamp, tenant}`.

### 3) APIs (OAS3 Targets)
- **/auth/** — OIDC callback, token exchange.
- **/entities/** — CRUD + lineage; batch ingest.
- **/policy/** — simulate (dry‑run), decision logs, bundle version.
- **/provenance/** — put evidence, get receipt, selective disclose.
- **/workflows/** — start, approve with rationale, runbook link.
- **/tenants/** — create, usage, cost.
- **/finops/** — metering write/read; cost attribution.
- **/admin/** — purge request (with dual‑control), export evidence bundles.

### 4) Policy Bundle (OPA/ABAC)
- **Catalogs:** roles (Admin, Operator, Approver, Auditor, Partner), attributes (env, tenant_id, data_class, region).
- **Coverage:** privileged flows (authz, approvals, deletions, export, policy changes) must call OPA.
- **Simulation Harness:** load fixtures, run query set, diff against golden outputs; regression required to merge.

### 5) Provenance Ledger
- **Emitters:** middleware wraps privileged endpoints to emit receipts.
- **Signing:** cosign or KMS (per‑env keys); receipts are hashed and signed; optional timestamping via external notary.
- **Selective Disclosure:** redact fields based on viewer attributes; produce verifiable proofs.

### 6) Observability & SLOs
- **Dashboards:** latency/error by flow; policy decision rates; receipt emission rates; per‑tenant usage.
- **Alerting:** SLO burn alerts; missing‑receipt detector; policy‑denial spikes; DR drill reminders.
- **Perf Harness:** `benchmarks/harness` with 50k‑node, 10‑tenant synthetic data; CI gate with thresholds.

### 7) FinOps & Billing
- **Metering:** interceptors write standardized usage records.
- **Attribution:** cost model: infra (compute/storage/network) + 3rd‑party (LLM/api) → split per tenant via usage keys.
- **Dashboards:** tenant cost, unit economics; export CSV; pricing tier simulator.
- **Billing Hooks:** Webhook to invoicing; not in MVP‑2 scope to charge, only generate artifacts.

### 8) Tenancy & Isolation
- **Hard Boundaries:** tenant_id in every table/index; namespace per tenant; resource quotas; secret scoping.
- **Tests:** policy tests prevent cross‑tenant reads; chaos test simulates noisy neighbor.

### 9) Packaging & Deployment
- **Helm Charts:** values for single‑tenant (internal) and multi‑tenant (SaaS beta); feature flags.
- **Terraform:** modules for core infra, identity, storage, monitoring.
- **Release Train:** canary + ramp controller; freeze windows; automated rollbacks; provenance attached to releases.

---

## Mapping Plan → Repository
- **Policies:** `controls/` → organize OPA bundles; add `controls/tests/` with fixtures + regressions.
- **Provenance:** `.evidence/`, `audit/` → introduce canonical `schemas/receipt.json`, `schemas/evidence.json`.
- **Perf:** `benchmarks/harness/` → standard 50k‑node dataset; CI job; artifacts in `artifacts/benchmarks/`.
- **Observability:** `alerting/`, `dashboard/`, `charts/` → finalize SLO dashboards + alert rules; ship as code.
- **FinOps:** `analytics/`, `data-pipelines/`, `dashboard/finops/` → metering schema + ETL + dashboards.
- **API/OAS:** `api/`, `apis/`, `contracts/` → single `openapi.yaml` + codegen; publish TS SDK in `clients/`.
- **UI:** `conductor-ui/` + `dashboard/` → consolidate shared components; add Approvals & Rationale Center.
- **Packaging:** `deploy/`, `charts/`, `docker/` → values files for Internal/White‑Label/SaaS; example secrets.
- **Docs:** `RUNBOOKS/`, `adr/` → add Policy Cookbook, Purge Manifest Runbook, DR Drill Guide.

---

## Deliverables (Definition of Done)
**Every feature is “done” only with:** tests, policies, dashboards, docs, and provenance receipts.

### MVP‑2 DoD
- Policy bundle + simulator + ≥90% coverage (privileged flows).
- Receipts on 100% of privileged flows with signed hashes.
- SLO dashboards + probes; perf harness gates; error budget policy.
- OAS + TS SDK + Postman; contract tests green.
- Helm/Terraform install works from zero; seed data + sample policies.
- SBOM + SLSA + signed images; policy‑gated deploys.

### GA DoD
- DR drill evidence; purge manifest E2E; data residency toggles.
- Cost attribution ≥95% accuracy; pricing tiers in docs; invoice hooks.
- White‑label kit shipped (themes, policy profiles, sample tenant export/import).
- Compliance packs with control mappings and evidence bundles.

---

## Work Plan & Milestones (90 Days)
### Sprint 1–2 (Weeks 1–4)
- Policy bundle v1 + simulator harness; gate merges on policy coverage.
- Provenance middleware + schemas; sign receipts; evidence viewer API.
- OAS canonicalization + TS SDK generation; contract tests in CI.
- Perf harness scaffolding; create 50k‑node dataset; baseline p95 numbers.

### Sprint 3–4 (Weeks 5–8)
- Observability pack: dashboards + alert rules; synthetic probes; trace exemplars.
- FinOps metering schema + pipeline; basic tenant cost dashboard.
- UI Approvals & Rationale Center; incident/runbook hub MVP.
- Helm/Terraform installation flow; seed data + sample policies.

### Sprint 5–6 (Weeks 9–12) — MVP‑2 Cut
- Perf tuning to hit p95<1.5s; error budget policy live.
- Policy coverage audit; provenance coverage audit; close gaps.
- Docs: runbooks, policy cookbook, API handbook, quickstart.

### Sprint 7–9 (Weeks 13–18) — Toward GA
- DR drills + evidence; purge manifest E2E; chaos tests.
- Data residency flags; BYOK hooks; multi‑region ref arch.
- FinOps accuracy to ≥95%; pricing tiers + invoice hooks.
- White‑label kit + partner demo environment.

---

## Acceptance Tests (Samples)
- **AT‑POL‑001:** Changing any `controls/*.rego` re‑runs simulation; merge blocked if regressions.
- **AT‑PROV‑003:** Deleting an entity emits receipt with dual‑control approval and signature.
- **AT‑PERF‑002:** Under 10 concurrent tenants, 500 rps mix, p95 across 6 flows <1.5s.
- **AT‑FIN‑004:** Tenant dashboard shows usage and cost within ±5% of cloud bill sample.
- **AT‑DR‑006:** Restore from backup within 60m; evidence bundle includes timestamps and checksums.

---

## Security Posture Enhancements
- Least‑privilege IAM maps; environment‑scoped secrets; rotation schedule.
- Dual‑control deletes & exports; policy‑gated deploys; kill‑switches.
- SBOM per image; SLSA level targets; vulnerability budget zero for criticals.
- Honey tokens & tripwires; threat‑hunting runbooks; backup verification.

---

## Docs & Packaging to Ship
- **Reference Architecture** diagrams + trust boundaries + cost profiles.
- **OPA/ABAC Policy Bundle** cookbook + role/attribute catalogs.
- **Provenance Ledger** schema guide + selective disclosure explainer.
- **Switchboard App** user guide + approvals & rationale workflows.
- **Observability Pack** Grafana/Alert rules, SLO handbook.
- **FinOps & Billing** usage schema, attribution model, dashboards.
- **Release Pack** Helm/Terraform, seed data, brand/theme samples.
- **Security Artifacts** SBOMs, attestations, cosign signatures, purge manifest.

---

## Backlog (Prioritized)
1. Policy preflight & coverage reporter
2. Receipt signer + viewer API + redaction proofs
3. OpenAPI canonical spec + SDK generator
4. Perf harness + exemplars + CI gates
5. SLO dashboards + synthetic probes
6. Metering pipeline + tenant cost dashboard
7. Approvals & rationale center (UI)
8. DR drill automation + evidence bundle
9. White‑label kit + partner demo env
10. Data residency/BYOK toggles

---

## Changelog Template (keep with every merge)
```
Feature: <name>
Scope: <module>
Policies: <rego paths/tags>
Receipts: <actions covered>
Perf: <p95 delta, rps>
Security: <SBOM/SLSA status>
Docs: <runbooks/handbooks updated>
Cost: <COGS delta, metering keys>
```

