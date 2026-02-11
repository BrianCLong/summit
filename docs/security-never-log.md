# Security: Never-Log Policy

Summit enforces a strict never-log policy for sensitive information such as kubeconfigs, tokens, and access keys.

## Implementation
The `VClusterCLI` wrapper automatically redacts sensitive environment variables and potential secret patterns from its output and error messages.

## Policy Gates
A CI gate `gate_no_secret_logs.py` is used to detect potential secret leakage in logs and artifacts.

## Prohibited Fields
- `KUBECONFIG`
- `VCLUSTER_ACCESS_KEY`
- `LOFT_ACCESS_KEY`
- Any string matching private key or kubeconfig patterns.
