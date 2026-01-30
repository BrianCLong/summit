# Decision: Subsumption Bundle Framework

## Decisions

- Introduce `subsumption/**` as the canonical intake surface for external ITEMS.
- Require deterministic evidence outputs and an index mapping IDs to files.
- Enforce deny-by-default fixtures presence for policy gates.

## Alternatives Rejected

- Ad-hoc docs-only intake (not machine-verifiable).
- Relying on human reviewers for completeness (not scalable/auditable).

## Deferred

- Nightly drift monitor workflow (backlog item).
- Automated required-check discovery (needs permissions decision).

## Risk Tradeoffs

- Adds a CI job (small compute cost) to prevent governance drift.

## GA Alignment

- Improves auditability and required-check enforceability.
