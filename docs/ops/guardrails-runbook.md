# Guardrails Runbook

## Overview
The **Guardrails** system enforces "Policy + Provenance on every write". It is a critical security control that ensures all mutating operations are authorized by OPA and recorded in the Provenance Ledger.

## Symptoms
- API returns `403 Forbidden` with body `{ error: "Policy Violation", message: "..." }`.
- API returns `500 Internal Server Error` with body `{ error: "Security Enforcement Error" }`.
- Missing provenance receipts in headers.
- Alerts firing for "High Policy Denial Rate".

## Diagnostics

### 1. Verify Policy Decision
Check the audit logs for the `policy_enforcement` event.
```sql
SELECT * FROM audit_events
WHERE event_type = 'policy_enforcement'
AND details->>'requestId' = '<REQUEST_ID>';
```
If the outcome is `failure`, inspect `details->'decision'->'reason'`.

### 2. Inspect OPA Status
Ensure OPA is running and reachable.
```bash
curl -v http://opa:8181/health
```

### 3. Verify Provenance Ledger
If the error is related to provenance (500 error), check the ledger metrics and logs.
```bash
# Check ledger integrity
curl http://localhost:3000/metrics | grep provenance_ledger_integrity_status
```

## Remediation

### Scenario: Valid Request Denied
1. Identify the policy path causing the denial (e.g., `main/allow`).
2. Review the OPA policy logic in `policy/`.
3. If the policy is incorrect, create a PR to update the policy.
4. If the request is missing attributes (e.g., missing `tenant_id`), fix the client or upstream service.

### Scenario: 500 Security Enforcement Error
1. This usually means the Ledger or OPA is unreachable.
2. Check connectivity to Postgres (Ledger storage) and OPA.
3. Restart the server if dependencies are healthy but connection pools are stuck.

## Emergency Kill-Switch
To bypass guardrails in an extreme emergency (e.g., OPA global failure blocking all writes):
1. **Warning:** This breaks compliance guarantees.
2. Set `SAFETY_MODE=true` env var or toggle the feature flag `guardrails_bypass`.
3. (Note: The current implementation fails closed. Code changes are required to bypass if no feature flag is wired yet.)
