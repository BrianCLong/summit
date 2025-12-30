# Releasability Tiering

Releasability tiering partitions outputs for multi-performer and evaluator-safe sharing.

## Tier definitions

- Tier 0: internal only, full detail.
- Tier 1: evaluator-safe with redactions and egress receipts.
- Tier 2: coalition/transition-ready with selective disclosure and audit trails.

## Manifests

- Each release includes a tier manifest with cryptographic commitments to content.
- Counterfactual manifests quantify information loss when applying stricter tiers.

## Controls

- Enforce sandbox policies and egress budgets per scope token.
- Attach egress receipts detailing destination classes and byte counts.
