# SCIM Provisioning & WebAuthn MFA Flows

## Provisioning lifecycle
1. **Onboard tenant** – Admin registers tenant metadata via control plane; provisioning webhook triggers SCIM `/Groups` creation for `tenant:{id}:analyst`, `tenant:{id}:investigator`, `tenant:{id}:admin`.
2. **Just-in-time user sync** – Identity provider posts to `/scim/v2/Users` with attributes:
   - `userName`, `active`, `emails`, `urn:ietf:params:scim:schemas:extension:intelgraph:1.0:tenant` (contains `tenantId`, `defaultRole`, `purposeTags`).
   - OPA policy requires at least one purpose tag; defaults to `investigation` if none provided.
3. **Deprovision** – `active=false` triggers webhook that revokes tokens, rotates WebAuthn credentials, and writes immutable audit record with policy hash.
4. **Group reconciliation** – Nightly job cross-checks SCIM groups vs. policy bundles; missing purpose tags or stale roles raise alerts.

## Attribute mapping

| SCIM Attribute | OIDC Claim | OPA Input Field | Notes |
| -------------- | ---------- | --------------- | ----- |
| `userName` | `preferred_username` | `subject.id` | Immutable identifier |
| `urn:intelgraph:tenant.tenantId` | `tenant_id` | `subject.tenant_id` | Denormalized into JWT and audit logs |
| `urn:intelgraph:tenant.purposeTags` | `purpose_tags` | `subject.purpose_tags` | Must include purpose matching legal basis |
| `groups` | `roles` | `subject.roles` | Synchronized to ABAC role catalog |

## WebAuthn MFA integration

1. **Registration**
   - During SCIM user activation, webhook calls AuthZ Gateway `/mfa/webauthn/register` to mint challenge bound to `tenantId` and `purposeTags`.
   - Device attests using FIDO2; public key, credential ID, and attestation format stored in DynamoDB encrypted with `cmk/webauthn`.
2. **Authentication**
   - High-risk API actions (OPA `step_up_required`) call AuthZ Gateway to verify WebAuthn assertion using stored credential.
   - Gateway updates assurance claim to `loa3`/`loa4` and logs WebAuthn policy obligation satisfaction in audit ledger.
3. **Recovery**
   - SCIM `active=false` or `passwordReset=true` triggers credential invalidation and requires new registration.
   - Backup WebAuthn keys limited to two per user; additional keys require admin approval recorded in audit ledger.

## Policy simulation in CI
- Synthetic SCIM payloads run through `scripts/policy-simulate.js` (invoked by CI) to guarantee purpose tags and retention tiers are honored before merge.
- Red-team misuse tests include:
  - Attempted group escalation (`tenant:other:admin`) → denied by OPA `tenant_scope_violation`.
  - WebAuthn downgrade by setting assurance to `loa1` on high-risk action → yields `mfa` obligation and CI failure.
