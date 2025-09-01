# 🚦 GA Phase‑1 — Master Implementation Prompt for the Dev Team

**Audience:** Backend, Frontend, Data/Graph, Infra/SRE, and Security engineers; TPM; QA.

**Inputs (read first):**
- `MVP0_FINAL_VERIFICATION_REPORT.md`
- `GA_FOUNDATION_ROADMAP.md`
- `docs/ga/phase1-enterprise-hardening-spec.md`

**Mission (90 days):** Execute **Phase‑1: Enterprise Hardening** to take IntelGraph from production‑ready MVP to **enterprise‑grade GA core**. Deliver hardened security/governance, scale/performance at target loads, robust observability & SRE, and release discipline—without regressing the MVP “golden path” (ingest → ER → analyze → copilot → export).

---
## 0) Working Agreements
- **Cadence:** 2‑week sprints; daily stand‑ups; weekly demo; fortnightly retro.
- **Branching:** trunk‑based with short‑lived feature branches; feature flags for risky changes.
- **ADRs:** All impactful decisions recorded under `/docs/adr/ADR-####-title.md` (template provided below).
- **Testing bar:** Unit ≥80% on leaf logic; critical paths covered by integration/e2e; perf + chaos scheduled.
- **Security by default:** Least privilege, zero secrets in code, reproducible builds, SBOM on every artifact.

---
## 1) Phase‑1 Scope (Epics → Objectives → Key Deliverables)

### E1 — Security, Governance & Audit (OPA/ABAC, SSO, Audit)
**Objectives**
- Enforce **ABAC** globally at the service and query layers; externalize policies in **OPA** bundles.
- Implement **SSO (OIDC/JWKS)** with step‑up auth and WebAuthn/FIDO2 support.
- Achieve **comprehensive audit**: who/what/when/why, immutable, searchable.
- Add **Policy Simulation** (dry‑run impacts) and **Reason‑for‑Access** prompts.

**Key Deliverables**
- ABAC middleware + policy library; policy tags propagated at node/edge level.
- OIDC provider integration; SCIM user/squad sync; MFA + hardware keys.
- Audit event schema, ingestion to data lake; dashboards for anomalous access.
- `policy-sim` service with historical re‑play; deny‑explanations in UI.

**Acceptance Criteria**
- All read/write/compute paths pass ABAC checks; unit + e2e tests cover allow/deny.
- SSO login + step‑up works across web, API, and admin console.
- Audit queries answer: *who accessed what object, with which authority, for what reason* within 2s P95.
- Policy change dry‑run produces diffs and reviewer sign‑off gates.

---
### E2 — Scalability & Performance (1M+/10M+ scale)
**Objectives**
- Sustain **1M entities / 10M relationships** and 1000 concurrent users with P95 latencies under targets.
- Introduce **query budgets, rate limits, and kill‑switches** for cost/abuse control.
- Optimize **Neo4j/PG** storage & indexes; add **read replicas** and cache layers where appropriate.

**Key Deliverables**
- Data partitioning/labeling strategy; hot‑path indexes; write batching; GDS job queues.
- Query budgeter + slow‑query killer; per‑tenant limits and back‑pressure.
- Perf harness + datasets; nightly benchmarks; perf regression guard in CI.

**Acceptance Criteria**
- Baseline workloads meet/exceed SLOs (see §3) on staging; no red regressions allowed into `main`.
- Long‑running analytics isolated to async lanes; UI shows ETA and cancel.

---
### E3 — Observability & SRE (SLIs/SLOs, OTEL, Prometheus, Tracing)
**Objectives**
- End‑to‑end **OpenTelemetry** tracing; **/metrics** everywhere; structured logs.
- Ship **SLO dashboards** (latency, error rate, saturation, cost) + burn‑rate alerts.
- **Incident response** package: runbooks, paging policy, post‑mortems.

