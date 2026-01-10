# RIT: Result Inversion for Transform Explainability

RIT infers a minimal generating transform subplan and minimal inputs that could have produced a
resulting graph entity or edge set, enabling explainability, reproducibility, and rollback.

## Inputs

- Transform registry with dependency metadata.
- Target result set identifiers.
- Search budget and minimality constraints.

## Outputs

- Inversion artifact with subplan, inputs, witness chain, and replay token.
- Counterfactual subplans ranked by likelihood.
