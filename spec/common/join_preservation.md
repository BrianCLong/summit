# Join Preservation

## Purpose

Join preservation ensures that optimized source queries produce equivalent
results to the original workflow plan, even after query minimization and
batching.

## Concepts

- **Plan IR**: canonical representation of workflow transforms and joins.
- **Join certificate**: proof-like artifact binding the plan IR to executed
  source queries and reconstruction steps.
- **Witness chain**: commitments to intermediate entities used in reconstruction.

## Compilation guidance

- Push filters to sources when compatible with join semantics.
- Group source queries by endpoint to reduce egress and latency.
- Enforce license and rate-limit constraints as optimization bounds.

## Reconstruction rules

- Use typed graph materialization to preserve entity provenance.
- Record join keys and hash commitments for audit replay.

## Outputs

- Join preservation certificate with plan hash, query signatures, and witness
  chain.
- Reconstruction metadata enabling verification without re-running the workflow.
