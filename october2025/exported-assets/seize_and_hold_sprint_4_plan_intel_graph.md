# 🛡️ Seize and Hold — Sprint 4 (Day 43–56)

**Start:** 2025‑11‑13  
**Duration:** 14 days  
**Prime Directive:** Convert GA‑ready platform into **production programs with paying tenants**. Operational excellence, commercial readiness, and last‑mile controls. We build **on** Sprints 1–3; no duplication.

---
## Non‑Dup Boundary
Already delivered or in‑flight (do **not** rebuild): provenance/attestation core, authority lifecycle & OPA packs, ER‑XAI v3 with decay, Disclosure Bundler + reply/e‑filing, GraphRAG reliability + planner v3 + caches, FinOps guards, streaming/CDC connectors, offline kits + DR, multi‑region A/A + isolation proofs, chaos GameDays, SOC‑lite & auditor UX, partner adapters, SDKs.

---
## Sprint Objectives
1) **Customer‑Zero to Production:** migrate two pilot tenants to production with SLAs, budgets, and support lanes.  
2) **Commercial Readiness:** billing, entitlements, usage metering, and plan enforcement.  
3) **Security Close‑Out:** pentest fixes, key rotation SOPs, secrets hygiene, SBOM + supply‑chain attestations.  
4) **Compliance Lift:** audit evidence packs, privacy budget governance, data residency controls.  
5) **Operational Calm:** change management, release trains, and noise‑free alerting.

---
## Workstreams

### WS‑1 — Tenant Migration & Cutover Playbooks
**Lead:** @ops‑audit • **Areas:** `deploy/`, `RUNBOOKS/`, `apps/web/`
- [ ] Customer‑Zero migration runbook (staging → prod) with rollback and data diff checks.  
- [ ] Per‑tenant SLO contract application (budgets, rate caps, export classes).  
- [ ] Go‑live checklist + war‑room script; exec comms template.  
- **DoD:** Two tenants live; cutover <2h; diff checks clean; rollback rehearsed.

### WS‑2 — Billing, Entitlements, and Usage Metering
**Lead:** @finops • **Areas:** `gateway/`, `billing/`, `finops/`, `docs/`
- [ ] Metering events (ingest, graph reads by hop, copilot tokens, export packs).  
- [ ] Plan definitions (Essentials/Pro/Gov) with feature flags and hard caps.  
- [ ] Billing adapter (mock + one real provider); invoice artifacts stored in prov‑ledger.  
- **DoD:** Invoices generated for two tenants; plan caps enforced with humane errors; revenue dashboard live.

### WS‑3 — Security Close‑Out & Supply Chain
**Lead:** @redteam • **Areas:** `security/`, `ci/`, `docs/`
- [ ] Pentest remediation backlog burned down; proofs in `SECURITY.md`.  
- [ ] **SBOM** generation + dependency allowlist; signature verification on build (SLSA‑lite).  
- [ ] Key rotation SOPs (KMS) + sealed‑secret rotation for field kits.  
- **DoD:** All critical/high findings closed; signed build artifacts; rotation drill executed with attestations.

### WS‑4 — Data Residency & Retention Enforcement
**Lead:** @policy‑czar • **Areas:** `governance/`, `gateway/`, `storage/`, `opa/`
- [ ] Region‑scoped storage policies + residency stamps on objects.  
- [ ] Retention engines (legal hold, purge timers) with audit proofs.  
- [ ] Residency breach detector + quarantine with export blockers.  
- **DoD:** Residency tests pass (EU↔US segregation); retention timer enforces deletes; audits exportable.

### WS‑5 — Privacy Budget Ops & Auditor Packs
**Lead:** @ops‑audit • **Areas:** `analytics/`, `governance/`, `docs/`
- [ ] Per‑analyst privacy budget dashboards (k‑anon + DP spend).  
- [ ] Auditor Evidence Pack: provenance bundle + policy hashes + privacy ledger excerpts.  
- [ ] Quarterly access‑review workflow + attestations.  
- **DoD:** Auditor persona reconstructs a case from packs alone; access review artifacts generated.

