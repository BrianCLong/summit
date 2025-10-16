# Sprint Plan — Nov 3–14, 2025 (America/Denver)

> **Context:** Fifth sprint in the program. Mature access governance, raise asset fidelity, scale intel confidence, and make automation safer/faster.

---

## 1) Sprint Goal (SMART)

Deliver **RBAC Phase 3 (ABAC + Just‑In‑Time elevation)**, **Asset Inventory v1.2** reaching **93–95% coverage** with lifecycle events + anomaly alerts, **Threat Intel Confidence v3** (ensembles + cross‑feed corroboration) cutting analyst triage volume **≥ 15%**, and **SOAR v1.3** (graph‑aware playbooks, batch approvals, safe parallelization) to drive **MTTC P50 ≤ 15 min / P90 ≤ 35 min**—**by Nov 14, 2025**.

**Key outcomes**

- ABAC policies enforce attribute‑based conditions; JIT elevation usable by responders with approvals/audit.
- Inventory reconciles agent ↔ cloud + emits create/update/delete events; anomaly alerts for drift/misconfig.
- Intel v3 provides calibrated scores leveraging ensemble models + corroboration across feeds.
- SOAR runs graph‑aware actions (entity dedupe + dependency order), batches approvals, and parallelizes safe steps.

---

## 2) Success Metrics & Verification

- **Authz coverage:** 100% sensitive routes under ABAC; 0 critical escapes.  
  _Verify:_ CI authz gate; negative tests; audit.
- **JIT elevation safety:** 100% elevation events logged; approvals enforced; revocation ≤ 5 min.  
  _Verify:_ Audit logs; synthetic drills.
- **Inventory coverage:** 93–95% entities present (per reconcile report); lifecycle event latency ≤ 5 min.  
  _Verify:_ Reconcile job; synthetic create/delete tests.
- **Intel effectiveness:** Triage volume ↓ ≥ 15%; Brier ≤ 0.16; PR‑AUC ↑ vs v2.  
  _Verify:_ Offline eval; analyst sampling; weekly report.
- **Automation reliability:** SOAR success ≥ 92% across graph‑aware playbooks; parallel step failure isolation verified.  
  _Verify:_ Run logs; chaos/simulation.
- **Incident **MTTC**:** P50 ≤ 15 min, P90 ≤ 35 min (7‑day rolling).  
  _Verify:_ Incident dashboard.

---

## 3) Scope

**Must‑have (commit):**

- **RBAC Phase 3:** ABAC rules (attributes: tenant, environment, sensitivity, case ownership); JIT elevation with time‑boxed grants; policy editor enhancements; approvals/audit.
- **Inventory v1.2:** Agent↔cloud reconcile improvements; lifecycle events bus; anomaly alerts (orphan assets, owner mismatch, sudden churn); accuracy report.
- **Intel Confidence v3:** Ensemble scorer (rules + ML), cross‑feed corroboration, analyst override interface, export to detections.
- **SOAR v1.3:** Graph‑aware playbook runner (entity resolution, dependency DAG), batch approvals for low‑risk, safe parallelization, per‑step circuit breakers.
- **Operational analytics:** MTTC, authz coverage, inventory health, intel precision dashboards.

**Stretch:**

- **Hunt Pack v1:** top 5 TTP clusters (queries + dashboards) with guided pivots.
- **EDR Live Response v1.1:** limited write actions with strict guardrails (temporary isolate, memory capture w/ size cap).
- **Customer export:** read‑only API for inventory snapshots (internal tenants only).

**Out‑of‑scope:**

- Continuous training in prod; cross‑tenant automation; mobile clients.

---

## 4) Team & Capacity

- Same roster; focus factor 0.8 → **commit 40 pts** (≈50 nominal).

---

## 5) Backlog (Ready for Sprint)

### Epic V — RBAC Phase 3 (ABAC + JIT) — **12 pts**

- **V1 — ABAC policy engine extensions** (5 pts)  
  _AC:_ attribute conditions; deny‑by‑default; policy tests.
- **V2 — JIT elevation flow** (4 pts)  
  _AC:_ request → approve → time‑boxed grant; revoke ≤5 min; full audit.
- **V3 — Policy editor UX + guardrails** (3 pts)  
  _AC:_ previews; diff/rollback; change log.

### Epic W — Asset Inventory v1.2 — **12 pts**

- **W1 — Reconcile & coverage boost** (5 pts)  
  _AC:_ precision/recall ≥93%; report with blind sample.
- **W2 — Lifecycle eventing + alerts** (4 pts)  
  _AC:_ create/update/delete; alert latency ≤5 min; webhook.
- **W3 — Anomaly detection (heuristics v1)** (3 pts)  
  _AC:_ orphan assets; owner mismatch; high churn.

