# Governance Cadence and Ownership

Defines the review frequency, accountable owners, and escalation paths for all learning artifacts.

## Ownership Model

- **Accountable Owner (DRI)**: One per artifact; responsible for safety, performance, and compliance. Must be a human with escalation deputy.
- **Deputy**: Backup approver with authority to pause or rollback; activates when DRI is unavailable.
- **Review Board**: Representatives from engineering, product, security, and compliance. Approves action-eligible promotions.
- **Observers**: SRE/operations and data leads receive alerts and review drift signals.

## Review Cadence

- **Weekly Triage (30 min)**: Review new drafts, drift alerts, and pending evaluations. Output: assignments and unblockers.
- **Monthly Governance Review (60 min)**: Assess all `evaluated` artifacts for promotion readiness; review audit logs and bias reports; verify rollback readiness.
- **Quarterly Certification (90 min)**: Re-certify active action-eligible artifacts, confirm retention compliance, and approve roadmap changes to metrics or gates.

## Escalation Paths

- **Critical breach (P0/P1)**: Immediate downgrade to advisory, initiate rollback, file incident per `agent-incident-response.md`, and notify security council.
- **Repeated minor breaches**: Elevate to monthly review agenda; require owner remediation plan and timeline.
- **Ownership gaps**: If no active DRI, artifact is frozen and cannot be promoted until owner is assigned and documented in its status file.

## Meeting Inputs and Outputs

- Inputs: Updated status files (`artifacts/learning/status`), evaluation reports, drift dashboards, incident summaries.
- Outputs: Decisions logged in provenance, action items with owners/dates, and cadence notes appended to the artifact history via promotion records.

## Tooling Hooks

- `scripts/ci/verify-learning-change.sh` is run before monthly reviews to confirm governance assets are intact.
- Alert routes for drift detectors must target the owner and deputy; integrate with incident tooling per `agent-incident-response.md`.
