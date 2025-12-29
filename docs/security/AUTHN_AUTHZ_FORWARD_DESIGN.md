# CompanyOS Authentication & Authorization Design (Forward-Leaning)

## Purpose & Scope

This document defines a production-grade authentication and authorization design for CompanyOS covering passwordless, OIDC, and SAML SSO, optional SCIM provisioning, fine-grained RBAC with ABAC overlays, and forward-leaning controls (DPoP/mTLS-bound tokens, signed sidecar decisions, cryptographic audit ledger, and adaptive risk-based authentication). The design targets least privilege by default, full auditability, and a clear path to SOC2-style controls without slowing developer velocity.

## High-Level Architecture

- **Identity Providers (IdPs):** OIDC and SAML IdPs with metadata pinning; optional SCIM for provisioning. Magic-link/passwordless service for first-party auth.
- **Auth Gateway:** Terminates TLS/mTLS, handles login flows, token issuance, refresh rotation, device binding, CSRF protection, and session store. Issues short-lived access tokens and rotating refresh tokens.
- **Authorization Service (Policy Engine):** Central policy-as-code engine (OPA/Rego or Cedar-style) evaluating RBAC + ABAC; exposes signed decision envelopes. Runs as service and optional sidecar cache at service edges.
- **Resource APIs / Services:** Enforce authz via signed decisions; consume tenant-bound PoP tokens for sensitive scopes. Emit audit events with correlation IDs.
- **Cryptographic Audit Ledger:** Append-only log with hash chaining and periodic anchoring to external timestamping authority/KMS; supports tamper-evident verification.
- **Observability & Risk Scoring:** Telemetry pipeline calculating device posture, geo-velocity, and anomaly signals to trigger step-up MFA.

## Threat Model (Top 10 + Mitigations)

1. **Credential phishing or replay** — Default to WebAuthn/passwordless; enforce PKCE, `state`/`nonce`, TLS 1.2+; bind tokens to device via DPoP/mTLS for high-sensitivity scopes.
2. **Token theft (access/refresh/session cookies)** — HttpOnly + `SameSite=strict` cookies, encrypted at rest; rotating refresh tokens with reuse detection; DPoP/mTLS for export/admin scopes; audience scoping and short TTLs.
3. **SSO assertion forgery or misconfiguration** — Validate issuer/audience, `nonce`, `InResponseTo`, `NotBefore/NotOnOrAfter`; sign+encrypt SAML assertions; pin IdP metadata and certificates; contract tests for IdP configs.
4. **Privilege escalation via policy gaps** — Deny-by-default RBAC; ABAC constraints (tenant/resource ownership, clearance, device trust); policy unit tests and versioning; no implicit admin grants.
5. **Broken session management** — Idle and absolute timeouts; refresh rotation; device/IP heuristics; server-side session index with revocation; step-up MFA on anomalies.
6. **Insider misuse or unapproved admin actions** — Dual-control for policy/role changes; break-glass roles time-bound with justification; exhaustive audit trails; continuous access reviews.
7. **API abuse and over-permissioned integrations** — Fine-grained scopes, per-client audiences/keys; rate limiting; SCIM scoping; consent and least-privilege defaults; signed decisions to prevent tampering.
8. **Tenant isolation failure or data exfiltration** — Embed `tenant_id` in tokens and enforce in policy; row/column filters; per-tenant encryption keys where feasible; egress monitoring.
9. **CSRF/replay on web flows** — `SameSite=strict` + CSRF tokens; one-time magic links with IP/UA hash; OIDC PKCE + `state` + `nonce`.
10. **Audit log tampering** — Append-only, hash-chained ledger anchored to external timestamping/KMS; integrity verification tooling; least-privilege log access and WORM retention.

## Authentication Flows

### Passwordless / Magic Link (Optional)

