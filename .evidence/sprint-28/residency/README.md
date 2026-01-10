# Sprint 28 — Residency Guardrails Evidence

This folder stores enforcement artifacts for Epic B (tenant residency guardrails).

Include:

- `allow-deny-cases.md`: deterministic matrix of allow/deny outcomes for tenant/region combinations.
- `audit-events.ndjson`: sample audit events capturing tenant, requested region, allowed regions, and decision.
- `policy-deny-response.json`: customer-readable deny payload example.

Every artifact should be deterministic and redact secrets. Keep timestamps in ISO-8601.
