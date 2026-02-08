# Runbook: Non-Public Data Access Enablement

## Purpose
Enable a new non-public connector safely using policy-as-code, scoped credentials, and audit
artifacts. All steps are evidence-backed and reversible.

## Preconditions
- Policy rules and schemas live in `packages/decision-policy/`.
- Connector is feature-flagged OFF by default.
- Secrets stored in approved secret manager (never committed).

## Workflow (Enable a New Connector)
1. **Define connector manifest**
   - `source_id`, scopes, rate limits, retention defaults, and sensitivity.
2. **Add policy rule**
   - Deny-by-default with explicit allow conditions.
3. **Provision scoped credential**
   - Least-privilege token/service account.
4. **Dry-run in non-prod**
   - Validate audit and provenance artifacts.
5. **Request HITL policy (if required)**
   - Ensure approvals are bound by nonce and scope.
6. **Enable feature flag**
   - Roll out gradually with monitoring.

## Required Artifacts
- `artifacts/audit/<run_id>/policy_decision.json`
- `artifacts/audit/<run_id>/audit.json`
- `artifacts/audit/<run_id>/provenance.json`
- `artifacts/audit/<run_id>/approval_request.json` (if required)
- `artifacts/audit/<run_id>/approval_grant.json` (if required)

## Alerts
- Policy drift detected
- Denied-call spikes
- Redaction failures

## Rollback Plan
- Disable connector feature flag.
- Revoke scoped credentials.
- Revert policy rule and rotate tokens if drift is detected.

## SLO Assumptions
Non-public connector availability is **best-effort** and must degrade gracefully to OSINT-only
workflows.
