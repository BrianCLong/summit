# Sprint 28 — Residency Enforcement Evidence

Artifacts here demonstrate Epic B residency guardrails.

Include:

- `tenant-residency-config.json`: sample allowed regions per tenant.
- `allow-deny-cases.md`: documented test matrix for allowed/blocked operations (exports, replication, job dispatch).
- `audit-events.json`: canonical audit samples with `tenant`, `requested_region`, `allowed_regions`, and `decision` fields.
- `error-contract.md`: deterministic error payload and HTTP/GRPC status mapping for policy denials.

Logs should be sanitized and reproducible with seeds or fixture identifiers.
