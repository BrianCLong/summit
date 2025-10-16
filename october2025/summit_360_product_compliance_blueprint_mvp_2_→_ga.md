# SUMMIT / IntelGraph — 360° Product & Compliance Blueprint

**Author:** I. Foster Dullness, LL.M. (GC/CLO)  
**Date:** 2025‑09‑30  
**Scope:** Comprehensive PRD + technical & governance specs for **MVP‑2** and **GA** based on current repo state and golden path.  
**Audience:** Execs, Product, Eng, Sec/Compliance, BD/GovRel, Ops.

---

## 0) Executive Summary

**Mission:** Ship a deployable‑first, AI‑augmented intelligence analysis platform blending graph analytics, real‑time collaboration, and enterprise‑grade security. Convert law and policy into force multipliers (procurement‑ready, accreditable, contract‑safe).

**Where we are (high level):**

- Core platform bootstraps locally with Docker; client at 3000, GraphQL at 4000, Neo4j at 7474; golden path: **Investigation → Entities → Relationships → Copilot → Results**.
- MVP‑0/1 indicate working auth (JWT/RBAC/OPA), graph stack (Neo4j + Postgres/pgvector + Timescale + Redis), React/MUI frontend, GraphQL backend, AI copilot orchestration, ingest (CSV + STIX/TAXII), observability plumbing, and security hardening basics.
- Repo surface shows foundations for governance/security, CI/CD, e2e tests, feature flags, dashboards, data pipelines, and multi‑service architecture.

**Gap summary (deal‑blockers for enterprise):**

- **Identity/Zero‑Trust:** Need SAML/OIDC, SCIM, device posture, and per‑tenant policy guardrails (OPA → enforceable ABAC across API + UI).
- **Data Governance:** Clear SoR/SoT boundaries; data classification, lineage, retention/expunge, redaction, and DSAR workflows.
- **Security & Supply Chain:** SBOM/SLSA, Sigstore/Provenance, secrets mgmt rotation, KMS envelopes, service‑to‑service mTLS, hardened baselines.
- **Multi‑Tenancy & Isolation:** Namespacing and tenant resource quotas; compute & data isolation for on‑prem/gov enclaves.
- **Accreditation Readiness:** Control mapping (NIST 800‑53/800‑171/CSF), FedRAMP/FISMA path, CJIS/SOC 2 Type II evidence.
- **Commercial Readiness:** Pricing/packaging, support tiers/SLAs, legal paper (MSA+DPA+SCCs), export controls, OSS licensing hygiene.

**What we ship next:**

- **MVP‑2 (90‑day window):** Enterprise identity (OIDC/SAML) with SCIM; harden RBAC→ABAC; tenant isolation v1; audit log v1; persisted GraphQL queries; AI copilot guardrails; structured redaction; SBOM + dependency allowlists; baseline SLOs.
- **GA (next major):** Multi‑tenant GA; full Gov/Enterprise posture (SC‑7/SC‑13/SC‑28 class controls), DR/BCP, data lifecycle controls (retention/hold/expunge), certification track start (SOC 2 Type I → Type II), procurement kits, and reference architectures (SaaS, single‑tenant, air‑gapped).

---

## 1) Product Definition

### 1.1 Problem & Users

- **Analysts/Investigators** (Intel, LE, fraud, insider risk) need to ingest multi‑modal data, model entities/relationships, and generate explainable insights quickly.
- **Leads/Commanders** need collaboration, provenance, and auditability to defend decisions.
- **Platform Owners** need deployable‑first operations with verifiable security/compliance to pass reviews.

### 1.2 Value Proposition

- **Speed + Explainability:** Graph‑native analysis and AI assistance with traceable provenance.
- **Deployable‑first:** Minimal ops friction; golden‑path demo, smoke tests, and runbooks.
- **Compliance‑ready:** Controls mapped to common frameworks; evidence captured from day one.

### 1.3 Key Use Cases

1. Case creation → entity extraction from documents/media → link analysis → narrative/case file export.
2. Fusion center ingest (STIX/TAXII) → de‑dupe/entities merge → cross‑modal similarity → alert triage.
3. Counter‑fraud: transaction graph + vector search → anomaly detections → what‑if and paths.

