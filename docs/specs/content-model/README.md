# Content Model: Briefs, Claims, Blocks

This content model consolidates Summit knowledge into graph-ready primitives that are explicitly
aligned to the Summit Readiness Assertion and governed definitions. Every artifact must validate
against the schemas below to keep governance and policy enforcement consistent across the stack.

## Schemas

- [`Brief` schema](./brief.schema.json)
- [`Claim` schema](./claim.schema.json)
- [`Block` schema](./block.schema.json)

## Governance alignment

- Use `policy_tags` on every object to ensure policy-aware placement and release gating.
- Use `work_items`/`actions` references so content health can be queried against live delivery.
- Treat `evidence` entries as the provenance ledger for claim validity.
- Use `block_order` in briefs to render a governed sequence without duplicating blocks.

## Example

- [`Governance Drift` brief example](./governance-drift-brief.example.json)
