# Shapley Source Attribution

This note defines shared mechanics for computing marginal contribution scores for intelligence
sources and recording them in attribution artifacts.

## Inputs

- **Decision function:** deterministic fusion or scoring function over signals.
- **Source catalog:** identifiers, trust tiers, and provenance metadata.
- **Sampling budget:** limits permutations or coalitions evaluated.

## Attribution Procedure

- Compute baseline decision output with full source set.
- Sample source coalitions according to the budget.
- Estimate Shapley values by averaging marginal deltas per source.
- Generate counterfactual outputs for removal of high-impact sources.

## Outputs

- **Attribution ledger:** per-source contribution scores and percent influence.
- **Support set:** minimal signals required to reproduce the decision output.
- **Replay token:** binds the attribution to time window and index version.

## Governance Hooks

- Trigger alerts if any single source exceeds concentration thresholds.
- Record signed policy decision tokens for access to sensitive feeds.
