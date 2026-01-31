# Security: Secrets Hygiene & Never-Log Policy

Summit enforces strict controls to prevent sensitive data leakage into logs or evidence artifacts.

## Never-Log Fields
The following fields must never be logged or stored in plain text:
- Kubeconfig contents
- `VCLUSTER_ACCESS_KEY`
- `LOFT_ACCESS_KEY`
- Authentication tokens

## Mitigations
1. **Environment Filtering**: `VClusterCLI` explicitly removes sensitive keys from the environment before execution.
2. **Log Scanning**: CI gates (`gate_no_secret_logs`) scan all workflow outputs for patterns resembling secrets.
3. **Redaction**: Stderr and stdout are defensively redacted where possible.

## Compliance
Failure to adhere to the Never-Log policy results in a build failure and requires an immediate audit.
