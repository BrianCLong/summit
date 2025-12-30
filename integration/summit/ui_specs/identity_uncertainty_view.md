# UI Spec: Identity Uncertainty View

## Purpose

Display CIRW probabilistic clusters with confidence intervals and witnesses.

## Key Elements

- Cluster list with members, posterior probability ranges, and merge/split status.
- Filters: minimum confidence threshold, identifier type, tenant scope.
- Actions: view witness (support set + commitment), export with disclosure constraints.

## States

- **Stable:** Cluster confidence above threshold.
- **Pending Merge/Split:** Showing triggers and expected confidence change.
- **Policy Blocked:** Cross-tenant requests without federation token; show remediation.