### Epic X — Intel Confidence v3 — **8 pts**

- **X1 — Ensemble scorer + calibration** (4 pts)  
  _AC:_ PR‑AUC ↑ vs v2; Brier ≤0.16; model registry.
- **X2 — Cross‑feed corroboration** (3 pts)  
  _AC:_ provenance graph; confidence uplift rules; tests.
- **X3 — Analyst override & feedback** (1 pt)  
  _AC:_ reason codes; audit; API to detections.

### Epic Y — SOAR v1.3 — **8 pts**

- **Y1 — Graph‑aware runner (DAG + entity resolution)** (4 pts)  
  _AC:_ dependency ordering; de‑dup; step isolation.
- **Y2 — Batch approvals + parallelization** (4 pts)  
  _AC:_ low‑risk batching; per‑step circuits; replay mode.

### Epic Z — Operational Analytics & Resilience — **2 pts**

- **Z1 — Dashboards & chaos drills** (2 pts)  
  _AC:_ MTTC/authz/inventory/intel panels; monthly chaos runbook.

> **Planned:** 42 pts total — select **40 pts** to commit; keep ~10% slack.

---

## 6) Dependencies & Assumptions

- Attribute sources (tenant/env/sensitivity/owner) authoritative and available; policy owners identified.
- Cloud & agent telemetry stable; event bus capacity sized.
- Legal sign‑off for JIT approval flow; privacy review for model features.
- SOAR vendor limits known; parallel actions constrained within quotas.

---

## 7) Timeline & Ceremonies (MT)

- **Mon Nov 3** — Planning & Kickoff; ABAC safety review (30m).
- **Fri Nov 7** — Mid‑sprint demo/checkpoint (30m).
- **Wed Nov 12** — Grooming for next sprint (45m).
- **Fri Nov 14** — Demo (45m) + Retro (45m) + Release cut.

---

## 8) Definition of Ready (DoR)

- Policy definitions + attribute sources documented.
- Data schemas agreed; test datasets prepared; flags/telemetry named.

## 9) Definition of Done (DoD)

- Tests pass (unit/integration); CI authz gate enabled; dashboards live.
- Runbooks updated; enablement notes posted; rollback procedures verified.
- Privacy/security reviews closed; approvals configured.

---

## 10) QA & Validation Plan

- **ABAC/JIT:** negative/positive test matrix per attribute; timed revocation tests.
- **Inventory:** blind‑sample reconciliation; lifecycle latency measurement; anomaly alert precision.
- **Intel v3:** calibration curve; PR‑AUC vs v2; analyst sampling of 100 IOCs.
- **SOAR v1.3:** replay last 30d incidents; verify failure isolation; batch approval audit.

---

## 11) Risk Register (RAID)

| Risk                                | Prob. | Impact | Owner | Mitigation                                     |
| ----------------------------------- | ----- | -----: | ----- | ---------------------------------------------- |
| ABAC misconfig blocks responders    | Med   |   High | V1    | Shadow mode, previews, break‑glass             |
| JIT approvals latency               | Med   |    Med | V2    | Escalation path; SLA alerts                    |
| Inventory anomalies noisy           | Med   |    Med | W3    | Threshold tuning; feedback loop                |
| Intel v3 over‑confident             | Low   |   High | X1    | Reliability diagrams; conservative calibration |
| Parallel SOAR steps race conditions | Low   |   High | Y2    | Dependency DAG; per‑step circuit breakers      |

---

## 12) Communications & Status

- **Channels:** #sprint‑room (daily), #analyst‑ops (enablement), Exec update (Fri).
- **Reports:** Burnup, authz coverage, inventory coverage, intel calibration, SOAR reliability, MTTC trend.
- **Escalation:** PM → Eng Lead → Director.

---

## 13) Compliance/Security Guardrails

- Least privilege for policy editors; signed policy changes; audit trails immutable.
- No PII in model features; retention limits enforced; encryption in transit/at rest.
- SOAR step whitelists; dry‑run/simulation required pre‑prod.

---

## 14) Release & Rollback

- **Staged rollout:** Internal cohorts → full analysts → limited customers (if applicable).
- **Rollback:** Disable ABAC enforcement flag; pause inventory events; revert intel model to v2; disable batch approvals.
- **Docs:** Release notes; analyst changelog; customer comms (if external).

---

## 15) Next Sprint Seeds (Nov 17–28)

- **Policy Intelligence:** change‑risk scoring, policy drift detection, auto‑suggest rules.
- **Inventory Graph UI:** relationships (host↔user↔account↔asset) with attack paths.
- **SOAR v1.4:** cross‑tenant automation scopes; bulk incident ops.
- **Intel v4:** active learning loop; partner sandbox federation.

---

_Prepared by: Covert Insights — last updated Sep 7, 2025 (America/Denver)._
