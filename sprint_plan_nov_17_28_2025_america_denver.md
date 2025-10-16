# Sprint Plan — Nov 17–28, 2025 (America/Denver)

> **Context:** Sixth sprint. U.S. Thanksgiving impacts capacity (Nov 27–28). Focus on _policy safety_, _graph context_, and _automation scale_ while preserving stability.

---

## 1) Sprint Goal (SMART)

Launch **Policy Intelligence v1** (change‑risk scoring + drift detection), ship **Inventory Graph UI v1** (entity relationships + path preview), upgrade **SOAR v1.4** (bulk ops + safer parallelization + queues), and enable **Intel v4 (active learning loop)** in beta—**by Nov 28, 2025**.

**Key outcomes**

- Policy changes receive risk score + preview; drift detected within **≤10 min** with safe rollback.
- Graph UI links alerts → entities (host↔user↔account↔asset) with **attack path preview** and ownership context.
- SOAR supports **bulk actions** with **idempotent queues** and **per‑step circuit breakers**; throughput ↑ **25%**.
- Intel v4 collects analyst feedback inline; improves calibration vs v3 on canary set.

---

## 2) Success Metrics & Verification

- **Policy safety:** 0 critical misconfig incidents; drift alert MTTA **≤ 5 min**; change‑risk model AUC **≥ 0.80** on backtests.  
  _Verify:_ Policy change logs, drift monitors, offline eval.
- **Graph adoption:** ≥ **70%** of P1/P2 investigations use Graph panel; mean clicks‑to‑context ↓ **30%**.  
  _Verify:_ UI telemetry, analyst survey.
- **Automation scale:** SOAR bulk ops success **≥ 92%**; queue time P95 **≤ 90s**; parallel step failure isolation proven.  
  _Verify:_ SOAR run logs, synthetic replays.
- **Intel v4 quality:** Brier **≤ 0.15**, PR‑AUC ↑ vs v3 on canary; analyst override rate **≤ 10%**.  
  _Verify:_ Eval set, sampling review.

---

## 3) Scope

**Must‑have (commit):**

- **Policy Intelligence v1:** change‑risk scoring (rules + heuristics), drift detectors on RBAC/policy surfaces, preview‑before‑apply, rollback script, notifier.
- **Inventory Graph UI v1:** entity graph (host/user/account/asset), ownership tags, attack path preview (read‑only), link from alert view.
- **SOAR v1.4 Core:** bulk incident operations (close, tag, assign), idempotent action queues, safer parallelization with per‑step circuit breakers + retries, improved audit.
- **Intel v4 (beta):** inline feedback capture in triage, active learning loop (batch), model registry entry v4, canary export to detections.
- **Observability/Runbooks:** dashboards, alerts, on‑call guides for all new components.

**Stretch:**

- Partner sandbox federation (phase‑0) on 5% sample traffic.
- Graph path scoring (risk weight for shortest attack paths).
- SOAR safeguarded write actions for EDR v1.1 (temporary isolate, memory capture) behind approvals.

**Out‑of‑scope:**

- Cross‑tenant automation; production online training; mobile clients.

---

## 4) Team & Capacity (holiday‑adjusted)

- **Working days:** 8 (Thanksgiving Nov 27 + Day‑after Nov 28 PTO coverage).
- **Focus factor:** 0.75 (holidays, PTO, interrupts).
- **Nominal capacity:** ~50 pts → **commit 30 pts** (+ up to 6 pts stretch).

---

## 5) Backlog (Ready for Sprint)

### Epic AA — Policy Intelligence v1 (10 pts)

- **AA1 — Change‑risk scoring engine** (4 pts)  
  _AC:_ risk 0–100; factors: blast radius, privilege, past incident links; preview; tests.
- **AA2 — Drift detection + rollback** (4 pts)  
  _AC:_ detect policy deltas; alert ≤5 min; one‑click rollback; audit.
- **AA3 — Notifications & UX** (2 pts)  
  _AC:_ Slack/Email; change summary; approver list; kill‑switch.

### Epic AB — Inventory Graph UI v1 (8 pts)

- **AB1 — Graph service & API** (3 pts)  
  _AC:_ entity nodes/edges; pagination; perms respected.
- **AB2 — UI panel in alert view** (3 pts)  
  _AC:_ path preview; hover details; link to entity pages.
- **AB3 — Ownership context** (2 pts)  
  _AC:_ show owner; handoff link; export PNG.

### Epic AC — SOAR v1.4 Scale & Safety (8 pts)

- **AC1 — Bulk incident ops + queues** (4 pts)  
  _AC:_ idempotent; retries/backoff; rate limits.
