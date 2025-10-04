# [MODE: WHITE+BLUE+PURPLE+GOLD] Summit — Sprint (Operation **STARFALL**) — **Jun 16 → Jul 19, 2026**

**Classification:** Internal // Need-to-Know  
**Mission:** Convert SKYHAMMER outcomes into **attested, scalable, and low-cost security operations**. Focus: SOC autonomy polish, cost/coverage optimization, data residency & encryption governance, SLSA L3+ enforcement with a path to L4, and external-audit rehearsal Type I → Type II — **without duplicating** earlier sprints. Extend only.

> **Guardrails:** Extend existing paths: `controls/opa/`, `alerting/`, `analytics/`, `RUNBOOKS/`, `.evidence/`, `tools/`, `audit/`, `sbom/`, `PURPLE/`, `data/`, `vendor/`, `legal/`. Synthetic-only PURPLE; lawful OSINT; no customer data.

---

## A) Executive Summary (Decisions & Next Steps)
- **SOC Autonomy vNext:** Reduce latency to sub-30s P95; add human-on-the-loop evidence and safe rollback proofs by default.
- **Cost × Coverage:** Normalize and prune telemetry to hit cost SLOs while maintaining ≥96% relevant ATT&CK coverage.
- **Data Residency & Encryption:** Enforce region/purpose tags, KMS key hygiene, and envelope encryption checks with OPA gates.
- **SLSA L3+ Enforcement:** Hermetic builds where feasible; provenance verification on deploy; quarantine on anomaly.
- **Audit Rehearsal (Type II path):** Timebox evidence collection, rotate samples, and stage an external-style walkthrough with action items.

---

## B) Objectives & Key Results (OKRs)
- **O1 Autonomy:** P95 auto‑containment **≤ 30s**; rollback success **≥ 99.5%**; analyst toil **↓ ≥ 20%** vs SKYHAMMER.
- **O2 Telemetry Cost:** Cost per 1k events **↓ ≥ 25%** with **coverage ≥ 96%** relevant TTPs; ingest lag P95 **≤ 90s**.
- **O3 Residency & Crypto:** 100% Restricted data tagged with `region` & `purpose`; encryption-in-transit+at-rest verified; KMS key rotations cadenced and attested.
- **O4 Supply‑Chain:** 100% T1 releases with in‑toto + SBOM; **≥ 50%** T1 builds hermetic; dependency quarantine <24h mean time to remediate.
- **O5 Audit Readiness:** Control matrix evidence complete; rehearsal PAR filed with **zero critical** findings outstanding.

---

## C) Workstreams (Extend-Only)
### WS1 — SOC Autonomy vNext (Days 1–14)
**Leads:** Detection Eng + IR
- **W1.1 Action Optimizations:** `tools/soar/` add parallelism caps, backoff, and dependency graph; measure end-to-end.
- **W1.2 Guardrails 2.1:** `alerting/policies/guardrails.yaml` include per-action blast-radius & cooldown; require rollback proof in `.evidence/soc/`.
- **W1.3 Playbook Tests:** Synthetic chaos during actions; require pass before GA.
- **DoD:** P95 ≤30s with rollback success ≥99.5%; proof artifacts attached.

### WS2 — Telemetry Cost × Coverage (Days 1–18)
**Leads:** SRE + Detection Eng
- **W2.1 Schema v2.1:** Prune low-value fields; compress & sample non-critical streams.
- **W2.2 Cost Panels:** `analytics/dashboards/cost.json` by source, rule, and action-path; budget alerts.
- **W2.3 Coverage Integrity:** Auto-check that rule preconditions still met post-pruning; red/amber/green heatmap.
- **DoD:** 25% cost reduction with ≥96% relevant coverage and ≤90s ingest lag P95.

### WS3 — Data Residency & Encryption Governance (Days 3–20)
**Leads:** Data Eng + Platform + Privacy
- **W3.1 Residency Policy:** `controls/opa/residency.rego` blocks Restricted data pipelines missing `region` or using unauthorized sinks.
- **W3.2 KMS Hygiene:** `tools/kms/audit` lists keys, rotation age, and grants; auto‑PR rotations; evidence in `.evidence/crypto/`.
- **W3.3 Envelope Checks:** CI test proves client-side encryption or envelope use for Restricted classes.
- **DoD:** 100% Restricted pipelines pass residency & encryption gates; rotations executed & attested.

