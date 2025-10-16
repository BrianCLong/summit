# Sprint Plan — Sep 22–Oct 3, 2025 (America/Denver)

> **Context:** Follow-on sprint after Sep 8–19. Objective: productionize triage v2, expand automation, and harden the platform.

---

## 1) Sprint Goal (SMART)

Move **Alert Triage v2** from beta to **GA (100% analysts)**, expand **SOAR playbooks to six** with \>= **90% success**, and ship **Detection Content Pack v6** to reduce false positives by **20%**—**by Oct 3, 2025**.

**Key outcomes**

- GA toggle on for all analysts with safe rollout stages.
- 3 new automated playbooks (phishing containment, MFA reset, URL block) with approvals & audit.
- Content Pack v6: +12 ATT&CK techniques (new/tuned) with tests; FP rate ↓ 20% vs prior month.
- **Analyst Assist** quality uplift: incorporate feedback loop + labeling to sustain precision \>= 0.85.

---

## 2) Success Metrics & Verification

- **Adoption:** \>= 80% of analysts trigger quick actions weekly.  
  _Verify:_ Audit logs, dashboard.
- **Automation Reliability:** \>= 90% E2E success across 6 playbooks in staging → prod.  
  _Verify:_ SOAR run logs, synthetic checks.
- **Quality:** Precision \>= 0.85 / Recall \>= 0.72 on canary; FP rate ↓ 20% (7-day moving).  
  _Verify:_ Offline eval + shadow-prod.
- **Performance:** Scoring P95 \<= 150ms; UI TTI \<= 2.8s.  
  _Verify:_ APM traces, Lighthouse CI.

---

## 3) Scope

**Must-have (commit):**

- Triage v2 GA controls: kill-switch, cohorting, health checks.
- Analyst feedback loop (thumbs/up down, rationale, label store) powering weekly retrain.
- SOAR v1.1: add 3 playbooks (Phishing Contain, Forced MFA Reset, URL Block at proxy).
- Detection Content Pack v6 (credential access, lateral movement, persistence, C2).
- ATT&CK coverage heatmap + MTTT trend widgets in dashboard.

**Stretch:**

- Identity graph enrichment v1 (Okta/AD v2 mapping users ↔ hosts/accounts) in alert view.
- Detection-as-code pipeline upgrade (golden datasets + breaking-change guard).
- Data isolation/tenant guardrails test suite (carry-over).

**Out-of-scope:**

- Full RBAC overhaul; cross-cloud asset inventory; mobile clients.

---

## 4) Team & Capacity (assume same roster)

- **Focus factor:** 0.8 → **40 pts** commit (out of ~50 nominal).

---

## 5) Backlog (Ready for Sprint)

### Epic F — Triage v2 GA & Hardening (14 pts)

- **F1 — GA rollout controls & staged ramp** (5 pts)  
  _AC:_ 10%→50%→100% with health checks; auto-rollback.
- **F2 — Analyst feedback & label store** (5 pts)  
  _AC:_ reason codes; PII redaction; API for DS.
- **F3 — Perf/UX polish** (4 pts)  
  _AC:_ P95 \<= 150ms; keyboard nav; error states.

### Epic G — SOAR v1.1 Playbooks (10 pts)

- **G1 — Phishing containment** (4 pts)  
  _AC:_ auto-quarantine message; sender block; ticket linkback.
- **G2 — Forced MFA reset** (3 pts)  
  _AC:_ approval gate; comms template; audit log.
- **G3 — URL block at proxy** (3 pts)  
  _AC:_ blocklist API; rollback; telemetry.

### Epic H — Detection Content Pack v6 (8 pts)

- **H1 — New analytics + tuning** (5 pts)  
  _AC:_ +12 techniques; tests; FP ↓ 20% vs baseline.
- **H2 — Canary evaluation & report** (3 pts)  
  _AC:_ precision/recall stats; change log.

### Epic I — Dashboard Enhancements (4 pts)

