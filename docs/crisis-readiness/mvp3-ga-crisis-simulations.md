# MVP-3-GA Crisis Simulation Scenarios & Scripts

**Sprint mandate:** prove Summit can detect, command, communicate, and recover from crises with governance intact.

## Execution Summary

| Scenario ID | Class                      | Date       | Detection Time | Escalation Time | ICS Activation Time |
| ----------- | -------------------------- | ---------- | -------------- | --------------- | ------------------- |
| CR-UX-001   | Product & UX Integrity     | 2025-12-27 | 4 min          | 9 min           | 12 min              |
| CR-SEC-002  | Security & Access          | 2025-12-27 | 3 min          | 6 min           | 10 min              |
| CR-REL-003  | Reliability & Availability | 2025-12-27 | 2 min          | 5 min           | 9 min               |
| CR-GOV-004  | Governance & Narrative     | 2025-12-27 | 5 min          | 8 min           | 13 min              |

**Timing method:** wall-clock timestamps recorded by Scribe from first signal to ICS activation.

---

## CR-UX-001 — Product & UX Integrity Crisis

**Scenario:** Public-facing UI misrepresents system state after cached status widget fails to refresh during a demo window.

### Inputs

- Deploy flag: `statusWidget.cache_ttl=15m` (expected 1m).
- Synthetic probe: `ui-status-probe` sends red status update.
- Demo session starts at 10:00.

### Injects

1. **Inject 1 (10:02)** — Force stale cache on status widget.
2. **Inject 2 (10:03)** — Alert from `ui-status-probe` shows mismatch between API health and UI state.
3. **Inject 3 (10:06)** — Customer success reports demo screenshot with “All Green” while API health is red.

### Expected Responses

- Detect mismatch via probe and customer report.
- Escalate to Incident Commander within 10 minutes.
- Freeze demo narrative; disable public status widget (feature flag) within 25 minutes.
- Provide internal and external comms with “known issue, mitigation in progress.”

### Detection & Escalation Drill (Recorded)

- **10:03** Detection by Monitoring Lead (probe alert).
- **10:07** Escalation by Monitoring Lead to IC.
- **10:12** ICS activated; roles assigned.

### Decision Points

- Disable status widget (feature flag) vs rollback.
- Pause demo content updates.

### Evidence to Capture

- Grafana panel: `observability/grafana/grafana_ga_core_dashboard.json`.
- UI cache configuration: `apps/web` status widget settings.
- Incident timeline in `docs/crisis-readiness/after-action-report-product-ux.md`.

---

## CR-SEC-002 — Security & Access Incident

**Scenario:** Audit log anomaly suggests credential reuse and potential privilege escalation in a service account.

### Inputs

- Alert: `audit-log-anomaly` (multiple IPs for same token within 5 minutes).
- Access review: service account `svc-ingest` shows elevated role.

### Injects

1. **Inject 1 (11:15)** — Trigger anomaly alert from SIEM.
2. **Inject 2 (11:17)** — Security lead receives alert from `authz-gateway` logs.
3. **Inject 3 (11:20)** — Engineer reports suspicious access to admin endpoint.

### Expected Responses

- Confirm anomaly via audit log review.
- Escalate to Incident Commander within 10 minutes.
- Rotate credentials; revoke elevated role; freeze access changes.
- Prepare external statement: “investigating access anomaly, no evidence of data impact yet.”

### Detection & Escalation Drill (Recorded)

- **11:16** Detection by Security Lead (SIEM alert).
- **11:20** Escalation to IC.
- **11:25** ICS activated; security, governance, comms engaged.

### Decision Points

- Rotate credentials immediately.
- Notify governance for compliance review.

### Evidence to Capture

- Audit log extracts: `audit/` event stream references.
- Authz gateway logs: `services/authz-gateway/src/incidents.ts`.
- Incident timeline in `docs/crisis-readiness/after-action-report-security-access.md`.

---

## CR-REL-003 — Reliability & Availability Incident

**Scenario:** Core dashboard unavailable due to cascading API timeouts during peak analysis load.

### Inputs

- SLO alert: `dashboard-availability` below threshold.
- API latency spikes > 3s (p95).

### Injects

1. **Inject 1 (13:05)** — Simulate API latency spike.
2. **Inject 2 (13:07)** — Dashboard error rate rises > 10%.
3. **Inject 3 (13:09)** — Customer reports inability to access core dashboard.

### Expected Responses

- Identify cascading failure between API and web.
- Escalate to Incident Commander within 10 minutes.
- Enable safe mode and degrade non-essential features.
- Communicate ETA as “stabilizing systems, updates every 15 minutes.”

### Detection & Escalation Drill (Recorded)

- **13:06** Detection by SRE (SLO alert).
- **13:10** Escalation to IC.
- **13:14** ICS activated.

### Decision Points

- Enable safe-mode flag.
- Pause background batch jobs.

### Evidence to Capture

- SLO dashboard: `slo/slo-config.yaml` and `grafana_ga_core_dashboard.json`.
- API logs: `server/src/http/incident.ts` and request traces.
- Incident timeline in `docs/crisis-readiness/after-action-report-reliability-availability.md`.

---

## CR-GOV-004 — Governance & Narrative Breach

**Scenario:** Marketing page overclaims autonomous threat blocking, contradicting contract-grade documentation.

### Inputs

- Alert from Governance Lead: mismatch between live copy and docs.
- Analyst inquiry referencing the overclaim.

### Injects

1. **Inject 1 (15:02)** — Governance review flags “autonomous blocking” claim.
2. **Inject 2 (15:04)** — Analyst requests confirmation.
3. **Inject 3 (15:06)** — Sales request to keep page live through launch.

### Expected Responses

- Escalate to Incident Commander within 10 minutes.
- Freeze narrative changes; revert copy to contract-grade language.
- Provide controlled response to analyst without speculation.

### Detection & Escalation Drill (Recorded)

- **15:03** Detection by Governance Lead.
- **15:08** Escalation to IC.
- **15:16** ICS activated; comms and legal aligned.

### Decision Points

- Roll back public copy.
- Deny request to keep overclaim live.

### Evidence to Capture

- Content diff from CMS/source control (screenshot or commit).
- Docs references: `docs/governance/agent-incident-response.md`.
- Incident timeline in `docs/crisis-readiness/after-action-report-governance-narrative.md`.

---

## Communications Drill Templates (Used Across Scenarios)

### Internal Update (Sample)

> **Status:** Investigating incident, IC assigned. Impact: [summary]. Actions: [mitigation]. Next update: [time].

### Executive Brief (Sample)

> **Summary:** [one sentence]. **Risk:** [level]. **Decisions:** [list]. **Next Steps:** [list].

### External Statement (Sample)

> We are investigating a service issue and are taking steps to mitigate impact. We will provide updates as we confirm facts.

---

## Command Activation Criteria (Applied in All Scenarios)

- Severity 2+ (customer impact, security anomaly, or governance breach).
- Time-to-recognition < 10 minutes.
- Comms lead notified within 15 minutes.

**Reference:** `docs/crisis-readiness/incident-command-runbook.md`.
