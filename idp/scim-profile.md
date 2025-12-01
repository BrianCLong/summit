# Summit SCIM Provisioning Profile

This profile describes how Summit automates workforce and service-account lifecycle management using SCIM 2.0. The goal is to
ensure tenant isolation, rapid deprovisioning, and synchronized attributes for ABAC, WebAuthn MFA, and privacy controls.

## Base Endpoints

| Resource | Endpoint | Notes |
| --- | --- | --- |
| Users | `/scim/v2/Tenants/{tenantId}/Users` | Tenant-scoped, requires OIDC client with `scim:write` scope. |
| Groups | `/scim/v2/Tenants/{tenantId}/Groups` | Used for role assignment + purpose tags. |
| Service Principals | `/scim/v2/Tenants/{tenantId}/ServicePrincipals` | Machine identities, `client_credentials` only. |
| Bulk | `/scim/v2/Tenants/{tenantId}/Bulk` | Limited to 100 operations per request, rate-limited (see misuse tests). |

All endpoints require:

* `Authorization: Bearer <access_token>` signed by Summit OIDC issuer with `scp` containing `scim:write` or `scim:read`.
* `X-Summit-Audit-Session` header to correlate with immutable audit logs.
* mTLS for transport + TLS 1.3.

## Schema Extensions

### User Resource

```json
{
  "schemas": [
    "urn:ietf:params:scim:schemas:core:2.0:User",
    "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User",
    "urn:summit:scim:schemas:security:1.0"
  ],
  "urn:summit:scim:schemas:security:1.0": {
    "tenantId": "8e73a3f4-...",
    "roles": ["analyst", "manager"],
    "purposeTags": ["intel-analysis"],
    "clearance": "restricted",
    "mfa": {
      "enrolled": true,
      "methods": ["webauthn", "totp"],
      "recoveryCodesIssued": "2025-03-01T00:00:00Z"
    },
    "legalHold": false
  }
}
```

Additional fields:

* `mfa.methods`: MUST include `webauthn` once a credential is registered.
* `purposeTags`: Drives OPA purpose enforcement and privacy minimisation maps.
* `legalHold`: When true, overrides 30-day retention expiry for affected resources.

### Group Resource

Groups encapsulate Summit roles and application access policies.

```json
{
  "displayName": "tenant-a:reports-analyst",
  "members": [{ "value": "user-guid" }],
  "urn:summit:scim:schemas:governance:1.0": {
    "role": "analyst",
    "purposeTags": ["intel-analysis"],
    "dataClassification": "confidential"
  }
}
```

## Provisioning Flows

### Onboarding

1. HRIS triggers SCIM POST `/Users` with base profile + WebAuthn placeholder (`mfa.enrolled=false`).
2. Summit issues invitation; user must enroll WebAuthn before `active=true` is set.
3. Once WebAuthn attestation completes, `mfa.enrolled` toggled to `true` and `methods` includes credential `credentialId` hash.
4. Group assignments propagate roles + purpose tags; OPA bundle refresh occurs within 60 seconds.

### Update

* Attribute updates use PATCH with `path` operations (RFC 7644). Only changed fields are accepted.
* Purpose changes require governance approval; SCIM PATCH validated by policy engine before commit.
* When `mfa.enrolled` transitions to `false`, Summit forces session revocation and sets `force_reauth=true` in ID token session store.

### Deprovisioning

1. SCIM PATCH `active=false` triggers:
   * Immediate token revocation via OIDC back-channel logout.
   * WebAuthn credential disablement + attestation log entry.
   * Data minimisation workflow to wipe PII beyond 30 days while respecting `legalHold`.
2. After 30 days of inactivity, user record is cryptographically tombstoned (hash of subject ID stored for audit).

### Service Account Lifecycle

* Service principals require Vault-managed signing keys; `mfa` omitted.
* `purposeTags` limited to machine-to-machine contexts (e.g., `etl-ingest`).
* Rotation: SCIM PATCH rotates signing certificates every 7 days via `x509Certificates` attribute.

## SCIM -> Summit Mapping

| SCIM Field | Summit Target | Notes |
| --- | --- | --- |
| `userName` | Login username (lowercase) | Unique per tenant. |
| `externalId` | HRIS identifier | Stored encrypted-at-rest using envelope keys. |
| `emails[type eq "work"].value` | Notification address | Verified via challenge email on onboarding. |
| `phoneNumbers[type eq "mobile"].value` | WebAuthn recovery SMS (optional) | Stored encrypted with per-tenant DEK. |
| `urn:summit:scim:schemas:security:1.0.purposeTags` | OPA `purpose` claim + privacy map | Max 5 tags per identity. |
| `groups` | Roles & scopes | Each group maps to OPA role/purpose statements. |

## Error Handling & Monitoring

* SCIM responses include `schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"]` with correlation ID header `X-Summit-Correlation`.
* Rate limit: 120 write ops/min per tenant; violation returns HTTP 429 with retry-after.
* Provisioning audit events stored in append-only ledger and forwarded to SIEM via syslog over TLS.
* SCIM bulk operations validated against OPA simulation pipeline before commit; failing operations rolled back atomically.

## Privacy & Security Controls

* PII attributes flagged in catalog are encrypted in transit (TLS 1.3) and at rest (field-level AES-256-GCM + KMS envelope keys).
* Purpose tags enforced for every SCIM mutating call; mismatches rejected with `403`.
* Immutable audit: every SCIM change writes to ledger with event hash anchored in Summit transparency log.
* Legal hold support: `legalHold=true` prevents automated deletion until compliance system clears the flag.