- **AC2 — Parallelization + circuit breakers** (4 pts)  
  _AC:_ per‑step timeouts; isolation; replay failing branch only.

### Epic AD — Intel v4 (Active Learning Beta) (4 pts)

- **AD1 — Feedback capture + labeling** (2 pts)  
  _AC:_ thumbs up/down + reason; label store; privacy review.
- **AD2 — Batch retrain pipeline + canary** (2 pts)  
  _AC:_ registry v4; eval metrics; gated export to detections.

### Epic AE — Observability & Enablement (2 pts)

- **AE1 — Dashboards, alerts, runbooks** (2 pts)  
  _AC:_ uptime/error/latency; on‑call SOPs; chaos drill checklist.

> **Planned:** **32 pts** total — select **30 pts** to commit; hold ~2 pts buffer.

---

## 6) Dependencies & Assumptions

- Policy change/audit logs accessible; approver groups defined.
- Graph service can read inventory + identity sources under least privilege.
- SOAR vendor quotas documented; bulk APIs stable; concurrency limits known.
- Intel training data retained per policy; PII not used in features.

---

## 7) Timeline & Ceremonies (MT)

- **Mon Nov 17** — Planning & Kickoff; policy safety review (30m).
- **Fri Nov 21** — Mid‑sprint demo/checkpoint (30m).
- **Wed Nov 26** — Grooming for next sprint (30m).
- **Thu Nov 27 – Fri Nov 28** — U.S. Thanksgiving + reduced staffing (status async only).
- **Fri Nov 28** — Release cut (as capacity allows) + Retro moved to **Mon Dec 1**.

---

## 8) Definition of Ready (DoR)

- Risk factors documented; data sources mapped; test datasets ready.
- Feature flags named; telemetry + audit events specified.
- Access controls reviewed; least privilege verified.

## 9) Definition of Done (DoD)

- Tests pass (unit/integration); dashboards live; alerts tuned.
- Runbooks updated; enablement note to #analyst‑ops; rollback validated.
- Privacy/security checks closed; approvals configured.

---

## 10) QA & Validation Plan

- **Policy:** backtest risk model; simulate 20 changes; verify rollback works.
- **Graph:** snapshot correctness on 100 sampled alerts; path preview correctness spot check.
- **SOAR:** bulk ops synthetic load (1k items); queue saturation test; failure isolation.
- **Intel:** v4 vs v3 eval metrics; analyst sampling of 100 IOCs; override rate tracked.

---

## 11) Risk Register (RAID)

| Risk                                     | Prob. | Impact | Owner | Mitigation                                     |
| ---------------------------------------- | ----- | -----: | ----- | ---------------------------------------------- |
| Holiday PTO reduces throughput           | High  |    Med | PM    | Lower commit; strict WIP; clear triage rules   |
| Risk model mis‑scores a dangerous change | Low   |   High | AA1   | Conservative weights; manual gate; previews    |
| Graph inaccuracies confuse analysts      | Med   |    Med | AB1   | "Data freshness" banner; feedback; quick fixes |
| Bulk ops overload vendor APIs            | Med   |    Med | AC1   | Queues/backoff; rate caps; sandbox tests       |
| Active learning drifts model             | Low   |    Med | AD2   | Canary only; weekly eval; rollback to v3       |

---

## 12) Communications & Status

- **Channels:** #sprint‑room (daily), #analyst‑ops (enablement), Exec update (Fri).
- **Reports:** Burnup, risk alerts, graph adoption, SOAR throughput, v4 calibration.

---

## 13) Compliance/Security Guardrails

- Signed policy changes; immutable audit; break‑glass path documented.
- Graph read‑only for v1; no cross‑tenant joins; PII redaction in UI.
- SOAR bulk actions behind approval for destructive operations; simulation required pre‑prod.
- Intel features exclude PII; retention limits enforced; encryption in transit/at rest.

---

## 14) Release & Rollback

- **Staged rollout:** Internal cohort → all analysts → selected tenants (if applicable).
- **Rollback:** Disable policy risk checks; pause drift detectors; hide Graph UI flag; revert SOAR to v1.3; pin Intel v3.
- **Docs:** Release notes, analyst changelog, customer comms (if external).

---

## 15) Next Sprint Seeds (Dec 1–12)

- Policy Intelligence v1.1 (learned weights; policy suggestion assistant).
- Graph UI v1.1 (attack path scoring + remediation hints).
- SOAR v1.5 (graph‑aware batching, per‑tenant quotas, human‑in‑the‑loop dashboard).
- Intel v4.1 (active learning cadence, annotator quality metrics, disagreement detection).

---

_Prepared by: Covert Insights — last updated Sep 7, 2025 (America/Denver)._
