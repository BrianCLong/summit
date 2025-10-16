# Sprint Plan — Sep 8–19, 2025 (America/Denver)

> **Context:** Security & intelligence engineering + threat research team. Two-week timebox. This plan is turnkey—drop into Jira/Linear and go.

---

## 1) Sprint Goal (SMART)

Deliver **v2 alert triage and response** improvements that cut mean time to triage (MTTT) by **30%**, expand coverage for **new TTPs** mapped to **MITRE ATT&CK**, and enable **one-click containment** for top three playbooks—**by Sep 19, 2025**.

**Key outcomes**

- Reduce MTTT by 30% compared to previous 4-week baseline.
- +15 detections/analytics mapped to ATT&CK (new or tuned), with tests.
- Integrate SOAR connector v1 for auto-ticket + containment on 3 playbooks.
- Ship user-facing “Analyst Assist” panel (beta) behind a feature flag.

---

## 2) Success Metrics & Verification

- **MTTT:** \<= 15 minutes median across P1/P2 alerts (from baseline 22 min).  
  _Verify:_ Analyst dashboard + data export.
- **Detection Quality:** \>= 0.85 precision / \>= 0.70 recall in staging canary.  
  _Verify:_ Offline eval set + shadow prod.
- **Playbook Automation:** \>= 80% success rate end-to-end for 3 playbooks.  
  _Verify:_ SOAR run logs; incident post-run check.
- **Coverage:** \>= 15 ATT&CK techniques (create/tune) with unit + integration tests.  
  _Verify:_ Detection registry and test matrix.

---

## 3) Scope

**Must-have (commit):**

- Alert Triage v2 backlog (ranking model scoring/policy, UX quick actions, evidence snippets).
- SOAR connector v1 (ServiceNow/Jira + EDR containment for Host Quarantine, Account Disable, Block Hash).
- Detection content pack v5 (TTPs: credential access, lateral movement, persistence).
- Analyst dashboard: MTTT & false-positive rate widget.
- Runbook updates: 3 playbooks and 1 emergency change window policy.

**Stretch (best-effort):**

- Threat intel ingestion: 2 new feeds + de-dup.
- Multi-tenant data isolation guardrail tests.
- Red team tabletop (2 hrs) focused on business email compromise (BEC).

**Out-of-scope:**

- Mobile app changes; full RBAC overhaul; cross-cloud asset inventory.

---

## 4) Team & Capacity (example; adjust to your roster)

- **Team:** 4 Eng, 1 Data Scientist, 1 Threat Researcher, 1 QA, 1 PM.
- **Timebox:** 10 working days; focus factor **0.8** (meetings, interrupts).
- **Nominal capacity:**
  - Eng: 4 × 8 pts = 32 pts
  - DS: 6 pts
  - TR: 6 pts
  - QA: 6 pts
  - **Subtotal:** 50 pts × 0.8 = **40 pts** usable.

> Replace with your actual team/pointing before committing the sprint.

---

## 5) Backlog (Ready for Sprint)

Below are ticket shells; copy directly into Jira/Linear. Points are indicative.

### Epic A — Alert Triage v2 (18 pts)

- **A1 — Scoring service: policy + model integration** (8 pts)  
  _AC:_ deterministic fallback if model unavailable; latency \<= 200ms P95; feature flag toggle.
- **A2 — UI: Inline quick actions (contain, dismiss, escalate)** (5 pts)  
  _AC:_ keyboard shortcuts; audit log entries; role checks.
- **A3 — Evidence snippets (LLM summarization) in alert view** (5 pts)  
  _AC:_ max 3 snippets; source links; PII redaction; error fallback.

### Epic B — SOAR Connector v1 (10 pts)

- **B1 — ServiceNow/Jira ticket automation** (3 pts)  
  _AC:_ create/update/close; idempotent retries; mapping config.
- **B2 — EDR quarantine action** (4 pts)  
  _AC:_ dry-run mode; result telemetry; rollback procedure.
- **B3 — Account disable + hash block** (3 pts)  
  _AC:_ approval gate; audit; execution time \<= 2m.

### Epic C — Detection Content Pack v5 (8 pts)

- **C1 — New analytics: credential access** (3 pts)  
  _AC:_ ATT&CK mappings; FP rate \<= 3% in staging; tests.
- **C2 — Lateral movement rules tuning** (3 pts)  
  _AC:_ decrease noise \>= 20%; before/after report.
- **C3 — Persistence techniques coverage** (2 pts)  
  _AC:_ add 4 techniques; documentation and references.

