# Operator Playbook (Defensive-Only)

## Triage

1. Validate alert schema compliance.
2. Confirm provenance references for any artifact-driven alert.
3. Escalate to governance if a request implies influence or persuasion.

## Escalation

- If policy denial triggers occur, route to the governance queue with supporting evidence IDs.
- If indicators exceed severity thresholds, notify the on-call analyst and log an audit event.

## Audit Export

- Export only structured alert metadata and provenance hashes.
- Never export raw content bodies or biometric data.
