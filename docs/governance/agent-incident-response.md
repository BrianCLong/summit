# Agent Incident Response

This runbook details the end-to-end response process for incidents triggered by agent activity, including safety violations, data leakage, or production impact. It aligns with the Jules governance model and integrates with existing security and SRE procedures.

## Goals
- Contain impact quickly and protect users, data, and systems.
- Preserve forensic evidence with full provenance for post-incident analysis.
- Restore service safely with validated rollbacks and guardrail improvements.

## Triggers
- Unauthorized data access or egress detected by DLP or audit logs.
- Guardrail or policy violation (e.g., safety filter hit, redaction overflow, model misuse).
- Unplanned production change (config drift, pipeline modification, CI workflow tampering).
- Material deviation from expected outputs impacting customers or governance artifacts.

## Roles
- **Incident Commander (IC):** Leads response, assigns owners, and drives communication.
- **Comms Lead:** Handles stakeholder updates and incident channel hygiene.
- **Forensics Lead:** Preserves evidence (logs, prompts, tool traces) and performs containment analysis.
- **Remediation Lead:** Executes rollback, patches configurations, and validates recovery.
- **Governance Steward:** Confirms alignment to Constitution/Rulebook and records approvals/waivers.

## Response Phases
1. **Declare & Triage (≤15 minutes):**
   - IC opens an incident ticket with severity, affected systems, and suspected tier.
   - Freeze agent activity in the affected scope; disable tokens or revoke permissions as needed.
   - Establish dedicated comms channel and assign roles.
2. **Contain (≤30 minutes):**
   - Activate kill switches or roll back to last known-good configuration.
   - Isolate compromised connectors, datasets, or environments.
   - Capture volatile data (logs, traces, memory dumps if applicable) with timestamps.
3. **Eradicate & Remediate:**
   - Patch prompts, guardrails, or policies; lock down misconfigured workflows.
   - Re-validate permissions against `permission-tiers.md`; tighten scopes where necessary.
   - Run targeted tests and dry-runs to confirm behavior before restoring full access.
4. **Recover:**
   - Gradually re-enable agents under heightened monitoring.
   - Validate service SLOs, data integrity, and user-facing pathways.
   - Keep enhanced logging until stability is confirmed.
5. **Postmortem (within 72 hours):**
   - Document timeline, root cause, contributing factors, and guardrail gaps.
   - Record approvals/waivers and map corrective actions to owners and due dates.
   - Feed learnings into `agent-ops.md` and update playbooks or detectors.

## Communications
- Use the incident channel for coordination; avoid ad-hoc DMs for decision-making.
- Provide hourly (or faster) updates for Sev-1, including containment status and next steps.
- Notify affected stakeholders, Governance Stewards, and on-call SRE/SecOps.
- If customer impact is possible, engage comms/legal teams per the main security incident process.

## Evidence Collection Checklist
- [ ] Run ticket, severity, and time of detection.
- [ ] Full prompt/tool trace, model versions, and configuration snapshots.
- [ ] Access logs showing datasets, scopes, and permissions used.
- [ ] Guardrail alerts and DLP findings with timestamps.
- [ ] Rollback actions taken and their validation results.
- [ ] Approvals/waivers captured for any deviations from policy.

## Metrics
Track MTTA, MTTR, recurrence rate, false-positive rate of detectors, and guardrail coverage. Incorporate these into quarterly retros and governance dashboards.

## Escalation Paths
- **If in doubt, escalate to Tier-4.**
- If containment fails within 30 minutes, page SRE and Security leadership.
- Legal/Privacy must be engaged for any confirmed data exposure.