### WS‑6 — Change Management & Release Trains
**Lead:** @sre‑hawk • **Areas:** `ci/`, `deploy/`, `RUNBOOKS/`
- [ ] 2‑week release train with branch protection, canaries, and automatic rollback.  
- [ ] Feature flags and config gating with kill‑switches and audit trails.  
- [ ] Release notes generator tied to DoD + artifacts.  
- **DoD:** Two trains ship; one rollback executed successfully; notes published with links to receipts.

### WS‑7 — Observability v2 (Noise‑Free)
**Lead:** @sre‑hawk • **Areas:** `alerts/`, `grafana/`, `gateway/`
- [ ] Alert taxonomy and SLO‑based alerting; dedupe + silence policies.  
- [ ] Trace sampling on hot paths; exemplar traces stored for 30d.  
- [ ] On‑call UX revamp: runbook deep‑links; “fix‑forward” hints.  
- **DoD:** Alert noise down ≥60%; MTTA <5m; on‑call survey ≥4/5.

### WS‑8 — Casework Templates v2 & Training
**Lead:** @brief‑smith • **Areas:** `apps/web/`, `docs/`, `examples/`
- [ ] Template pack expansion (public integrity, harms, due diligence + cross‑border variants).  
- [ ] Training scenarios with deterministic fixtures and auto‑grading.  
- [ ] Evidence completeness meter v2 (policy‑aware).  
- **DoD:** Three case types complete 20% faster vs Sprint‑3; training auto‑grader passes in CI.

### WS‑9 — Cost & Capacity Hardening
**Lead:** @finops • **Areas:** `graph-service/`, `cache/`, `finops/`
- [ ] Capacity model per tenant and region; burst quotas + graceful degradation.  
- [ ] Hot‑path profiling; remove N+1s; pin slow queries with planner hints.  
- [ ] Storage tiering (hot/warm/cold) with cost dashboards.  
- **DoD:** p95 graph read −10% vs Sprint‑3; storage $/GiB down 15% without SLO regressions.

### WS‑10 — Partnerization & Marketplace Readiness
**Lead:** @ingest‑warden • **Areas:** `connectors/`, `exports/`, `contracts/`
- [ ] Partner adapters promoted to “supported”; contract tests + license proofs.  
- [ ] Marketplace listing materials: security posture, DPAs, ToS, SLAs.  
- [ ] Reference architectures and ROI calculators.  
- **DoD:** Two partners listed; reference deals desk kit approved.

---
## Cross‑Cut Deliverables
- **C1. Customer‑Zero Postmortems** (cutover + week‑1 ops).  
- **C2. Security Attestation Pack** (SBOM, signed builds, rotation receipts, pentest close‑out).  
- **C3. Compliance Binder** (residency, retention, privacy budgets, access reviews).  
- **C4. Revenue & Cost Board** (MRR, ARPU, infra $ by tenant, top queries).  
- **C5. Release Train Evidence** (notes, canaries, rollbacks, success rates).

---
## Schedule & Cadence
- **D43–D45:** Tenant migration rehearsal, billing wiring, pentest fixes prioritized.  
- **D46–D50:** Go‑lives, residency/retention enforcement, privacy dashboards, release train #1.  
- **D51–D54:** Noise‑free alerting, capacity tuning, training scenarios, marketplace materials.  
- **D55–D56:** Hardening, audits, postmortems, evidence packs, board review.

---
## Acceptance Gates (Exit)
- ✅ Two tenants live with SLAs and invoices; budgets enforced.  
- ✅ All critical/high security findings closed; signed build + SBOM artifacts stored.  
- ✅ Residency/retention tests pass; auditor reconstructs a case using packs.  
- ✅ Alert noise −60%; MTTA <5m; p95 read −10% vs Sprint‑3.  
- ✅ Release trains active with one clean rollback; notes + receipts published.  
- ✅ Marketplace readiness: two partners listed with compliant flows.

---
## Risks & Mitigations
- **Cutover instability** → rehearsal + traffic shadowing + reversible steps.  
- **Billing disputes** → human‑readable metering events + receipts in ledger.  
- **Residency edge cases** → aggressive default‑deny + quarantine + ombuds appeal.  
- **Alert fatigue** → taxonomy + SLO‑first alerts + dedupe/silence rules.  
- **Capacity cliffs** → quotas + graceful degradation + autoscale tuned from telemetry.

**Hold the ground. Cash the checks. Leave receipts for every decision.**

