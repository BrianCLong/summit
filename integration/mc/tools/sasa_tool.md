# SASA Tool

CLI tool for source attribution of intel decisions.

- Inputs: entity ID, decision function, source list, sampling budget.
- Outputs: decision output, marginal contributions per source, minimal support set, counterfactual removals, replay token.
- Flags: `--concentration-threshold` emits alert when a single source dominates.
