# Scope Tokens

## Purpose

Scope tokens bind a request to a classification scope, tenant, purpose, and TTL. They are required for all regulated exports and egress workflows.

## Required Fields

- `token_id`: unique identifier
- `tenant`: owning tenant or coalition
- `purpose`: release, assessment, incident, connector
- `classification`: US-ONLY, COALITION, PARTNER, CUI, NATO-RESTRICTED
- `issued_at`, `expiration`
- `audience`: service or workflow
- `policy_version`: policy bundle version

## Validation Rules

- `expiration` must be >= request time.
- `classification` must be in the allowed scope set.
- `tenant` and `purpose` must be non-empty.
- All validations enforced by `intelgraph.policy.contracting`.

## Evidence

- Token issuance logs
- Policy decision log entry
- Replay token binding to scope token ID
