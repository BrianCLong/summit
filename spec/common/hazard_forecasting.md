# Continuous Exposure-to-Victim Hazard Forecasting

## Purpose

Model time-varying victimization likelihood as a hazard process, enabling proactive defense decisions with change-point detection and auditable decomposition.

## Core elements

- **Exposure graph retrieval**: Gather vulnerability, configuration, credential leakage, and infrastructure proximity indicators for each asset.
- **Hazard computation**: Survival or intensity models with time decay; emit hazard values and time-to-event distributions with confidence bounds.
- **Online change detection**: Sequential probability or Bayesian change-point detection to surface sudden risk shifts.
- **Decomposition witness**: Minimal support sets that explain hazard contributions within a proof budget.

## Operational guidance

- **Replay tokens**: Include index/policy versions, snapshot identifiers, and time windows.
- **Counterfactuals**: Evaluate removal of individual signals to quantify impact and mitigation priorities.
- **Caching**: Key hazard results by asset + replay token to accelerate repeated queries.
- **Budgeting**: Enforce egress and verification-time budgets when emitting redacted exposure excerpts.
