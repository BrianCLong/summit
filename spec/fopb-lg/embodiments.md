# Embodiments and Design-Arounds — FOPB-LG

## Alternative Embodiments

- **Module registry:** Modules may include legal metadata, terms-of-service flags, and risk scores, enabling policy-aware selection.
- **Budget accounting:** Privacy budgets can be decremented by lookups, returned bytes, sensitivity classification, or retention duration.
- **Scan modes:** Passive-first defaults can be overridden by validated authorization tokens that explicitly permit active probing.

## Implementation Variants

- **Rate limiting:** Concurrency constraints can be enforced per module, per target, or per tenant to reduce abuse risk.
- **Scan capsule structure:** Capsules may include redacted results, target commitments, module identifiers, and witness chains for auditability.
- **Transparency anchoring:** Capsules can be signed and anchored to append-only transparency logs or immutable ledgers for tamper evidence.

## Design-Around Considerations

- **Tenant isolation:** Target commitments can be salted per tenant to prevent cross-tenant correlation while preserving replay integrity.
- **Retention controls:** Automatic deletion after TTL expiry can be enforced in storage or at capsule import time.
- **Counterfactual planning:** Information gain estimates can be computed for omitted modules without changing module selection semantics.