---

## 2) Current State (technical)

### 2.1 Architecture (observed)

- **Frontend:** React 18 + MUI, Redux Toolkit/RTKQ, Cytoscape.js.
- **API:** Node 20 TS, Apollo GraphQL v4, Express, Socket.io.
- **Data:** Neo4j 5 (graph), Postgres 16 (+pgvector), TimescaleDB 2, Redis 7.
- **Infra:** Docker/Compose, NGINX (prod), GitHub Actions CI, OpenTelemetry + Prometheus + Grafana.
- **AI:** Copilot orchestration; CV (YOLO/MTCNN/Tesseract), Whisper STT, spaCy NER, sentence‑transformers; vector search; cross‑modal matching.
- **Security (baseline):** JWT + RBAC + OPA policies; persisted queries (partial); tenant isolation groundwork; audit logging hints; rate limiting.

### 2.2 Maturity & Gaps

- **Strengths:** Bootable demo; rich analytics; tests/e2e framings; observability present; golden‑path UX defined.
- **Gaps:** Identity federation; SCIM; audit log normalization; key mgmt & envelope encryption; FGA/ABAC; multi‑tenant isolation; data lifecycle; supply‑chain attestations; DR/BCP; policy guardrails for AI.

---

## 3) North‑Star Principles

1. **Deployable‑First:** `make up`/`make smoke` remain sacrosanct, incl. post‑MVP.
2. **Guardrailed Intelligence:** AI features operate under enforceable policy (OPA) and produce explainable, exportable artifacts.
3. **Assured Compliance:** Controls engineered in (not bolted on) with evidence capture.

---

## 4) MVP‑2 — PRD (Product Requirements Document)

### 4.1 Goals

- Unlock enterprise pilots by delivering identity federation, tenant isolation v1, auditability, and supply‑chain attestations—without compromising deployable‑first ergonomics.

### 4.2 In‑Scope

- **Identity & Access**
  - OIDC (Auth0/Okta/Entra ID) + SAML 2.0 for web SSO.
  - **SCIM v2** user/group sync.
  - RBAC→**ABAC**: policy evaluation via OPA (Rego) across GraphQL resolvers & UI routes.
  - Device posture hooks for session risk (optional, header‑based).
- **Tenant Isolation v1**
  - TenantID namespace in DBs (Neo4j label prefixes; Postgres schemas) and cache keys.
  - Data egress guards (query‑time predicates; persisted queries per‑tenant).
  - Rate limits/quotas per tenant.
- **Audit & Provenance v1**
  - Unified audit log schema (actor, subject, verb, object, reason, correlationId, result).
  - Log sinks: Postgres table + file shipper; retention config.
  - Analyst actions & AI copilot prompts/responses hashed with content digests.
- **Security & Supply Chain**
  - **SBOM** (Syft) per image; **dependency allowlist** + Renovate.
  - **Sigstore cosign** image signing; **SLSA provenance** via GitHub Actions.
  - Secrets via docker‑compose `secrets` + AWS KMS/GCP KMS envelope option.
  - mTLS between API↔workers (compose profile) and JWT audience scoping.
- **AI Guardrails**
  - Prompt template registry with owners/review; allow/deny patterns; PII redaction pre‑send; provenance capture of model/params/inputs.
- **Data Governance v1**
  - Data classification enum (PUBLIC/INT/CONF/SECRET) at collection/table and entity level.
  - Field‑level redaction policies; export scrubbers; DSAR search endpoint.
  - Retention policy config per tenant; legal hold flags.
- **Observability & SLOs**
  - SLOs: API p95<300ms @ 99% uptime (single‑node), ingestion E2E <5m p95 (demo loads).
  - Golden‑path smoke: scripted case from ingest→insight in <3m wall‑clock.

### 4.3 Out‑of‑Scope (MVP‑2)

- Cross‑region DR, HSMs, air‑gap build chain, FedRAMP audit, mobile apps, marketplace billing.

### 4.4 Users & Stories (samples)

