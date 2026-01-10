# SASA: Source Attribution Shapley Accounting

SASA computes per-source marginal contribution scores for automated intelligence decisions,
producing an auditable attribution ledger and counterfactual outputs.

## Inputs

- Decision request with decision function identifier.
- Threat signals from multiple sources with provenance metadata.
- Sampling budget and policy constraints.

## Outputs

- Decision output with attribution scores per source.
- Attribution artifact with support set and replay token.
- Counterfactual decision outputs for removal of selected sources.
