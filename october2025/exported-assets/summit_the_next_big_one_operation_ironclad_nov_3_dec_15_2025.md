# [MODE: WHITE+BLUE+PURPLE+GOLD] Summit — The Next Big One (Operation **IRONCLAD**) — Nov 3–Dec 15, 2025

**Classification:** Internal // Need-to-Know  
**Mission:** Scale from tactical sprints to **org-wide, durable security and resilience** without duplicating Sprint #1–#2 deliverables. Build moats: identity, telemetry, detections, governance, and business continuity — with proof-carrying artifacts.

> **Guardrails:** No rewrites. Extend artifacts from Sprints #1–#2 (OPA gates, Sigma packs, SBOM/ASBOM, RUNBOOKS, evidence automation, telemetry schemas, PURPLE plans). New work must reference prior paths.

---

## A) Executive Summary (Decisions & Next Steps)
- **Zero Trust to Production**: Phishing-resistant MFA everywhere that matters, JIT admin + session-bound secrets, policy-enforced.
- **Telemetry Lake v2**: Canonical schema, lineage, cost controls, and coverage ≥ 98% for critical sources.
- **Detection-as-Code Factory**: Rule lifecycle, CI tests, suppression governance, and purple-driven backlogs.
- **Continuity & Recovery**: Tiered RTO/RPO, cross-region restore drills, and exec-ready comms playbooks.
- **FinIntel & Vendor Exposure**: Lightweight, lawful OSINT checks and contract controls for critical SaaS/cloud.

**Timebox:** 6 weeks. **Milestones:** Week 2 (identity gates live), Week 4 (telemetry + rule factory GA), Week 6 (BCP validated, attested release).

---

## B) Objectives & Key Results (OKRs)
- **O1 — Identity as a moat**: 100% admin WebAuthn; ≤2h elevated sessions; 0 classic tokens in CI; attestations for every prod deploy.
- **O2 — Telemetry as truth**: Critical feeds 98%+ coverage; ≤120s ingest lag P95; schema adoption 100% for new detections.
- **O3 — Signal over noise**: FP rate ↓50% vs Sprint #2; mean alert triage ≤7m; coverage mapped to ATT&CK ≥90% of relevant TTPs.
- **O4 — Recovery you can bet on**: RTO ≤ 4h (Tier-1), RPO ≤15m; cross-region restore passes twice; runbooks signed.
- **O5 — Vendor/FinIntel hygiene**: All Tier-1 vendors with SLA+security appendix; quarterly OSINT exposure review filed.

---

## C) Workstreams (No-Duplication, Extend-Only)
### WS1 — Zero Trust Identity & Access
**Lead:** IAM Eng • **Days:** 1–14
- **W1.1 Universal WebAuthn enforcement** for engineering orgs (cloud, SCM, CI/CD, admin consoles).  
  *Artifacts*: extend `controls/opa/abac.rego` with device-bound and geo/time constraints; tests in `controls/opa/tests/`.
- **W1.2 JIT Privilege & Session Boundaries**: elevation via ticket+owner, max 120m, auto-revoke+evidence in `.evidence/identity/`.
- **W1.3 Secrets Hardening**: ephemeral creds in CI; block classic PATs; rotate KMS keys; add `RUNBOOKS/rotate-keys.md`.
- **DoD:** 100% admins on WebAuthn; zero classic PATs; elevation logs complete with signer and hash.

### WS2 — Telemetry Lake v2 (Schema, Health, Cost)
**Lead:** SRE/Data • **Days:** 3–24
- **W2.1 Canonical Schema**: extend `analytics/schemas/common.json` → `common.v2.json` (actor, session, device, geo, severity, trace_id, data_class).
- **W2.2 Health & Cost**: dashboards for ingestion lag, drop %, parse success, and per-source ingestion cost; budgets with alerts.
- **W2.3 Coverage Map GA**: `analytics/coverage.json` drives panels linking **controls ↔ rules ↔ sources**; red/amber/green.
- **DoD:** 98%+ coverage, ≤120s lag, cost dashboards online; schema v2 used by all new rules.

