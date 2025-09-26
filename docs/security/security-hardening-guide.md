### Authentication & Authorization

* OIDC/JWKS SSO; rotate keys; **step‑up auth** for risky actions (WebAuthn)
* **ABAC/RBAC** with policy tags (origin, sensitivity, legal basis, need‑to‑know)
* Redis-backed session store with hashed refresh tokens and SOC2-aligned telemetry

### Session Management

* JWT refresh tokens bound to Redis session state (`session_id`) with per-user revocation
* Idle timeout enforcement (15 minutes default via `SESSION_IDLE_TIMEOUT_MS`) with automatic cleanup
* GraphQL mutations `revokeSession` & `revokeAllSessions` exposed for security responders
* Postgres `user_sessions` table tracks `session_id`, IP, user agent, revoked timestamps for audit
* Ensure Redis high availability and access controls (TLS/auth) for compliance evidence (SOC2 CC6/CC7)

### GraphQL Surface

* Enforce **depth & cost** limits; disable introspection in prod; **persisted queries** only for external clients
* **CSRF** protection, **CORS** default‑deny, **Helmet** headers

### Secrets & Data

* No secrets in images; sealed‑secrets/SOPS
* **Field‑level encryption** for sensitive data; per‑tenant envelope crypto

### Network & Platform

* TLS 1.2+ end‑to‑end; HSTS; minimal egress; namespace & network policies
* Dependency scanning (SBOM), image signing, admission policies

### Audit & Governance

* Immutable audit trails (who/what/why/when)
* Reason‑for‑access prompts; anomaly alerts

### Checklist (ship gate)

* [ ] OWASP A01–A10 covered
* [ ] GraphQL complexity & depth enforced
* [ ] Admin routes behind step‑up auth
* [ ] Backups encrypted + restore drill passing
