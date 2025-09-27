# Summit OIDC Configuration

This document defines the OpenID Connect + JWT profile used by Summit services and third-party relying parties. It covers
issuer metadata, client registration, token content, and security baselines that align with the platform's tenant isolation,
attribute-based access control (ABAC), and privacy guardrails.

## Issuer Metadata

| Setting | Value |
| --- | --- |
| Issuer (`iss`) | `https://id.summit.example.com` |
| Discovery | `https://id.summit.example.com/.well-known/openid-configuration` |
| JWKS | `https://id.summit.example.com/.well-known/jwks.json` (ECDSA P-256, rotated every 24h) |
| Supported Flows | Authorization Code + PKCE (public), Client Credentials (service-to-service) |
| ID Token Signing | `ES256` (preferred) with deterministic `kid` rotation schedule |
| Access Token Format | JWT (audience-scoped), 5 minute lifetime |
| Refresh Tokens | Rotating, 12 hour absolute lifetime, pairwise pseudonymous subject | 

### Environment-Specific Overrides

* **Staging**: sandbox issuer `https://id.staging.summit.example.com`, JWKS rotated every 12h, audience limited to staging APIs.
* **Production**: strict TLS (TLS 1.3 only), OCSP stapling enabled, AIA chasing disabled.

## Client Registration

All OIDC clients are registered via SCIM + admin API workflow. Each client is tagged with:

* `tenant_id`: GUID referencing the Summit tenant.
* `purpose_tags`: One or more approved processing purposes (e.g., `intel-analysis`, `fraud-monitoring`).
* `data_classification`: Highest data classification the client may request.
* `mfa_policy`: `required`, `step-up`, or `not-applicable` (service accounts only).

Clients are provisioned with the following defaults:

```json
{
  "application_type": "web",
  "grant_types": ["authorization_code"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "private_key_jwt",
  "redirect_uris": [
    "https://app.summit.example.com/callback",
    "https://*.tenant.summit.example.com/cb"
  ],
  "post_logout_redirect_uris": [
    "https://app.summit.example.com/signed-out"
  ],
  "default_acr_values": ["urn:summit:mfa:webauthn"],
  "default_max_age": 300
}
```

## Token Claims

### ID Token

* `sub`: Pairwise subject derived from `tenant_id` + user GUID via HKDF (prevents cross-tenant correlation).
* `tenant_id`: Tenant scope used by OPA policies.
* `purpose`: Array of allowed processing purposes; mapped from SCIM `urn:ietf:params:scim:schemas:extension:enterprise:2.0:User.purposeTags`.
* `acr`: Assurance level. `urn:summit:mfa:webauthn` when WebAuthn MFA is satisfied.
* `amr`: Authentication methods, includes `pwd`, `webauthn`, `recovery-code`.
* `legal_hold`: Optional claim asserted by compliance service to indicate records must be retained.
* `iat`, `exp`, `auth_time`: Standard OIDC claims.

### Access Token

JWT access tokens carry ABAC attributes consumed by the OPA sidecar:

| Claim | Description |
| --- | --- |
| `scp` | Fine-grained scopes (e.g., `reports:read`, `reports:classify`). |
| `roles` | Array of Summit roles for the tenant (`analyst`, `manager`, `legal`, `global-admin`). |
| `purpose` | Mirrored from ID token for purpose enforcement. |
| `clearance` | Highest data classification the user can access. |
| `mfa` | Boolean flag set to `true` only when strong MFA satisfied. |
| `audit_session` | Immutable audit handle propagated to logging pipeline. |

Tokens are signed with ECDSA keys stored in the Summit KMS HSM cluster. Access tokens are additionally wrapped using
AES-256-GCM envelope encryption when stored in caches to satisfy at-rest encryption requirements.

## Authorization Server Policies

* **PKCE Required** for all public clients. Server rejects requests without `code_challenge_method=S256`.
* **Nonce Validation**: Clients must send `nonce`; the AS stores hashes in Redis for replay detection (5 minute TTL).
* **Tenant Isolation**: `tenant_id` claim derived from login context; cross-tenant token exchange is disallowed.
* **Purpose Enforcement**: Requested scopes must map to registered purpose tags; mismatches yield `invalid_scope`.
* **Short-Lived PII**: Access tokens with `pii` scopes expire in 5 minutes; refresh tokens rotate with binding to device key.

## Session Management & MFA

* Default Authentication Context Class Reference (`acr`): `urn:summit:mfa:webauthn`.
* WebAuthn MFA binding enforced at first login; resident keys stored in Summit FIDO attestation service.
* Recovery options: FIPS-compliant TOTP fallback or hardware key pair-of-keys. Recovery events logged with immutable audit IDs.
* Session revocation triggers push to SCIM `active=false` and OPA bundle refresh.

## Operational Controls

* **Logging**: All token issuance events write to append-only ledger (`prov-ledger` service).
* **Key Rotation**: JWKS rotated daily; previous key retained for 48 hours for token validation grace.
* **Client Secrets**: Only service accounts receive client credentials; stored in Vault transit engine with one-hour TTL leases.
* **Monitoring**: Prometheus alerts on anomalous token mint rates, issuer response latency, and JWKS drift.

## Integration Checklist

1. Register client via SCIM provisioning workflow.
2. Configure redirect URIs and WebAuthn policy.
3. Fetch discovery document and JWKS at deploy time; cache for 10 minutes.
4. Implement Authorization Code + PKCE; validate `state`, `nonce`, `aud`, `azp`, `acr`.
5. Forward JWT access token to OPA sidecar on each API call; include `audit_session` header for immutable audit linking.