- Generate single-use JWE/JWT link token containing `sub`, `email`, `nonce`, `exp`, `aud`, `ip_hash`, `ua_hash`; TTL ≤10 minutes.
- Validate signature, TTL, replay counter, IP/UA hash (warn on soft mismatch), and rate-limit sends; issue access (5–15 min) + rotating refresh tokens upon success.
- Store only hashed token references server-side; invalidate on first use or after TTL.

### OIDC

- Authorization Code + PKCE; require `state`, `nonce`, `pkce_verifier`, `aud`.
- Validate issuer, JWKS, `exp`, `iat`, `aud`, `nonce`, `azp`; enforce `acr`/`amr` for step-up.
- Map claims via allowlisted claim mapper; reject oversized/unrecognized claims; provision via SCIM or JIT to least-privilege role.

### SAML

- Prefer SP-initiated; signed + encrypted assertions.
- Validate `Issuer`, `Audience`, `InResponseTo`, `NotBefore/NotOnOrAfter`, `SubjectConfirmationData` recipient/address.
- Attribute allowlist with group→role mapping through policy engine; maintain dual certificates for rotation and pin metadata signatures.

## RBAC & Optional ABAC

### Core Roles (least-privilege defaults)

- `viewer`: Read-only within tenant; no exports.
- `analyst`: Create non-privileged artifacts; limited sharing.
- `operator`: Manage ingestion/connectors within tenant; no user admin.
- `auditor`: Read-only to audit logs/reports; no modifications.
- `admin`: Manage users/roles within tenant; cannot invoke break-glass.
- `org_admin`: Cross-tenant org-scope admin; cannot bypass break-glass.
- `break_glass_admin`: Time-bound, dual-approved; forced MFA and heightened audit.

### Permissions (examples)

`data:read`, `data:write`, `data:share`, `data:export`, `connector:manage`, `user:invite`, `role:assign`, `policy:manage`, `audit:view`, `audit:export`, `admin:break_glass`.

### Scopes

- API/client scopes prefixed by domain (e.g., `graph.read`, `graph.write`, `audit.read`, `admin.manage`).
- Issue minimal scopes per client; bind to audience/client ID.

### ABAC Overlay

- Attributes: `tenant_id`, `org_id`, `department`, `clearance_level`, `data_classification`, `ownership`, `region`, `device_trust_level`, `mfa_strength`, risk score.
- Example policy: `data:export` allowed only if `classification <= org_policy.max_export_class` AND `device_trust_level >= medium` AND `risk_score <= threshold` AND `mfa_strength >= high`.

## Permission Evaluation & Caching

```pseudo
function authorize(request):
  ctx = build_context(request) // actor, roles, attrs, resource, action, tenant, device, mfa_strength, risk_score
  if ctx.action in high_risk_actions:
    return fresh_eval(ctx)
  cached = decision_cache.get(ctx.fingerprint)
  if cached and cached.is_fresh():
    return cached
  return fresh_eval(ctx)

function fresh_eval(ctx):
  if !rbac.has_permission(ctx.roles, ctx.action):
    return DENY("missing_permission")
  if abac.enabled and !abac.evaluate(ctx.attributes, ctx.resource, ctx.action):
    return DENY("attribute_policy_failed")
  if ctx.actor.tenant_id != ctx.resource.tenant_id:
    return DENY("tenant_mismatch")
  decision = ALLOW with obligations // masking, step-up indicators, cache TTL
  signed_decision = sign(decision, policy_pub_key)
  decision_cache.put(ctx.fingerprint_with_policy_version, signed_decision, ttl=60s, soft_ttl=30s)
  return signed_decision
```

**Caching Strategy**

- Layered caches: in-process LRU (≤60s) + distributed cache (e.g., Redis) keyed by HMAC(actor, roles, attrs hash, resource, action, policy_version, roles_etag).
- Invalidate on policy or role changes; subscribe to revocation events. Do not cache break-glass or step-up-required actions.
- Services verify signature on decision envelopes; reject stale policy versions.

