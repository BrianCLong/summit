# Decision Guide: Choosing Scopes and Budgets

## Scopes

- **Minimal default:** `agent:invoke`, `provenance:read`, `billing:read`.
- **Add `data:read`:** Only when ingestion or data retrieval is required.
- **Avoid:** `policy:write`, `tenant:admin`, or wildcard scopes during onboarding.

## Budgets and Rate Limits

- Start with **$5.00 (500 cents) per tenant** and **5 RPS**.
- Lower caps for partners or sandboxes (e.g., 2 RPS and $3.00).
- Raise caps only after a successful, violation-free run history is recorded in provenance.

## Expiration and Rotation

- Keep tokens short-lived (≤1 hour) and rotate before 50% of TTL.
- Refresh budgets daily during pilot phases to avoid runaway costs.

## Review Checklist

- Does the scope map to a documented use case?
- Are cost caps set per-run and per-tenant?
- Are provenance exports enabled for audit?