### WS3 — Detection-as-Code Factory (Sigma v3 + Lifecycle)
**Lead:** Detection Eng • **Days:** 5–30
- **W3.1 Rule Lifecycle**: `alerting/policies/lifecycle.yaml` for propose→review→test→deploy→retire; CODEOWNERS + CI blocks.
- **W3.2 Sigma v3 Focus**:
  - `idp.session_anomaly.webauthn_bypass.yml`
  - `cloud.iam.role_chaining_depth.yml`
  - `artifact.repo.package_typosquat.yml`
  - `data.egress.unexpected_dataset_pull.yml`
  - `endpoint.cred_dumping.cross_process.yml`
- **W3.3 Auto-Tests & Datasets**: synthetic event generators under `alerting/tests/` used in CI; baseline FP datasets.
- **W3.4 Suppression Governance 2.0**: expiry + owner + justification required; CI fails on missing expiry or >30d mutes.
- **DoD:** FP ↓50% vs Sprint #2; review SLAs met; synthetic tests green; coverage ≥90% ATT&CK-relevant.

### WS4 — Business Continuity & Chaos (BCP + GameDays)
**Lead:** SRE/IR • **Days:** 10–35
- **W4.1 Tiered BCP**: classify services (T1/T2/T3) with RTO/RPO; store in `RUNBOOKS/bcp-matrix.md`.
- **W4.2 Cross-Region Restore**: scripted in `tools/restore/*`; 2 drills with timing, hash, and signer evidence.
- **W4.3 Chaos Playbook**: IdP outage + storage throttle + message queue backlog combined scenarios; publish `analytics/mttr.json`.
- **DoD:** Two successful cross-region restores (T1); PAR with residual risks; exec comms templates filled.

### WS5 — Compliance & Evidence Automation v2
**Lead:** GRC/AppSec • **Days:** 8–28
- **W5.1 Release Attestations GA**: auto-generate `audit/attestations/<release>.json` (controls, SBOM hash, signers, mitigations).
- **W5.2 SBOM Drift & License Gate**: block release on license risk; auto-Issue w/ owner; exceptions time-bound.
- **W5.3 Evidence CLI Enhancements**: `tools/evidence` adds bulk hash/sign, S3/GCS backend, and manifest diffs.
- **DoD:** 100% releases attested; drift gates active; evidence manifests published per release.

### WS6 — GOLD: Vendor & FinIntel (Lawful OSINT, Defensive)
**Lead:** FinIntel • **Days:** 12–36
- **W6.1 Tier-1 Vendor Controls**: add `vendor/controls.yaml` (MFA, SSO, logs export, breach SLA, data residency).
- **W6.2 OSINT Exposure Review**: `intel/vendor-osint.md` with passive checks (breach mentions, leaked tokens patterns, typosquat domains). No intrusive activity.
- **W6.3 Contract Riders**: security appendix templates in `legal/templates/security-addendum.md` (log export, RPO/RTO, breach windows).
- **DoD:** All Tier-1 vendors assessed; riders drafted; issues opened for gaps.

### WS7 — PURPLE: Campaign Emulation & Coverage
**Lead:** CTI/PURPLE • **Days:** 15–38
- **W7.1 Campaign Packs**: `PURPLE/campaigns/<name>/plan.md` for: CI takeover via OIDC misbind; VC-token abuse; data exfil via build caches.
- **W7.2 Dry-Run & Measures**: synthetic-only; record declare≤10m, contain≤60m; feed deltas to WS3.
- **W7.3 Coverage Heatmap**: ATT&CK sub-technique coverage panel tied to `analytics/coverage.json`.
- **DoD:** Three PARs; ≥90% sub-technique coverage green; new rules merged.

---

