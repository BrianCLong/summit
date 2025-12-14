---
feature: Authentication & Session Management
owner: Identity & Access (iam-security@summit)
service-area: auth / edge gateways
last-updated: 2026-05-08
review-cadence: quarterly
---

## Assets
- User identities, SSO assertions (SAML/OIDC), MFA secrets, recovery flows.
- Session tokens/JWTs, refresh tokens, service-to-service credentials.
- Passwordless/WebAuthn registrations, device binding info, IP reputation signals.
- Audit trails for login, token issuance, revocation, and admin overrides.

## Entry Points
- Public auth endpoints (login, refresh, logout, device registration) behind edge gateways.
- Admin impersonation/just-in-time elevation endpoints.
- Service-to-service token minting (client credentials, workload identity).
- SDK/client auth helpers and mobile/desktop clients.

## Trust Boundaries
- Internet to edge gateway (TLS termination, DDoS/WAF controls).
- Gateway to authz-gateway/services (token validation, session store).
- Tenant-to-tenant isolation in shared auth infrastructure (no token leakage across tenants).
- Third-party IdPs (SAML/OIDC), email/SMS providers for OTP delivery.

## Threats (STRIDE + misuse)
- **Spoofing**: Credential stuffing, MFA bypass, forged IdP assertions, token replay, device binding forgery.
- **Tampering**: Token signature/header manipulation, downgrade of signing algorithms, session fixation.
- **Repudiation**: Lack of non-repudiation for admin overrides; incomplete login/audit coverage.
- **Information Disclosure**: Verbose error messages leaking account state; token leakage via logs; phishing via magic-link reuse.
- **Denial of Service**: Auth endpoint flooding, MFA SMS/email abuse, cache exhaustion for rate limits.
- **Elevation of Privilege**: Weak role binding, missing step-up for sensitive routes, stolen refresh tokens.
- **Abuse/misuse & supply chain**: Malicious dependency in auth middleware, OTP provider compromise, unsafe default session lifetimes.

## Mitigations
- Enforce MFA/step-up for admin flows; WebAuthn support; device binding with replay protection.
- Token hardening: asymmetric signing (rotated keys), `aud`/`iss` validation, short-lived access tokens with revocation list.
- Rate limits + IP reputation + credential stuffing detection; WAF rules on auth endpoints.
- Strict error hygiene and telemetry redaction; no tokens in logs; signed magic links with nonce + expiry.
- Admin impersonation requires break-glass approvals + audit trails; binding of roles to tenants; least-privilege scopes.
- Dependency allowlist and checksum validation for auth middleware; provider failover for OTP; transport `TLS1.2+` everywhere.

## Residual Risk
- SMS/email OTP phishing remains; mitigated by WebAuthn adoption goal (target: ≥60% coverage by Q3).
- Reliance on third-party IdPs for assertion quality; monitor via anomaly detection and contract controls.
- Short-lived outages at OTP providers can degrade login UX; ops runbook covers provider failover within 15 minutes.
