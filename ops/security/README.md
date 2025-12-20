# Security Operations

Configuration snippets and deployment checklists for production-grade security posture.

- `spire-server.conf` — minimal SPIRE server configuration for issuing SVIDs.
- `vault-policy.hcl` — example Vault policy granting per-service lease.
- `envoy-mtls.yaml` — sample Envoy filter for enforcing mTLS.
- `deployment-checklist.md` — end-to-end security preflight, RBAC, mTLS, ingress TLS, external secrets (with inline secret failsafes), and audit logging validation steps.
