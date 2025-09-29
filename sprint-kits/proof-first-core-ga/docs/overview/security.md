# Security and Policy Guardrails

- Enforce OIDC + WebAuthn step-up for export actions.
- Route export and query execution checks through OPA (with policy dry-run endpoint).
- Ensure audit logs for merges and exports include user, reason, timestamp, and policy identifier.
