# Incident Command Runbook (MVP-3-GA Crisis Readiness)

## Purpose

Establish a clear Incident Command System (ICS) that enables Summit to detect, command, communicate, and recover from high-stakes incidents without breaking governance or narrative integrity.

## Activation Criteria

Activate ICS when any of the following is true:

- Customer-impacting outage or degradation (Severity 2+).
- Security anomaly or suspected unauthorized access.
- Governance or narrative breach with public exposure.
- Demo-safe guardrails fail or misrepresent system state.

**Target timelines**

- Recognition: < 10 minutes
- Escalation: < 10 minutes
- ICS activation: < 15 minutes

## Roles & Responsibilities

| Role                    | Primary Responsibilities                                    | Authority                                | Escalation Rights                                  | Backup            |
| ----------------------- | ----------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------- | ----------------- |
| Incident Commander (IC) | Declare incident, assign roles, approve mitigation/rollback | Full incident authority                  | Can halt releases, disable flags, freeze narrative | Deputy IC         |
| Technical Lead          | Diagnose root cause, drive mitigation plan                  | Can execute technical mitigations        | Escalate to IC for risk decisions                  | Secondary TL      |
| Communications Lead     | Internal/external updates, executive briefings              | Can publish approved updates             | Escalate to IC for approval                        | Comms Backup      |
| Risk/Governance Lead    | Validate compliance, policy-as-code alignment               | Can require rollback or narrative freeze | Escalate to governance council                     | Governance Backup |
| Scribe / Timeline Owner | Log timeline, decisions, evidence                           | Can request evidence artifacts           | Escalate missing data to IC                        | Scribe Backup     |

### Authority Verification Checklist

- IC declares incident and severity.
- Risk/Governance Lead confirms governance posture.
- Comms Lead confirms messaging alignment with docs-as-contracts.
- Scribe confirms evidence capture and timestamps.

## Escalation Paths

1. **Detection** → Monitoring/Security/Governance team.
2. **Escalation** → Incident Commander within 10 minutes.
3. **ICS Activation** → All roles assigned within 15 minutes.
4. **Governance Escalation** → Governance Council for policy decisions.

## Decision Authorities

| Decision Type        | Owner                | Criteria                          |
| -------------------- | -------------------- | --------------------------------- |
| Release Halt         | IC                   | Customer risk or integrity breach |
| Feature Flag Disable | IC + Technical Lead  | Mitigates impact within 30 min    |
| Rollback             | IC + Technical Lead  | Safer than mitigation             |
| Narrative Freeze     | IC + Governance Lead | Prevent misinformation            |
| External Statement   | Comms Lead + IC      | Facts validated, no speculation   |

## Communications Discipline

- **No speculation.**
- **Docs-as-contracts**: external statements must match contract-grade documentation.
- **Single source of truth**: updates are posted through Comms Lead.
- **Cadence**: internal updates every 30 minutes; external updates every 60 minutes or on material change.

## Evidence Capture

Required artifacts per incident:

- Timeline with timestamps and owners.
- Decision log with rationale.
- Evidence references (logs, dashboards, configs).
- Root cause analysis with contributing factors.
- Action items with owner and due date.

**Templates:**

- `docs/crisis-readiness/after-action-report-*.md`
- `packages/document-governance/src/templates/incident-postmortem.md`

## Stand-Down Criteria

- Customer impact eliminated or contained.
- Risk/Governance Lead signs off on compliance.
- Comms Lead confirms external statement accuracy.
- Postmortem scheduled within 5 business days.

## Drill Readiness Checklist

- [ ] Role assignments confirmed (primary + backup).
- [ ] Escalation paths verified.
- [ ] Feature flags and rollback procedures validated.
- [ ] Comms templates prepared.
- [ ] Evidence capture plan ready.
