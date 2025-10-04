# [MODE: WHITE+BLUE+PURPLE+GOLD] Summit — Sprint (Operation **QUASAR**) — **Apr 19 → May 24, 2027**

**Classification:** Internal // Need-to-Know  
**Mission:** Convert IRIDIUM’s GA features into **zero‑touch, programmatic resilience**: autonomous rule lifecycle, LLM safety-hardening at scale, zero-standing-privilege verification, supply-chain assurance across partner ecosystems, and privacy-by-design telemetry — **extending** prior work only (no duplication).

> **Guardrails:** Extend existing paths only: `controls/opa/`, `alerting/`, `analytics/`, `RUNBOOKS/`, `.evidence/`, `tools/`, `audit/`, `sbom/`, `PURPLE/`, `data/`, `vendor/`, `legal/`, `ai-ml-suite/`. Synthetic-only PURPLE; lawful OSINT; no customer data.

---

## A) Executive Summary (Decisions & Next Steps)
- **Autonomous Rule Factory:** End-to-end pipeline for detections (propose→review→canary→GA→retire) with coverage/quality gates.
- **LLM Fleet Hardening:** Policy/config drift detection for LLM services; model/card provenance checks; safe-mode canaries.
- **ZSP Verification:** Continuous proofs that privileged paths have **no standing admin** and short-lived elevation with audit.
- **Partner Supply Chain:** Extend trusted publishing & verify-on-deploy to partner repos/registries; SBOM+VEX exchange.
- **Privacy Telemetry:** Purpose/retention signals embedded in events; privacy FP tuning and dashboards per tenant.

---

## B) Objectives & Key Results (OKRs)
- **O1 Rule Factory:** 100% new rules follow lifecycle; canary rollback **< 5m** P95; FP **↓ ≥ 10%** vs IRIDIUM.
- **O2 LLM Hardening:** Drift detector coverage **≥ 95%** of LLM configs; model/card provenance verified for **100%** LLM releases.
- **O3 ZSP Proofs:** Standing admin **= 0%** in prod (exceptions time‑bound); elevation P95 **≤ 40m**; evidence attached to 100% elevations.
- **O4 Partner Supply Chain:** 100% Tier‑1 partners on SBOM+VEX exchange; verify-on-deploy mandatory for partner artifacts; quarantine MTTR **< 10h**.
- **O5 Privacy Telemetry:** 100% new events carry `purpose` & `retention` fields; DLP FP **≤ 0.7%**; zero unsanctioned egress.

---

## C) Workstreams (Extend-Only)
### WS1 — Autonomous Rule Factory (Days 1–18)
**Leads:** Detection Eng + IR
- **W1.1 Lifecycle Policy:** `alerting/policies/lifecycle.yaml` adds canary cohorts, rollback hooks, owner SLAs, and deprecation windows.
- **W1.2 CI Generators:** `alerting/tests/generators/*` create synthetic datasets; PRs must pass coverage/quality checks.
- **W1.3 Canary System:** `tools/soar/` adds canary toggles & staged rollout; dashboard `analytics/dashboards/rule-factory.json`.
- **DoD:** Rules must pass quality gates; canary rollbacks observed <5m P95; FP ↓≥10%.

### WS2 — LLM Fleet Hardening (Days 1–16)
**Leads:** AI Eng + AppSec + Platform
- **W2.1 Drift Detection:** `ai-ml-suite/monitors/drift` for model, prompt, tool scopes, and output validators; alerts to low‑sev queue.
- **W2.2 Model/Card Provenance:** in‑toto attestations for model artifacts + model cards; verify in CI and on deploy.
- **W2.3 Safe-Mode Canaries:** Automatic fallbacks (restricted tools/output) on anomaly; runbooks updated.
- **DoD:** Drift coverage ≥95%; provenance verified 100% for LLM releases; canary fallback tested.

### WS3 — ZSP Continuous Verification (Days 2–14)
**Leads:** IAM + SRE
- **W3.1 ZSP OPA Checks:** `controls/opa/abac.rego` adds scheduled checks that deny standing admin; exceptions require ticket/owner/expiry.
- **W3.2 Elevation Evidence:** `.evidence/identity/elevation/*.json` auto‑generated with signer, reason, timebox.
- **W3.3 Dashboards:** `analytics/dashboards/zsp.json` showing standing admin = 0, elevation SLAs, break‑glass uses.
- **DoD:** Standing admin 0% in prod; elevations within 40m P95; evidence attached.

### WS4 — Partner Supply Chain Assurance (Days 3–18)
**Leads:** AppSec + FinIntel + Platform
- **W4.1 Partner Onboarding Kit:** `vendor/onboarding.md` for OIDC trusted publishing, SBOM+VEX requirements, and provenance.
- **W4.2 Verify-on-Deploy (Partners):** Enforce provenance checks for partner artifacts; quarantine on mismatch; drill runbook.
- **W4.3 Exchange Automation:** `tools/vex-gen` extended for ingest/export; link to releases in `audit/attestations/`.
- **DoD:** Tier‑1 partners exchanging SBOM+VEX; verify-on-deploy enforced; quarantine MTTR <10h.

