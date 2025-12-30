# Correlation Token Primitive

Defines scoped correlation tokens that constrain identifier linking operations.

## Token Fields
- **Identifier Type Set**: allowed identifier categories.
- **Max Hop Count**: link creation depth limit.
- **Time-to-Live**: validity duration for correlation authority.
- **Egress Limit**: byte budget or disclosure constraint.
- **Jurisdiction**: region-specific policy enforcement selector.
- **Replay Token**: module versions and time window binding.

## Enforcement
- Token signature verification binding tenant and purpose.
- Link creation blocked beyond hop count or outside allowed identifier set (stored redacted/hashed).
- Egress guard for result export with redaction.
- Token decisions cached per TTL; enforcement optionally attested by TEE.

## Receipts
- Linkage receipt recorded in append-only ledger with hash chaining.
- Optional counterfactual token analysis estimating information loss for tighter scopes.