- _As a Security Admin_, I can connect Okta (OIDC) and map Groups→Roles/Attributes to enforce ABAC across API and UI.
- _As a Tenant Admin_, I can export cryptographically hashed audit trails for any case.
- _As an Analyst_, my AI requests scrub PII by policy and record provenance automatically.
- _As a Compliance Officer_, I can set retention and legal holds per case or tenant.
- _As a Platform Owner_, I can verify signed images and SBOMs for every deploy.

### 4.5 Functional Requirements

- OIDC/SAML flows with refresh rotation; SCIM push/pull.
- OPA sidecar or library enforcing ABAC on GraphQL resolvers with request context (tenant, user, attributes).
- Persisted GraphQL queries with per‑tenant whitelists; deny ad‑hoc query on prod profiles.
- Unified audit log middleware (API, UI actions via event bus).
- AI policy engine (allow/deny, PII redaction, model allowlist, max‑cost per request).
- Redaction library supporting deterministic hashing (for re‑identification under lawful basis).
- SBOM publish to artifact registry; cosign verify in CI gate; provenance attestation attached.

### 4.6 Non‑Functional Requirements

- **Security:** mTLS, secrets rotation hooks, CSP/Headers, rate limits per token/tenant.
- **Reliability:** Health checks; graceful shutdown; backpressure on ingest; idempotent workers.
- **Performance:** Baseline SLOs above; index & caching plans for high‑fanout graph queries.
- **Usability:** Golden‑path demo complete; onboarding wizard for IdP/tenant setup.

### 4.7 Acceptance Criteria

- All user stories demoed in **one click** launch; smoke tests green.
- Independent security review of SBOM/signing; OPA policies peer‑reviewed; chaos test on tenant isolation (no cross‑tenant leakage).
- Evidence pack v1 (controls mapping; policies; runbooks) produced.

### 4.8 Architecture Changes (MVP‑2)

- **Auth Service** abstraction (Passport/Ory/NextAuth‑style) emitting identity claims used by OPA.
- **Policy Layer:** OPA sidecar + Rego bundles; GraphQL resolver guard.
- **Audit Pipeline:** Event bus → normalizer → sinks (DB/file).
- **Secrets/KMS:** Envelope encryption for at‑rest sensitive blobs; API for key rotation.
- **Compose Profiles:** `core` `ai` `kafka` `secure` (`secure` enables mTLS, cosign verify hooks).

### 4.9 Data Model Notes

- Add `tenant_id` and `data_classification` across entities/edges; per‑entity ACLs (attrs).
- Audit schema as described; AI provenance table; SCIM mirror tables.

### 4.10 Rollout Plan

- **Phase 0:** Feature flags; dark‑launch audit pipeline.
- **Phase 1:** Pilot tenants behind OIDC; SCIM dry‑run.
- **Phase 2:** Enforce persisted queries; enable mTLS; rotate secrets.
- **Phase 3:** Turn on redaction/retention policies; publish SBOM/signatures.

---

## 5) GA — PRD

### 5.1 Goals

- Enterprise/Gov readiness for broad deployments; evidence‑backed compliance; resilient operations; contractual readiness.

### 5.2 In‑Scope (GA)

- **Identity:** SAML/OIDC + SCIM GA; Just‑in‑Time (JIT) provisioning; device posture integration; fine‑grained ABAC and Relationship‑Based Access (ReBAC) on graph paths.
- **Multi‑Tenancy:** Hard isolation tiers (SaaS shared, single‑tenant, air‑gapped); per‑tenant KMS keys; compute quotas.
- **Security:** Network segmentation; **FIPS 140‑3** crypto options; **HSM** integration option; **Key rotation SLAs**.
- **Compliance:** SOC 2 Type I (ship) → Type II (begin), ISO 27001 readiness, CJIS profile, NIST 800‑53 moderate mapping; DPAs + SCCs.
- **Data Lifecycle:** Retention schedules; legal hold workflows; DSAR fulfillment; case export with scrub templates; audit trail tamper‑evident sealing.
- **Resilience:** RPO≤1h, RTO≤4h (SaaS tier); backup/restore tested; DR playbooks; chaos drills.
- **Admin UX:** Tenant admin center; policy editors (Rego bundle mgmt), export/import configurations.
- **AI Governance:** Model registry; evals & drift monitoring; cost guards; red‑team harness; explainability exports.