**Key Deliverables**
- OTEL SDK wired into all services; trace propagation across GraphQL, workers, and DBs.
- Prometheus scrape configs; Grafana dashboards; alert rules with multi‑window burn alerts.
- `runbooks/` for top‑10 failure modes; `incident/` templates.

**Acceptance Criteria**
- Each service exports ≥12 core metrics; distributed traces include tenant and policy tags (non‑PII).
- On synthetic outage, MTTA < 5m, MTTR < 30m on staging.

---
### E4 — Data Intake + ER Hardening
**Objectives**
- Harden connectors (STIX/TAXII, Kafka, CSV/Parquet, S3) with schema mapping and license/TOS enforcement.
- ER v1→v1.1: add explainability scorecards; human reconcile queues; bitemporal correctness.

**Key Deliverables**
- Ingest wizard enhancements: PII classification, DPIA checklist, redaction presets.
- License registry with enforcement policies; provenance preserved through transforms.
- ER scorecard panel in UI; reconcile queue with audit trail.

**Acceptance Criteria**
- Import 50GB mixed OSINT/CTI sample within 2h wall; zero policy violations; provenance chain intact.
- ER decisions reproducible; each merge shows features, confidence, and override history.

---
### E5 — Copilot Guardrails & Auditable AI
**Objectives**
- NL→Cypher **preview & sandbox**; **inline citations** for RAG; redaction‑aware retrieval.
- **Policy reasoner** explains denied actions; safe function calling.

**Key Deliverables**
- Copilot preview pane; approval gates; query cost estimates.
- Citation renderer with hover‑to‑source; PII/redaction hooks in retrieval.

**Acceptance Criteria**
- 100% of Copilot answers include citations; risky ops require explicit user approval.
- No cross‑tenant leakage in prompts, embeddings, or caches.

---
### E6 — Frontend UX Hardening
**Objectives**
- Keyboard‑first command palette; A11y AAA; tri‑pane sync (graph↔map↔timeline) and undo/redo history.
- “Explain this view” helper for novice analysts.

**Key Deliverables**
- Global shortcuts; focus management; screen‑reader labels; high‑contrast modes.
- Time‑brushing sync; diff views; non‑destructive history.

**Acceptance Criteria**
- A11y audits pass; keyboard‑only smoke flows; no trap focus; 0 contrast violations.

---
### E7 — DR/BCP & Cost Guard
**Objectives**
- PITR, cross‑region replicas, offline mode with CRDT merges.
- Storage tiering, archived partitions, and auto‑kill for pathological queries.

**Key Deliverables**
- Automated backups + verified restores; failover runbook; CRDT sync proof.
- Cost dashboard; archived tier policies; kill‑switch service.

**Acceptance Criteria**
- Disaster game‑day passes: RPO ≤ 5m, RTO ≤ 30m on staging.
- Cost per request within targets; no runaway jobs > N minutes without human opt‑in.

---
## 2) Milestones & Sprint Plan (12 weeks)
- **Sprint 1–2:** ADRs (security model, data partitioning, observability); SSO skeleton; OTEL baseline; perf harness + seed dataset; initial query budgeter.
- **Sprint 3–4:** ABAC end‑to‑end on read paths; audit pipeline; Grafana SLOs; DR backups; Copilot sandbox preview.
- **Sprint 5–6:** ABAC on write/compute; policy simulation; ER explainability + reconcile UI; cost guard; failover rehearsal #1.
- **Sprint 7–8:** Scale push (indexes, caches, read replicas); async analytics lanes; A11y uplift; chaos drill #1.
- **Sprint 9–10:** Frontend tri‑pane sync, undo/redo, command palette; incident runbooks; pen‑test hardening.
- **Sprint 11–12:** Freeze → RC; perf/chaos/DR proofs; GA Readiness Review; Go/No‑Go.