### Epic D — Analyst Dashboard (4 pts)

- **D1 — MTTT + FP widgets** (3 pts)  
  _AC:_ time range selectors; export CSV; P50/P90.
- **D2 — Feature flag & beta cohort** (1 pt)  
  _AC:_ allowlist; kill-switch.

### Epic E — Runbooks & Training (4 pts)

- **E1 — Update 3 playbooks** (3 pts)  
  _AC:_ decision trees; SOAR steps; legal/comms notes.
- **E2 — BEC tabletop (stretch)** (1 pt)  
  _AC:_ injects; roles; after-action items.

> **Total planned:** 44 pts (choose 40 to commit; keep ~10% slack for unknowns).

---

## 6) Dependencies & Assumptions

- SOAR vendor API keys active in staging + scoped prod.
- EDR supports quarantine via API; rate limits understood.
- Data labeling set for triage model training; sample size \>= 5k alerts.
- Legal sign-off for automated account disable in prod (approval gate enabled).

---

## 7) Timeline & Ceremonies (MT)

- **Mon Sep 8** — Sprint Planning (90m) & Kickoff (30m).
- **Daily** — Standup 9:30–9:45 AM.
- **Thu Sep 11** — Mid-sprint demo/checkpoint (30m).
- **Tue Sep 16** — Backlog grooming for next sprint (45m).
- **Fri Sep 19** — Demo (45m) + Retro (45m) + Release cut (as needed).

---

## 8) Definition of Ready (DoR)

- User story with clear problem statement & acceptance criteria.
- Data sources/owners identified; test data available.
- Security/privacy review outcomes (if applicable).
- Feature flagged when risk > low.

## 9) Definition of Done (DoD)

- Code merged, tests passing (unit/integration), dashboards updated.
- Security review complete; secrets managed; logging & audit added.
- Playbooks/docs updated; enablement note posted to #analyst-ops.
- Feature flag strategy decided (on for beta/off in prod) and rollback plan.

---

## 10) QA & Validation Plan

- Unit test min coverage: 80% on changed code.
- Integration tests for 3 playbooks, including failure paths.
- Shadow-prod for scoring service; parity vs baseline.
- Performance SLOs tracked: scoring P95 \<= 200ms; UI TTI \<= 3s.

---

## 11) Risk Register (RAID)

| Risk                               | Probability | Impact | Owner    | Mitigation                                      |
| ---------------------------------- | ----------- | -----: | -------- | ----------------------------------------------- |
| Vendor API throttling              | Medium      |   High | B2 Eng   | Backoff + queue; cache; sandbox tests           |
| False positives spike after tuning | Medium      | Medium | TR       | Canary + revert script; FP guardrails           |
| Legal blocks automated disable     | Low         |   High | PM/Legal | Approval gate; manual fallback                  |
| Model drift post-deploy            | Medium      | Medium | DS       | Weekly eval; drift alerts; feature store freeze |
| Data privacy issues with snippets  | Low         |   High | Sec/PM   | PII redaction; audit; feature flag              |

---

## 12) Communications & Status

- **Channels:** #sprint-room (daily), #analyst-ops (enablement), Email to execs (Fri weekly).
- **Reports:** Burnup chart, velocity, blocked tickets, MTTT trend.
- **Escalation:** PM → Eng Lead → Director.

---

## 13) Compliance/Security Guardrails

- Least privilege for all new integrations; secrets in vault.
- Data handling: redact PII in model inputs/outputs; retention policy respected.
- Audit logging for all automated actions; tamper-evident.

---

## 14) Release Plan & Rollback

- **Staged rollout:** 10% beta cohort → 50% → 100% (with health checks).
- **Rollback:** feature flag off + revert content pack; EDR action disabled.
- **Docs:** Release notes, analyst changelog, customer comms (if external).

---

## 15) Jira/Linear Ticket Template (copy/paste)

```
As an <analyst/engineer>, I want <capability> so that <outcome>.

Acceptance Criteria
- [ ] ...
- [ ] ...

Tech Notes
-

Test Cases
-

Risk/Privacy/Sec
-

Dependencies
-

Estimate: X pts | Owner: @name | Labels: sprint-2025-09-08, security, ATT&CK
```

---

## 16) Next Sprint Seeds (Parking Lot)

- Identity graph enrichment (Okta/AD connectors v2).
- Asset inventory normalization across clouds.
- Detection-as-code pipeline upgrade (rule testing framework improvements).

---

_Prepared by: Covert Insights — last updated Sep 7, 2025 (America/Denver)._