### 5.3 Out‑of‑Scope (GA)

- Formal FedRAMP ATO, marketplace listing, mobile native clients.

### 5.4 Acceptance Criteria (GA)

- Multi‑tenant isolation validated by external pen‑test; SOC 2 Type I report issued; DR game‑day pass; customer‑facing admin UX complete; procurement kit finalized.

---

## 6) Compliance, Legal, & Policy Stack

### 6.1 Contract Paper & Policies (ship with MVP‑2 drafts → GA finals)

- **MSA** (master terms) with limitation of liability cap; **AUP**, **SLA** (uptime/response), **Support Policy** (tiers), **Security Addendum** (controls), **DPA** (GDPR/CCPA/UK), **SCCs** (EU), **Gov Use Addendum** (FAR/DFARS flow‑downs), **Export Control Notice**.
- **Privacy Policy** & **Data Classification & Handling Standard**; **Retention & Deletion Policy**; **Incident Response Policy**; **Vulnerability Disclosure**.

### 6.2 Licensing & IP

- OSS under MIT (repo); ensure **third‑party license inventory** (sbom‑to‑license matrix), NOTICE file, and attribution in UI where required.
- Trademark scan for product name/marks; patent posture for novel graph‑AI orchestration.
- Contributor license mechanism (DCO or CLA) via bots.

### 6.3 Data Governance

- **Data Maps:** Identify SoR/SoT per subsystem; lineage via OpenLineage/OpenTelemetry.
- **Classification:** Default INTERNAL; elevate to CONFIDENTIAL/SECRET by policy; UI badges.
- **DSAR:** Search/export tooling; verified requester flow; 30‑day SLA.
- **Cross‑Border:** Regional data residency options; encryption at rest with per‑tenant keys.

### 6.4 Export Controls / Sanctions

- **EAR99/BIS** review for AI/crypto features; deny‑list screening for users/orgs; geo‑IP fences to comprehensively sanctioned jurisdictions; maintain export control matrix for models.

### 6.5 Accreditation Path (Gov)

- Control mapping to NIST 800‑53 rev5 (priority: AC, AU, IA, SC, SI, CM, CP).
- Evidence capture via runbooks, IaC repos, CI artifacts; establish SSP skeleton; POA&M template.

---

## 7) Security Architecture & Threat Model

### 7.1 Principles

- Least privilege; trust boundaries documented; cryptographic agility; assume compromise; tamper‑evident logs.

### 7.2 STRIDE Highlights (select)

- **S**poofing: OIDC/SAML + mTLS; key pinning; device posture.
- **T**ampering: Signed images, WORM audit storage option, checksum on exports.
- **R**epudiation: Normalized audit + time‑sync; non‑repudiation via signature sealing option.
- **I**nfo Disclosure: ABAC, field‑level redaction, envelope encryption, persisted queries.
- **D**oS: Quotas/rate limits per tenant; bulkhead queues; circuit breakers.
- **E**levation: Rego policy tests; 4‑eyes on admin policy changes; immutable history for role grants.

### 7.3 Controls & Tooling

- **Identity:** OIDC/SAML/SCIM, JIT.
- **Secrets:** Vault/KMS or cloud KMS with rotation hooks.
- **Supply Chain:** SBOM (Syft), cosign, SLSA attestation, Dependabot/Renovate.
- **Runtime:** Read‑only filesystems, non‑root containers, seccomp/profiles, mTLS.
- **Telemetry:** OTel spans for P0 paths; PII‑safe logs; security analytics dashboards.

---

## 8) Engineering Plan

### 8.1 Workstreams (MVP‑2)

1. **Identity & SCIM** (API, UI, docs)
2. **OPA/ABAC Integration** (policies, tests, admin UX)
3. **Audit & Provenance** (schema, middleware, sinks)
4. **Tenant Isolation v1** (namespacing, persisted queries, quotas)
5. **Supply‑Chain Hardening** (SBOM, signing, SLSA, secrets)
6. **Data Governance v1** (classification, redaction, retention)
7. **Observability & SLOs** (dashboards, synthetic checks)
8. **Docs & Procurement Kit v1** (runbooks, security overview, control matrix)

