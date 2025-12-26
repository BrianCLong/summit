# Sprint Plan — Oct 20–31, 2025 (America/Denver)

> **Context:** Fourth sprint. Consolidate access controls, harden inventory fidelity, raise automation maturity, and operationalize intel at scale.

---

## 1) Sprint Goal (SMART)

Deliver **RBAC Phase 2 (resource‑level + project scopes)**, **Asset Inventory v1.1** with drift alerts and CMDB export, **Threat Intel Sandbox + Confidence v2** (ML‑assisted), and **SOAR v1.2 risk‑aware auto‑approval**—cut **MTTC P50 to ≤ 20 min** on P1/P2 incidents—**by Oct 31, 2025**.

**Key outcomes**

- Resource‑level permissions enforced across APIs/UI with project/workspace scopes.
- Inventory reconciles **agent ↔ cloud** with **≥90% match accuracy**; drift alerts within 30 min.
- TI sandbox detonates samples safely, yields calibrated confidence score v2 exposed to detections.
- SOAR risk engine gates actions: **auto‑approve low‑risk**, **HITL for medium**, **block high**; audit complete.

---

## 2) Success Metrics & Verification

- **Access safety:** 0 critical authz escapes; 100% sensitive routes covered by policy checks.  
  _Verify:_ Authz test matrix; audit logs; negative tests.
- **Inventory fidelity:** ≥90% agent↔cloud reconcile precision/recall; drift alert MTTA ≤ 5 min.  
  _Verify:_ Reconciliation report; synthetic drift injections.
- **Intel effectiveness:** Sandbox throughput ≥ 300 samples/day; confidence v2 Brier ≤ 0.18 on eval; dedup+scoring reduces analyst triage volume by ≥ 15%.  
  _Verify:_ Pipeline metrics; analyst sampling.
- **Automation safety:** SOAR auto‑approval false‑allow rate = 0 in staging; prod ≤ 0 with approval gates.  
  _Verify:_ Simulation logs; change review.
- **Incident MTTC:** P50 ≤ 20 min, P90 ≤ 45 min (rolling 7‑day).  
  _Verify:_ Incident dashboard.

---

## 3) Scope

**Must‑have (commit):**

- RBAC Phase 2: resource‑level policies, project scopes, permission editor UI, migration + backfill, extensive audit.
- Inventory v1.1: agent↔cloud reconcile service, drift detection/alerts, ServiceNow CMDB export (basic), ownership tag accuracy bump.
- TI Sandbox & Confidence v2: secure detonation (url/file) at capped rate, ML model training pipeline, labeling workflow, export to detections.
- SOAR v1.2: risk model (rule + score), auto‑approve for low‑risk actions, HITL queue, simulation mode.
- Operational analytics: MTTC dashboard + automation adoption widget.

**Stretch:**

- Hunt Pack v1 (saved queries + dashboards for top 5 TTP clusters).
- Email/SMS comms templates + approval notifiers.
- EDR Live Response v1.1 (limited write actions with guardrails: memory capture, isolate temp).

**Out‑of‑scope:**

- RBAC Phase 3 (attribute‑based policies), mobile clients, customer‑facing export APIs beyond CMDB basic.

---

## 4) Team & Capacity

- Same roster; **commit 40 pts** (≈50 nominal × 0.8 focus).

---

## 5) Backlog (Ready for Sprint)

### Epic Q — RBAC Phase 2 (12 pts)

- **Q1 — Policy engine: resource scopes & projects** (5 pts)  
  _AC:_ resource filters; deny‑by‑default; feature flag; test matrix.
- **Q2 — Permission editor UI + migration** (4 pts)  
  _AC:_ bulk assign; audit trail; rollback script; docs.
- **Q3 — Authz coverage & regressions** (3 pts)  
  _AC:_ 100% sensitive routes under checks; negative tests CI gate.

### Epic R — Inventory v1.1 (10 pts)

- **R1 — Reconcile agent↔cloud** (4 pts)  
  _AC:_ entity matching; precision/recall ≥90%; report.
- **R2 — Drift detection + alerts** (3 pts)  
  _AC:_ detect create/delete/owner changes; alert ≤5 min.
- **R3 — CMDB export (ServiceNow)** (3 pts)  
  _AC:_ mapped fields; idempotent upsert; error budget.

### Epic S — TI Sandbox & Confidence v2 (8 pts)

- **S1 — Safe detonation pipeline** (3 pts)  
  _AC:_ rate cap; network egress rules; cost ceiling.
