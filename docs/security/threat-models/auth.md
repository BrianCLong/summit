# Threat Model: Authentication & Identity

- **Feature:** Authentication & Identity
- **Owner:** Identity & Security Engineering
- **Last updated:** 2025-12-06
- **Review cadence:** Quarterly or when auth flows change

## Assets
- User identities, credentials, MFA secrets, and session tokens.
- OAuth/OIDC client secrets, signing keys (JWT, mTLS), and refresh tokens.
- Audit trails for login, consent, and admin actions.

## Entry points
- Public auth endpoints (login, refresh, password/MFA flows, device enrollment).
- SSO/OIDC redirect and callback handlers.
- Admin/tenant provisioning APIs that create or elevate identities.
- Service-to-service authentication (mTLS, workload identity) and CLI tokens.

## Trust boundaries
- Public internet to edge/API gateway.
- External IdPs to internal token issuance/validation services.
- Tenant-scoped policy evaluation vs. platform-wide admin actions.
- Session/token storage vs. runtime validation components.

## Threats (STRIDE + abuse/misuse)
- **Spoofing:** Token replay, phishing of credentials/MFA, forged IdP assertions.
- **Tampering:** Token signing key theft, cookie/session manipulation, redirect parameter tampering.
- **Repudiation:** Missing or incomplete audit trails for login/admin events.
- **Information disclosure:** Leaked tokens/secrets in logs; verbose error messages revealing account state; token audience misconfiguration.
- **Denial of service:** Credential stuffing, MFA bombing, auth endpoint flooding.
- **Elevation of privilege:** Cross-tenant role escalation, privilege creep from mis-scoped roles, JWK confusion attacks.
- **Abuse & misuse:** Social engineering via auth emails/SMS; delegated access scopes abused by automation/LLM tools.
- **Supply chain & delivery:** Dependency vuln in auth libraries; unsigned tokens or misconfigured key rotation pipeline.

## Mitigations
- Enforce MFA and WebAuthn where available; rate limit and CAPTCHA high-risk flows.
- Use short-lived tokens with audience binding, rotation for refresh tokens, and strict cookie settings (HttpOnly, Secure, SameSite=Lax/Strict).
- Validate issuer/audience/kid on every request; pin JWKs and rotate signing keys with audit.
- Harden redirect handling (allow-list return URLs) and validate PKCE for public clients.
- Centralize policy evaluation with tenant-aware RBAC/ABAC; least-privilege scopes for automation/LLM tools.
- Continuous credential-stuffing detection, IP/ASN reputation checks, and anomaly-based alerts for login patterns.
- Immutable audit logging for auth events; periodic review of admin role assignments.

## Residual risk and follow-ups
- Ensure incident runbooks cover large-scale credential stuffing and session invalidation.
- Validate third-party IdP integrations for downgrade risks and metadata signing requirements.
- Track completion of hardware-backed key storage for signing keys (HSM/KMS) and automated rotation alarms.