### 8.2 Milestones & Exit Criteria

- **M0 (Week 2):** OIDC sign‑in working; SBOM generated; audit schema merged.
- **M1 (Week 4):** SCIM sync; OPA gate on top 5 resolvers; persisted queries for golden‑path.
- **M2 (Week 6):** Tenant isolation complete; mTLS on secure profile; redaction lib.
- **M3 (Week 8):** Audit & AI provenance; SLO dashboards; chaos test pass.
- **M4 (Week 10‑12):** Pilot sign‑offs; evidence pack; procurement kit v1.

### 8.3 Dependencies & Risks

- IdP availability; OPA policy complexity; graph query performance under ABAC; developer friction from persisted queries; SBOM false positives; data migration for tenant_id backfill.

---

## 9) Operations & Runbooks

- **Environments:** `dev` `staging` `prod` (plus `secure` profile).
- **CI/CD Gates:** unit/integ/e2e; cosign verify; SBOM diff; secret scan; policy tests.
- **Incident Response:** P1/P2/P3 definitions; paging; RCA template; customer comms playbook.
- **Backups:** Postgres/Neo4j/Redis cron; restore drills quarterly.
- **Observability:** Golden‑path synthetic every 5 min; SLO error budget policy.

---

## 10) Pricing, Packaging, & Support (draft)

- **Tiers:** Community (MIT, self‑host), Team, Enterprise, Gov.
- **Metering:** Seats, AI consumption (tokens/mins), compute/storage.
- **SLAs:** Response/restore times aligned to tier; named TAM for Enterprise/Gov.
- **Support:** Knowledge base, email/ticket, optional on‑site.

---

## 11) Metrics & Success Criteria

- **Product:** Time‑to‑Insight (ingest→first insight), saved analyst hours/case, case resolution rate.
- **Reliability:** SLO adherence, incident count/MTTR.
- **Security/Compliance:** SBOM coverage, policy test pass‑rate, audit completeness, SOC 2 readiness checklist score.
- **Growth:** Pilot→paid conversion, active tenants, net retention.

---

## 12) Deliverables Checklist

- [ ] IdP integration (OIDC/SAML) + SCIM docs & wizard.
- [ ] OPA policies + test suite + policy bundle pipeline.
- [ ] Tenant isolation v1 implemented & load‑tested.
- [ ] Unified audit + AI provenance shipped.
- [ ] SBOM + cosign + SLSA provenance in CI.
- [ ] Redaction/retention + DSAR search endpoint.
- [ ] SLO dashboards + synthetics.
- [ ] Procurement kit v1 (security overview, control mapping, runbooks, MSAs/DPAs).
- [ ] Admin center basics (tenant config, policy view, exports).
- [ ] Evidence pack v1 (SOC 2 Type I prep; NIST 800‑53 mapping skeleton).

---

## 13) Appendices

### A) Control Mapping Starters (excerpt)

- **AC‑2/AC‑3/AC‑6:** OIDC/SAML/SCIM, ABAC enforcement (OPA), least privilege.
- **AU‑2/AU‑6:** Unified audit, retention, log reviews.
- **SC‑7:** Network segmentation; mTLS.
- **SC‑12/SC‑13:** Key mgmt, crypto options, KMS.
- **SC‑28:** Encryption at rest (envelope).
- **CP‑9/CP‑10:** Backups/DR.
- **CM‑6:** Baseline configs; image signing; SBOM.

### B) Open Questions

- Preferred IdP targets for first integrations?
- Gov enclaves: IL‑2/IL‑4 target?
- Data residency requirements by early design partners?
- Priority models/providers list for AI copilot allowlist?

### C) Glossary

- **ABAC:** Attribute‑Based Access Control.
- **OPA:** Open Policy Agent.
- **SBOM:** Software Bill of Materials.
- **SLSA:** Supply‑chain Levels for Software Artifacts.
- **DSAR:** Data Subject Access Request.
- **SoR/SoT:** System of Record/Truth.
- **ReBAC:** Relationship‑Based Access Control.