- **S2 — Labeling + training** (3 pts)  
  _AC:_ annotator UI; train/eval loop; model registry.
- **S3 — Score export → detections** (2 pts)  
  _AC:_ 0–100 score; provenance; override.

### Epic T — SOAR v1.2 (8 pts)

- **T1 — Risk model + policy** (4 pts)  
  _AC:_ action risk score; thresholds; approval gates.
- **T2 — Simulation & HITL queue** (4 pts)  
  _AC:_ replay last 30d incidents; reviewer UX; audit.

### Epic U — Operational Analytics (2 pts)

- **U1 — MTTC + adoption widgets** (2 pts)  
  _AC:_ cohort filters; P50/P90; export.

> **Planned:** 40 pts commit + 8–10 pts stretch.

---

## 6) Dependencies & Assumptions

- ServiceNow CMDB API access/limits understood; mapping approved by owners.
- Sandbox infra isolated; legal/compliance review for detonation traffic.
- Risk thresholds reviewed by Sec/Legal; change advisory window scheduled.
- Agent inventory telemetry available; cloud credentials scoped least‑privilege.

---

## 7) Timeline & Ceremonies (MT)

- **Oct 20** — Planning & Kickoff; SOAR policy review (30m).
- **Oct 24** — Mid‑sprint demo/checkpoint.
- **Oct 28** — Grooming for next sprint.
- **Oct 31** — Demo + Retro + Release cut.

---

## 8) Definition of Ready (DoR)

- Policy definitions approved; data schemas mapped; test data available.
- Feature flags defined; telemetry & audits specified.

## 9) Definition of Done (DoD)

- Tests green (unit/integration); authz matrix validated; dashboards live.
- Runbooks + enablement notes posted; rollback procedures verified.
- Privacy/security reviews closed; approvals in place.

---

## 10) QA & Validation Plan

- RBAC negative/positive tests per resource; fuzz tests against policy engine.
- Inventory reconcile: sample 200 assets per cloud; report precision/recall + drift latency.
- TI model eval: Brier score, PR‑AUC; analyst sampling on 100 IOCs.
- SOAR simulation: replay last 30d; measure false‑allow = 0; log evidence.

---

## 11) Risk Register (RAID)

| Risk                            | Prob. | Impact | Owner | Mitigation                                             |
| ------------------------------- | ----- | -----: | ----- | ------------------------------------------------------ |
| Over‑permissive auto‑approve    | Low   |   High | T1    | Conservative thresholds; simulation first; kill‑switch |
| CMDB sync churn / duplicate CIs | Med   |    Med | R3    | Idempotent keys; dedup rules; dry‑run                  |
| Sandbox cost spikes             | Med   |    Med | S1    | Rate caps; budget alerts; off‑peak scheduling          |
| Reconcile mis‑matches           | Med   |    Med | R1    | Threshold tuning; manual review queue                  |
| Policy migration friction       | Med   |    Med | Q2    | Bulk tools; comms; staged rollout + break‑glass        |

---

## 12) Communications & Status

- **Channels:** #sprint‑room (daily), #analyst‑ops (enablement), Exec update (Fri).
- **Reports:** Burnup, authz coverage, reconcile accuracy, sandbox throughput, MTTC trend.
- **Escalation:** PM → Eng Lead → Director.

---

## 13) Compliance/Security Guardrails

- Least privilege everywhere; secrets in vault; signed SOAR actions.
- Sandbox containment: egress allowlist, data retention ≤ 30 days, no PII.
- CMDB export scoped to required fields; encryption in transit/at rest.

---

## 14) Release & Rollback

- **Staged rollout:** Internal cohorts → full internal → limited customer tenants (if applicable).
- **Rollback:** Disable RBAC v2 flag; stop reconcile/drift services; pause sandbox; revert SOAR policy to v1.1.
- **Docs:** Release notes; analyst changelog; customer comms as needed.

---

## 15) Next Sprint Seeds (Nov 3–14)

- RBAC Phase 3 (ABAC/policy conditions; just‑in‑time elevation).
- Inventory v1.2 (coverage to 93–95%, asset lifecycle events, anomaly alerts).
- TI confidence v3 (ensembles + cross‑feed corroboration); sandbox federation with partner.
- SOAR v1.3 (graph‑aware playbooks, batch approvals, parallelization).

---

_Prepared by: Covert Insights — last updated Sep 7, 2025 (America/Denver)._
