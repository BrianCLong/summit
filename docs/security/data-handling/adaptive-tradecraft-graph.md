# Data Handling: Adaptive Tradecraft Graph (ATG)

## Readiness & Authority

- Summit Readiness Assertion: `docs/SUMMIT_READINESS_ASSERTION.md`
- Governance anchors: `docs/governance/CONSTITUTION.md`, `docs/governance/META_GOVERNANCE.md`

## Never-Log List

- Raw message bodies or attachments
- HR sensitive attributes
- Secrets, tokens, or credentials

## Permitted Storage (normalized)

- TECF-normalized events
- ESG overlays and snapshots
- Evidence hashes and signatures
- Derived aggregates (ERI, fragility, bundle deltas)

## Retention

- Raw inputs: short default retention, configurable
- Derived aggregates: longer retention for trend analysis
- Per-tenant controls required for all retention policies

## Privacy Capsule

- HR/“whole-person” signals are optional, abstracted, and allowlisted.
- Raw HR inputs are never stored or logged.

