# Restore Drill Runbook

## Purpose

Validate restore readiness by executing a controlled recovery drill with
policy alignment and evidence receipts.

## Authority & Policy References

- Summit Readiness Assertion: `docs/SUMMIT_READINESS_ASSERTION.md`
- Constitution & Meta-Governance: `docs/governance/CONSTITUTION.md`,
  `docs/governance/META_GOVERNANCE.md`
- Agent Mandates: `docs/governance/AGENT_MANDATES.md`
- GA Guardrails: `docs/ga/TESTING-STRATEGY.md`, `docs/ga/LEGACY-MODE.md`
- Policy-as-code sources: `policies/`, `policy/`

## Preconditions

- Select a restore target and approved snapshot.
- Confirm drill window and stakeholder notification.
- Verify access to backup storage and restore tooling.

## Procedure

1. **Declare the drill window** and reference the readiness assertion.
2. **Restore to an isolated environment** that mirrors production.
3. **Run validation checks** (data integrity, service health, and key workflows).
4. **Document recovery time** and any deviations.
5. **Tear down the drill environment** after validation.

## Receipt & Evidence Capture

- Collect restore job receipts and validation logs.
- Export policy decision receipts from `server/src/receipts`.
- Store artifacts under the evidence bundle and update
  `COMPLIANCE_EVIDENCE_INDEX.md`.

## Governed Exceptions

- Any skipped validation step must be recorded as a **Governed Exception** with
  owner and remediation date.

## Exit Criteria

- Drill completes within the defined recovery objective.
- Evidence bundle updated and linked to the drill report.
- Stakeholders sign off on readiness status.
