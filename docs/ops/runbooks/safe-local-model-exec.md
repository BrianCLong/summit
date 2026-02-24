# Runbook: Safe Local Model Execution

## Incident Response: Policy Violation
If the runner fails with a `POLICY_VIOLATION`:
1. Check the error message for the specific violation (e.g., hash mismatch, root user).
2. If it's a hash mismatch, verify the model weights against the upstream source.
3. If an unauthorized mount was attempted, investigate if the environment has been tampered with.
4. Do not bypass policy checks by modifying `run.sh` or local scripts.

## Receipt Rotation
Receipts are stored in `runtime/receipts/`. To rotate:
1. Archive receipts older than 30 days.
2. Ensure `run.json` and `stamp.json` are archived together to maintain the audit trail.

## Responding to Egress Alerts
While the runner blocks egress by default, any attempts should be logged by the container runtime.
1. Inspect `runtime/logs/` for any "Connection Refused" or similar networking errors in `stderr.log`.
2. Report suspicious outbound attempts to the security team.