### WS5 — Privacy-By-Design Telemetry (Days 2–16)
**Leads:** Data Eng + Privacy + Detection Eng
- **W5.1 Event Schema:** `analytics/schemas/common.v3.json` adds `purpose`, `retention`, `data_class`, `tenant_id`.
- **W5.2 CI Gates:** `controls/opa/privacy.residency.rego` requires fields in new events; PRs blocked if absent.
- **W5.3 DLP Tuning:** DLP v3.4 baselines per tenant; dashboards `analytics/dashboards/privacy-fp.json`.
- **DoD:** All new events carry privacy fields; DLP FP ≤0.7%; zero unsanctioned egress.

### WS6 — PURPLE Continuous (Days 1–24)
**Leads:** CTI/PURPLE
- **W6.1 Campaigns:** (A) Prompt‑injection → tool misuse → safe‑mode fallback; (B) session elevation abuse under ZSP; (C) partner artifact mismatch.
- **W6.2 Heatmaps:** Update `analytics/heatmaps/{attack,atlas}.json`; gaps → Issues same day.
- **DoD:** 3 PARs; coverage targets held; fixes merged.

---

## D) Backlog (Create Issues; Project: **QUASAR 2027-05**)
1. Rule lifecycle GA + generators + canary toggles
2. FP/quality gates + rollback hooks + dashboards
3. LLM drift monitors + model/card provenance attestations
4. Safe‑mode canaries + runbook updates
5. ZSP scheduled OPA checks + elevation evidence + dashboard
6. Partner onboarding kit + verify-on-deploy (partners)
7. SBOM+VEX ingest/export automation
8. Privacy schema v3 + CI gate + DLP v3.4 tuning
9. PURPLE campaigns + heatmap updates

---

## E) Artifacts to Ship (Paths)
- `alerting/policies/lifecycle.yaml`, `alerting/tests/generators/*`, `analytics/dashboards/rule-factory.json`
- `ai-ml-suite/monitors/drift/*`, `ai-ml-suite/model-cards/*`, `audit/attestations/in-toto/*.jsonl`
- `controls/opa/{abac.rego,privacy.residency.rego,policies/*.rego}` + tests
- `analytics/schemas/common.v3.json`, `analytics/dashboards/{zsp.json,privacy-fp.json}`
- `tools/{soar/*,vex-gen/*}` + tests
- `vendor/onboarding.md`, `audit/attestations/*.json`
- `.evidence/{identity,elevations,builds}/**`
- `PURPLE/campaigns/weekly-YYWW.md`, `analytics/heatmaps/{attack.json,atlas.json}`

---

## F) Risks & Mitigations
- **Rule churn & noise** → Canary cohorts, FP gates, staged rollout with rollback hooks.
- **LLM drift false alarms** → Low‑sev queue + canary fallback; adjust thresholds via dashboards.
- **Partner variance** → Clear onboarding kit; exceptions time‑bound with owner.
- **Telemetry friction** → CI hints & templates; monitored exceptions with expiry.

---

## G) RACI
- **A:** Security Lead  
- **R:** Detection Eng, IR, AI Eng, AppSec, SRE, Platform, Data Eng, GRC, CTI, FinIntel  
- **C:** Privacy, Legal, Comms, Product  
- **I:** Exec Sponsor, Support

---

## H) Metrics (Exit Criteria)
- Lifecycle compliance 100%; canary rollback <5m P95; FP ↓≥10%
- LLM drift coverage ≥95%; model/card provenance verified 100%
- Standing admin 0% in prod; elevation P95 ≤40m; evidence on 100% elevations
- Tier‑1 partners on SBOM+VEX; partner verify-on-deploy enforced; quarantine MTTR <10h
- 100% new events with privacy fields; DLP FP ≤0.7%; zero unsanctioned egress
- 3 PURPLE PARs; coverage ≥96% relevant

---

## I) Proof-Carrying Analysis (PCA)
**Assumptions:** IRIDIUM delivered LLM gates GA, session binding, trusted publishing + VEX, ATT&CK/ATLAS QA, and enriched attestations; QUASAR scales and automates without duplication.  
**Evidence:** CI outputs, OPA tests, drift monitor alerts, model/card attestations, partner SBOM+VEX exchanges, PARs, dashboards.  
**Verification:** CI blocks on lifecycle noncompliance, missing privacy fields, provenance gaps, standing admin, partner artifacts without proofs, or rule rollback failures.

---

**B‑E Aggressive — automate signal, prove posture, extend the moat.**

