---
title: Support impersonation & tenant health bundles
summary: Policy-gated impersonation and redacted health bundle evidence.
owner: support
---

## Support impersonation (policy-gated)

Support impersonation is a governed exception. It is only allowed when the
policy engine and the allowlist rules both approve the request.

**Entry points**

- `POST /api/v1/support/impersonation/start`
- `POST /api/v1/support/impersonation/stop`

**Required inputs**

- `targetUserId`
- `targetTenantId`
- `reason` (justification is mandatory)
- `ticketId` (optional but recommended)

**Receipts and evidence**

Every start/stop action emits a provenance receipt recorded in the ledger with:

- `IMPERSONATION_START` / `IMPERSONATION_STOP` action types.
- `SupportImpersonationSession` resource type and the session ID as the resource ID.
- A signed receipt containing the input hash, policy decision ID, actor, target,
  and the provenance entry ID.

## Tenant health bundle export (redacted)

Tenant health bundles are exported with enforced redaction and explicit
allowlisted fields. The bundle is a JSON artifact intended for support and
compliance review.

**Entry point**

- `POST /api/v1/support/tenant-health-bundle`

**Required inputs**

- `tenantId`
- `reason` (justification is mandatory)

**Redaction policy**

- Rules applied: `pii`, `financial`, `sensitive`.
- Only allowlisted fields are emitted; any other fields are masked with
  `[REDACTED]`.
- Redaction metadata is returned alongside the bundle to document the applied
  policy.

**Evidence content**

The bundle includes an `evidence` section with:

- `source`: service identifier (`TenantHealthBundleService`).
- `receiptIds`: policy decision receipt IDs used for the export gate.
- `provenanceEntryIds`: reserved for provenance references as evidence grows.

## Enforcement references

- Allow rules: `server/src/policies/support.ts`.
- Policy gating: `server/src/services/support/SupportPolicyGate.ts`.
- Receipts: `server/src/provenance/impersonation-receipts.ts`.
