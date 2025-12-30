# Join Preservation for Transform Workflows

## Purpose

Guarantee that workflow compilation preserves analyst-intended join semantics while minimizing egress and source calls.

## Components

- **Plan IR**: Typed intermediate representation capturing entity sets, joins, filters, and provenance requirements.
- **Minimization objective**: Reduce source calls/egress subject to rate and license constraints; batch queries by endpoint.
- **Witnessing**: Join preservation certificates bind the plan IR to compiled query sets with witness chains over intermediates.
- **Execution guardrails**: Enforce egress budgets and redaction prior to reconstruction.

## Operational guidance

- Cache query results by signature; invalidate on source version change.
- Provide replay tokens with plan hashes and time windows to re-verify execution.
- Allow verification without re-running queries using certificate plus witness chain.
