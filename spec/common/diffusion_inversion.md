# Diffusion Inversion

## Objective

Infer a minimal origin set that explains observed propagation in a temporal
actor–content graph by inverting a forward diffusion model.

## Inputs

- `temporal_graph`: nodes (actors, content), edges (propagation events).
- `activation_times`: per-node activation timestamps.
- `model_family`: independent cascade, linear threshold, or Hawkes.
- `budgets`: runtime, memory, and edge limits.

## Inversion Pipeline

1. **Model fit**: estimate parameters for the selected model family.
2. **Seed selection**: optimize for minimal origin set under cardinality budget.
3. **Uncertainty**: compute posterior or bootstrap intervals for origin nodes.
4. **Certificate**: emit origin certificate with commitments and replay token.

## Outputs

- `origin_set`
- `uncertainty_distribution`
- `activation_loss`
- `replay_token`
- `commitment_root`

## Quality Metrics

- Activation-time error (MAE/RMSE)
- Origin set stability across resampling
- Coverage of observed propagation
