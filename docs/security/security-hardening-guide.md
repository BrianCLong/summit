### Authentication & Authorization

- OIDC/JWKS SSO; rotate keys; **step‑up auth** for risky actions (WebAuthn)
- **ABAC/RBAC** with policy tags (origin, sensitivity, legal basis, need‑to‑know)

### GraphQL Surface

- Enforce **depth & cost** limits; disable introspection in prod; **persisted queries** only for external clients
- **CSRF** protection, **CORS** default‑deny, **Helmet** headers

### Secrets & Data

- No secrets in images; sealed‑secrets/SOPS
- **Field‑level encryption** for sensitive data; per‑tenant envelope crypto

### Network & Platform

- TLS 1.2+ end‑to‑end; HSTS; minimal egress; namespace & network policies
- Dependency scanning (SBOM), image signing, admission policies

### Audit & Governance

- Immutable audit trails (who/what/why/when)
- Reason‑for‑access prompts; anomaly alerts

### Checklist (ship gate)

- [ ] OWASP A01–A10 covered
- [ ] GraphQL complexity & depth enforced
- [ ] Admin routes behind step‑up auth
- [ ] Backups encrypted + restore drill passing