## D) Backlog (Create Issues & Link to Project: **IRONCLAD Q4-2025**)
1. WebAuthn enforcement expansion (cloud/SCM/CI)
2. JIT elevation v2 (session-bound + geo/time + ticket)
3. CI ephemeral credentials + PAT block
4. Schema v2 + ingestion/cost dashboards
5. Coverage map GA (controls↔rules↔sources)
6. Rule lifecycle policy + CI
7. Sigma v3 (5 rules) + synthetic datasets
8. Suppression governance 2.0
9. Tiered BCP matrix + restore scripts
10. Cross-region drills (2) + PARs
11. Chaos combo scenarios + MTTR panels
12. Release attestation GA + exceptions policy
13. SBOM drift/license gate enforcement
14. Evidence CLI v2 (bulk + cloud backend)
15. Vendor controls catalog + OSINT review
16. Contract security addendum template
17. PURPLE campaigns (3) + coverage heatmap

---

## E) Artifacts to Ship (Paths)
- `controls/opa/{abac.rego,policies/*.rego}` + tests  
- `analytics/schemas/common.v2.json`, `analytics/dashboards/{ingest,cost,coverage}.json`  
- `alerting/policies/{lifecycle.yaml,suppression.yaml}`  
- `alerting/sigma/v3/*.yml`, `alerting/tests/*`  
- `RUNBOOKS/{bcp-matrix.md,rotate-keys.md}`  
- `tools/{evidence,restore}/*`  
- `audit/attestations/*.json`, `vendor/controls.yaml`  
- `intel/vendor-osint.md`, `legal/templates/security-addendum.md`  
- `PURPLE/campaigns/*`, `analytics/heatmaps/attack.json`

---

## F) Risks & Mitigations
- **Policy Gate Lockouts**: Break-glass with expiry + auto-revoke; evidence required.  
- **Telemetry Cost Spikes**: Budget alerts + sampling for non-critical sources.  
- **Alert Fatigue**: Lifecycle reviews, FP datasets, and strict suppression expiries.  
- **Drill Disruption**: Schedule windows; pre-brief execs; rollback plan in every drill.

---

## G) RACI
- **A:** Security Lead  
- **R:** IAM, SRE, AppSec, Data Eng, IR, CTI  
- **C:** Legal, Privacy, Comms, Product  
- **I:** Exec Sponsor, Support

---

## H) Metrics (Exit Criteria)
- Admin WebAuthn = **100%**; elevated sessions **≤2h**; classic PATs **0**  
- Critical telemetry coverage **≥98%**; ingest lag P95 **≤120s**  
- FP rate **↓50%** vs Sprint #2; triage time **≤7m**  
- RTO (T1) **≤4h**; RPO **≤15m**; **2×** cross-region restore passes  
- All releases **attested**; vendor Tier-1 **100%** reviewed with riders issued

---

## I) Proof-Carrying Analysis (PCA)
**Assumptions:** Sprint #1 and #2 artifacts exist and are functional; we extend them only. No intrusive OSINT; lawful/public sources only. Synthetic-only for PURPLE.  
**Evidence:** Prior sprint artifacts (OPA gates, Sigma packs, telemetry schema, evidence tooling), repo structure, and standard frameworks (NIST/ISO/SOC2, MITRE ATT&CK).  
**Verification:** CI blocks: missing attestations; stale suppressions; schema non-compliance; PAT usage; coverage <98%; BCP drills not executed.  
**Open Questions:** Confirm Tier-1 vendor list; confirm T1/T2 service map; choose storage backend for evidence manifests.

---

## J) Timeline (Gantt-Style Blocks)
- **Week 1–2**: WS1, WS2 (schema & boards), WS3 (lifecycle)  
- **Week 3–4**: WS2 GA, WS3 v3 rules, WS5 automations  
- **Week 5–6**: WS4 drills, WS6 vendor/finintel, WS7 campaigns; close PARs & attestations

---

**B-E Aggressive. Prove it, ship it, attest it.**

