# Transform Inversion

Shared mechanics for reconstructing minimal transform subplans that could have produced a target
result set.

## Inputs

- **Transform registry:** transform definitions, version IDs, and input/output schemas.
- **Target result set:** entities or relations for inversion.
- **Search budget:** maximum depth or explored subplans.

## Inversion Strategy

- Build a transform dependency graph from registry metadata.
- Search backward from target entities to candidate inputs.
- Apply minimality constraints (fewest transforms, fewest inputs).

## Outputs

- **Inversion artifact:** candidate subplan, minimal inputs, witness chain.
- **Replay validation:** deterministic re-execution to confirm reproducibility.
- **Counterfactuals:** alternate subplans ranked by likelihood.