## Audit Logging Requirements

- **What:** Auth events (login success/failure, MFA, magic-link send/use), token issuance/refresh/revocation, role/permission changes, policy changes, SCIM actions, connector changes, data exports, admin/break-glass activity, access denials, overrides.
- **When:** Before and after state changes; during authz decisions for privileged actions.
- **Who/Where:** Actor ID, human principal, client/app ID, IdP, tenant/org, source IP, geo (coarse), device/browser fingerprint, mTLS client cert (if any).
- **Correlation:** `trace_id`, `session_id`, `request_id`, `decision_id`; propagate via `traceparent`/`x-correlation-id` headers.
- **Integrity & Storage:** Append-only log with hash chaining; periodic anchoring to external timestamping authority or KMS-signed checkpoints; WORM retention with least-privilege access.

## Data Protection

- **In transit:** TLS 1.2+ everywhere; HSTS; mTLS service-to-service; certificate pinning for IdP metadata fetch.
- **At rest:** AES-256-GCM; per-tenant DEKs wrapped by KMS; sensitive columns encrypted; secrets in vault with rotation automation.
- **Token storage:** Access tokens in memory; refresh tokens in HttpOnly `SameSite=strict` secure cookies (web) or secure OS storage (native). Store only hashed refresh tokens server-side.
- **Privacy:** Collect minimal PII; support data subject requests; monitor for overbroad claims.

## Session Management

- Access tokens: 5–15 minute TTL. Refresh tokens rotate on every use with reuse detection → revoke session on suspicious reuse.
- Idle timeout: 30–60 minutes; absolute timeout: 12–24 hours (shorter for high-risk roles).
- Server-side session index supports revocation on logout, credential changes, device risk, or admin action; push revocation events to caches.
- Device tracking: maintain device ID, last IP/UA, first/last seen; require step-up on device or geo-velocity anomalies.

## Admin Actions & Break-Glass Protocol

- Privileged actions require corresponding permission plus dual-control for role/policy changes.
- Break-glass: human approval + justification, time-bound token/role (e.g., 1 hour), forced MFA, fresh policy evaluation (no cached decisions), high-visibility alerts, mandatory post-incident review.

## Forward-Leaning Enhancements

- **Proof-of-Possession Tokens:** Use DPoP or mTLS-bound access tokens for sensitive scopes (admin, export, policy changes). Tokens include cnf (confirmation) with key binding; resource servers verify PoP proof or client cert on each request.
- **Signed Authorization Decisions with Sidecar Caches:** Policy engine signs decision envelopes; sidecars at service edges cache and validate signatures to minimize latency while ensuring integrity. Decisions carry policy version to enable revocation on updates.
- **Cryptographic Audit Ledger:** Hash-chain audit entries; anchor digests periodically to external timestamping authority or KMS/HSM-backed signing key; provide verification tooling for compliance evidence.
- **Adaptive Risk-Based Authentication:** Compute risk score using device posture, geo-velocity, IP reputation, session age, and behavior anomalies. Trigger step-up MFA, deny, or limit scopes when risk exceeds thresholds; log risk factors for audit and tuning.

## Operational Requirements & SOC2 Alignment

- Least-privilege defaults for new users and clients; deny-by-default policies.
- Policy-as-code with version control, CI tests, and change approvals; evidence artifacts retained for audits.
- Immutable audit pipeline with integrity proofs; automated access reviews and certification exports.
- Developer velocity preserved via self-serve IdP onboarding templates, mock IdP harness, and signed decision caching.

## Implementation Checklist

- [ ] Enforce DPoP/mTLS for `admin` and `data:export` scopes.
- [ ] Enable signed decision envelopes and verify at service edges; implement cache invalidation on policy change events.
- [ ] Deploy hash-chained audit ledger with external anchoring scheduler and verification CLI.
- [ ] Integrate adaptive risk engine with telemetry inputs; gate high-risk actions with step-up MFA.
