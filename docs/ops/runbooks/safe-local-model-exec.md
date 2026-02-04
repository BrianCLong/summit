# Runbook: Safe Local Model Execution

## Operator Checklist
1.  **Verify Model**: Check `policies/model-allowlist.json` for the model's SHA256.
2.  **Define Egress**: Ensure `policies/egress-allowlist.json` is set to `deny_all: true` unless external API access is strictly required.
3.  **Run Launcher**: Execute `runtime/run.sh` with required environment variables.
4.  **Verify Receipt**: Confirm `runtime/receipts/<id>.json` was generated and status is `finished`.

## Troubleshooting Policy Failures

### `POLICY_FAIL: Digest mismatch`
- **Cause**: The model weights on disk do not match the allowlisted SHA256.
- **Action**: Check if weights were corrupted or if the allowlist needs updating with the new version's hash.

### `POLICY_FAIL: Dangerous mount detected`
- **Cause**: Attempted to mount a sensitive path (e.g., `~/.ssh`, `~/.aws`, repo root).
- **Action**: Move input data to a dedicated `/data` directory and mount only that path.

### `POLICY_FAIL: Egress policy must be deny-by-default`
- **Cause**: `deny_all` is set to `false` in a context where it is mandatory.
- **Action**: Set `deny_all: true` in `policies/egress-allowlist.json`.

## Incident Response

### Unexpected Egress Attempt
- **Alert**: `event=egress_attempt` in audit logs.
- **Action**:
    1.  Kill the running container immediately.
    2.  Revoke any ephemeral tokens injected into the environment.
    3.  Quarantine the model weights for analysis.
    4.  Update `policies/egress-allowlist.json` to be more restrictive.

### Token Exposure / Crash Dump
- **Action**:
    1.  Rotate any secrets that were present in the environment at the time of the crash.
    2.  Purge the crash dump if it contains PII or secrets.
    3.  Verify `ulimit -c 0` was correctly applied.