### WS4 — SLSA L3+ with L4 Track (Days 5–20)
**Leads:** AppSec + Platform
- **W4.1 Hermetic Option:** Add containerized hermetic build path; document coverage and exceptions.
- **W4.2 Provenance Verify-on-Deploy:** Enforce provenance signature verification; quarantine on mismatch; exceptions time‑bound.
- **W4.3 Dependency Quarantine SLA:** Policy enforces <24h MTTR for typosquat/license/high-risk deps.
- **DoD:** 50% of T1 builds hermetic; verify-on-deploy mandatory; quarantine SLA met.

### WS5 — Audit Rehearsal Type II Path (Days 7–24)
**Leads:** GRC + AppSec + Platform
- **W5.1 Evidence Rotations:** Auto-sample evidence across releases; ensure freshness windows.
- **W5.2 Walkthrough:** `audit/rehearsal-typeII.md` with control→test→evidence→attestation link graph.
- **W5.3 Gap Closure:** Convert findings to Issues; close critical within sprint; attach PAR.
- **DoD:** Rehearsal executed; zero critical gaps; PAR filed.

### WS6 — PURPLE Stream & Heatmap (Days 1–24)
**Leads:** CTI/PURPLE
- **W6.1 Weekly Chains:** Focus cache exfil under budget cuts, role-chain lateral, and covert egress.
- **W6.2 Heatmap Care:** `analytics/heatmaps/attack.json` auto-updates; gaps → Issues same day.
- **DoD:** 4 PARs; coverage ≥96% relevant; gaps closed.

---

## D) Backlog (Create Issues; Project: **STARFALL 2026-07**)
1. SOAR action optimization + guardrails 2.1
2. Playbook chaos tests + rollback proofs
3. Schema v2.1 pruning + sampling
4. Cost dashboards + budget alerts
5. Coverage integrity checks post-pruning
6. Residency OPA gate + tests
7. KMS audit tool + rotation auto‑PRs
8. Envelope encryption CI tests
9. Hermetic build path + docs
10. Verify-on-deploy provenance enforcement
11. Dep quarantine SLA policy + monitors
12. Audit rehearsal Type II + PAR
13. Weekly PURPLE campaigns + heatmap updates

---

## E) Artifacts to Ship (Paths)
- `controls/opa/{residency.rego,privacy.rego,egress.rego,policies/*.rego}` + tests
- `alerting/policies/{guardrails.yaml,suppression.yaml,lifecycle.yaml}`
- `alerting/sigma/v4/*.yml` (extend) + `alerting/tests/*`
- `tools/{soar/*,kms/audit,identity/*,evidence/attest,restore/*}` + tests
- `analytics/dashboards/{cost.json,soc-autonomy.json,coverage.json}`
- `.evidence/{soc,crypto,builds}/**`
- `audit/{rehearsal-typeII.md,attestations/*.json}`
- `PURPLE/campaigns/weekly-YYWW.md`, `analytics/heatmaps/attack.json`

---

## F) Risks & Mitigations
- **Coverage loss from pruning** → Pre/post checks; canary; auto‑rollback.
- **Over‑blocking residency/crypto gates** → Monitored exceptions with expiry & owner.
- **Hermetic build friction** → Start with T1 paths; provide fallbacks with attested exceptions.

---

## G) RACI
- **A:** Security Lead  
- **R:** Detection Eng, IR, SRE, AppSec, Platform, Data Eng, Privacy, GRC, CTI  
- **C:** Legal, Comms, Product  
- **I:** Exec Sponsor, Support

---

## H) Metrics (Exit Criteria)
- P95 auto‑containment ≤30s; rollback ≥99.5%; toil ↓≥20%
- Telemetry cost ↓≥25% with coverage ≥96% and lag ≤90s P95
- 100% Restricted pipelines pass residency & encryption gates; KMS rotations attested
- 100% T1 releases with in‑toto + SBOM; ≥50% T1 builds hermetic; quarantine MTTR <24h
- Audit rehearsal completed; zero critical gaps; PAR filed
- 4 PURPLE PARs; coverage ≥96% relevant

---

## I) Proof-Carrying Analysis (PCA)
**Assumptions:** SKYHAMMER delivered audit matrix GA, tenant isolation, autonomy guardrails, privacy gates, unified attestations; we extend only.  
**Evidence:** CI outputs, OPA tests, SOAR receipts, cost dashboards, KMS audit logs, in‑toto/SBOM artifacts, rehearsal PARs.  
**Verification:** CI blocks on missing attestations/provenance, policy non‑compliance, prune-induced coverage loss, SLA breaches (quarantine MTTR, autonomy P95), or missing KMS rotations.

---

**B‑E Aggressive — cut cost, keep signal, prove resilience.**