- **I1 — ATT&CK heatmap** (2 pts)  
  _AC:_ technique drill-down; export.
- **I2 — MTTT trend & adoption widget** (2 pts)  
  _AC:_ cohort filter; P50/P90.

### Epic J — Identity Graph Enrichment v1 (Stretch, 4 pts)

- **J1 — Okta/AD stitching** (4 pts)  
  _AC:_ unify identity across alerts; privacy review.

### Epic K — Detection-as-Code Pipeline v2 (Stretch, 4 pts)

- **K1 — Golden datasets & CI gate** (4 pts)  
  _AC:_ block merges on regression; schema versioning.

> **Planned:** 40 pts commit + 8 pts stretch.

---

## 6) Dependencies & Assumptions

- Feature flags wired to ops; on-call ready for GA ramp windows.
- SOAR vendor rate limits known; sandbox creds available.
- Label store infra (DB + API) provisioned; access controls set.
- Legal sign-off for MFA reset automation (approval gate required).

---

## 7) Timeline & Ceremonies (MT)

- **Mon Sep 22** — Planning (90m) & Kickoff (30m).
- **Daily** — Standup 9:30–9:45 AM.
- **Fri Sep 26** — Mid-sprint demo/checkpoint (30m).
- **Tue Sep 30** — Grooming for next sprint (45m).
- **Fri Oct 3** — Demo (45m) + Retro (45m) + Release cut.

---

## 8) Definition of Ready (DoR)

- GA risk checklist; rollback path documented.
- Data sources mapped; test data available; security review notes attached.
- Feature flags & telemetry defined.

## 9) Definition of Done (DoD)

- Deployment & flags configured; dashboards updated; runbooks changed.
- Tests: unit/integration; synthetic checks for playbooks.
- Privacy & audit controls validated; approvals enforced.
- Release notes posted; #analyst-ops enablement complete.

---

## 10) QA & Validation Plan

- Unit coverage \>= 80% on changed components.
- Synthetic exercises: 3 per playbook (success, approval-blocked, failure path).
- Shadow-prod monitoring for drift; weekly quality report.
- Performance SLOs tracked in APM; alert on breach.

---

## 11) Risk Register (RAID)

| Risk                        | Prob. | Impact | Owner    | Mitigation                                |
| --------------------------- | ----- | -----: | -------- | ----------------------------------------- |
| GA ramp exposes latent bugs | Med   |   High | Eng Lead | Stage ramp + kill-switch + canary         |
| SOAR vendor throttling      | Med   |    Med | G1 owner | Backoff, queue, preflight checks          |
| Label misuse/PII leakage    | Low   |   High | PM/Sec   | Redaction, access controls, audit         |
| FP reduction misses target  | Med   |    Med | TR/DS    | Canary eval, revert tuner, extra datasets |
| MFA reset automation error  | Low   |   High | PM/Legal | Mandatory approval + comms template       |

---

## 12) Communications & Status

- **Channels:** #sprint-room (daily), #analyst-ops (enablement), Exec email (Fri).
- **Reports:** Burnup, adoption, playbook success rate, MTTT trend.
- **Escalation:** PM → Eng Lead → Director.

---

## 13) Compliance/Security Guardrails

- Least privilege; secrets in vault; signed actions for SOAR.
- PII redaction in feedback; retention policy enforced.
- Tamper-evident audit for all automated actions.

---

## 14) Release & Rollback

- **Staged rollout:** 10% → 50% → 100% with health checks.
- **Rollback:** Toggle GA off; revert v6 content pack; disable new playbooks.
- **Docs:** Release notes, customer comms (if external), analyst changelog.

---

## 15) Carryover & Next Sprint Seeds

- Carryover: tenant guardrail tests (if not finished); backlog items from v2 polish.
- Seeds (Oct 6–17): RBAC phase 1 (scopes/roles), cross-cloud asset inventory v1, intel feed dedup + scoring, EDR live response actions (advanced).

---

_Prepared by: Covert Insights — last updated Sep 7, 2025 (America/Denver)._
