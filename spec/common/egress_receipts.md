# Egress Receipts

## Purpose

Egress receipts provide tamper-evident summaries of network activity during
sandboxed module execution. They enable enforceable passive-only policies and
compliance auditing.

## Receipt fields

- Destination categories and endpoints (hashed or labeled).
- Method summaries (GET/POST) and byte counts.
- Enforcement events (rate-limit hits, halts).
- Determinism token and module version metadata.

## Commitments

- Maintain a hash chain over egress events.
- Store digest in transparency log for auditability.

## Policy evaluation

- Compare receipt totals to egress budget thresholds.
- Validate destination classes against allowed lists.
- Emit compliance decision identifiers bound to subject and purpose.
