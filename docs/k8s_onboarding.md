# K8s Read-Only Onboarding

## Security Posture
*   **Read-Only**: The connector must only use ServiceAccounts with `get`, `list`, `watch` permissions.
*   **No Secrets**: `kubeconfig` and `token` fields are strictly redacted from all logs and evidence artifacts.
*   **Validation**: The system performs runtime checks to ensure no write permissions are granted.

## Onboarding Steps
1.  Create a ServiceAccount in the target cluster.
2.  Bind to a ClusterRole with read-only access to necessary resources (Nodes, Pods, Events).
3.  Provide the token and endpoint to the connector.

## Evidence
*   Evidence ID: `EVD-DEVOPS-COPILOT-K8S-001` checks for secret redaction.
