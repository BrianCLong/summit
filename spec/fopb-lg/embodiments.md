# Embodiments and Design-Arounds — FOPB-LG

## Alternative Embodiments

- **Module gating:** Module registry metadata can encode jurisdiction, terms-of-service tiers, or sensitivity classifications; selection logic may be rule-based or policy-engine driven.
- **Budget enforcement:** Privacy budgets can be enforced via token buckets, credit ledgers, or differential cost functions that weigh bandwidth, query count, and retention windows.
- **Capsule form factors:** Scan capsules can be emitted as encrypted bundles, signed JSON manifests, or graph-ingestable artifacts while preserving ledger and replay token structure.

## Design-Around Considerations

- **Passive-first defaults:** Systems may restrict active probing to sandboxed environments or dedicated tenants, with passive mode remaining default to satisfy risk controls.
- **Transparency anchoring:** Transparency logs can be internal append-only stores or anchored to external timestamping services; digests rather than raw results can be logged to limit exposure.
- **Target commitments:** Target identifiers can be salted per tenant or per scan to prevent cross-tenant correlation while still enabling replay and governance checks.
