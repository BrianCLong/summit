# Ramp Rollback Runbook

## Purpose

Return a ramped release to the last known-good state while preserving policy alignment,
receipts, and readiness evidence.

## Authority & Policy References

- Summit Readiness Assertion: `docs/SUMMIT_READINESS_ASSERTION.md`
- Constitution & Meta-Governance: `docs/governance/CONSTITUTION.md`,
  `docs/governance/META_GOVERNANCE.md`
- Agent Mandates: `docs/governance/AGENT_MANDATES.md`
- GA Guardrails: `docs/ga/TESTING-STRATEGY.md`, `docs/ga/LEGACY-MODE.md`
- Policy-as-code sources: `policies/`, `policy/`

## Preconditions

- Confirm release identifiers (commit SHA, version tag, deployment ID).
- Identify the last known-good release artifact and its evidence bundle.
- Confirm rollback authority in the policy engine and escalation contacts.

## Procedure

1. **Declare rollback intent** in the incident channel and change log.
   - Cite the readiness assertion and the release artifact that will be restored.
2. **Freeze the ramp** by disabling progressive exposure.
   - Update the feature flag or rollout controller to zero exposure.
3. **Re-deploy the last known-good artifact** using the approved release pipeline.
4. **Validate health** with standard smoke checks (service health endpoints,
   SLO dashboards, and alert stability).
5. **Re-enable stable exposure** at the pre-ramp baseline once health is confirmed.

## Receipt & Evidence Capture

- Capture deployment receipts (pipeline logs, deployment IDs, rollback timestamps).
- Export receipt artifacts from `services/receipt-worker` or `server/src/receipts`.
- Attach receipts to the evidence bundle and update
  `COMPLIANCE_EVIDENCE_INDEX.md`.
- Record the rollback outcome in the provenance ledger if applicable.

## Governed Exceptions

- Any deviation from policy gates must be logged as a **Governed Exception** with
  rationale, approver, and remediation timeline.

## Exit Criteria

- Rollback deployment is live and stable for one full monitoring window.
- Evidence bundle updated with receipts and readiness references.
- Incident status set to resolved with final notes recorded.