---
## 3) SLIs/SLOs (Phase‑1 Targets)
- **Query latency (P95):** short reads ≤ 500ms; 2‑hop neighborhood @100k nodes ≤ 1.5s; writes ≤ 250ms.
- **Availability:** 99.9% monthly on staging (synthetic).
- **Error budget:** 43m/mo; burn alerts at 2%/h and 5%/h.
- **Ingest throughput:** ≥ 2k rec/s sustained with back‑pressure and 0 data loss.
- **Security:** 100% ABAC enforcement coverage; 0 critical vulns open > 72h.

---
## 4) Engineering Readiness & Tooling
- **CI/CD:** parallel test matrix; perf tests as a mandatory job; SBOM + vuln scan; signed images.
- **Environments:** `dev` (docker‑compose), `staging` (k8s), `prod‑shadow` (pre‑GA dark). IaC tracked.
- **Feature Flags:** `flags/` library; kill‑switch path documented.
- **Data:** anonymized synthetic + replayable fixtures; provenance manifests for all samples.

---
## 5) PR Checklist (Definition of Done)
- [ ] Tests: unit/integration/e2e updated; perf impact measured; fixtures added.
- [ ] Security: threat model touched; secrets via vault; permissions reviewed.
- [ ] Observability: OTEL spans; `/metrics`; structured logs; dashboards updated.
- [ ] Docs: ADR (if needed); runbook/README; migration notes; feature flags.
- [ ] Rollout: canary plan; rollback verified; alerts added.

---
## 6) Test Strategy
- **Perf:** nightly k6/Gatling runs with trend analysis; fail build on regression >5%.
- **Chaos:** pod kill, DB failover, network partitions; success = graceful degrade + alert.
- **Security:** SAST/DAST; dependency scan; secrets scan; red‑team scripts for ABAC bypass attempt.
- **Data Correctness:** property‑based tests on ER and provenance chains; bitemporal snapshots.

---
## 7) Risks & Mitigations
- **Policy latency:** cache + pre‑eval for hot paths; async explainers.
- **Cross‑tenant leakage:** strict namespace separation; tenancy headers in traces; canary tests for isolation.
- **Runaway analytics:** quotas, kill‑switches, and UX confirmations; async lanes with progress.
- **Index churn:** blue/green index swaps; shadow builds; query plan regression checks.

---
## 8) Backlog Kickstart (Sample Stories)
- *AuthZ:* “As a case reviewer, I must provide a reason for access before viewing sensitive entities so that audit trails capture intent.”
- *Policy Sim:* “As an admin, I can dry‑run a policy change and see which users/queries would be affected before rollout.”
- *Copilot:* “As an analyst, I see citations for every answer and can open the source snippet in a side panel.”
- *ER:* “As an ER steward, I review merge candidates with scorecards and accept/reject with a justification.”
- *Observability:* “As SRE, I can trace a slow query from GraphQL to DB and identify the top 3 contributors.”
- *DR:* “As an operator, I can cut over to a replica within 30m with no data loss beyond RPO.”

---
## 9) Start Here (Local Dev)
1) Clone & bootstrap: `make bootstrap && make up`
2) Seed demo data: `make seed`
3) Run tests: `make test`
4) Run perf smoke: `make perf-smoke`
5) Bring up dashboards: `make observe`

> Replace `make …` with the repo’s actual targets if they differ; wire equivalents into CI.

---
## 10) ADR Template (paste into `/docs/adr/`)
```
# ADR-####: <Title>
## Context
## Decision
## Options Considered
## Consequences (Positive/Negative)
## Security/Privacy Considerations
## Observability/Operability Considerations
## Rollout/Backout Plan
```

---
## 11) Exit Criteria for Phase‑1 (Go/No‑Go)
- All SLOs green for 14 consecutive days on staging.
- Security audit + pen test with no criticals; all highs triaged and planned.
- DR game‑day passed; chaos drill passed; perf target dataset runs clean.
- GA Readiness Review sign‑off (Eng, Security, SRE, Product).

**Deliver. Demo. Document. Then GA.**

