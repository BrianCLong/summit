# Optimizer Rules

## Canonical Rules

- Deduplicate equivalent transforms with identical signatures.
- Batch calls to common data sources under rate-limit constraints.
- Reorder joins to minimize intermediate cardinality.
- Push down filters to reduce egress and cost.

## Safety Checks

- Ensure effect signatures remain authorized after reordering.
- Validate license constraints for each source.
- Preserve determinism token across rewrites.
