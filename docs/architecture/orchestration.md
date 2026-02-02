# Orchestration Control Loop

## Purpose

The control loop defines a closed-loop orchestration pipeline over the NOG. Each phase is
ordered deterministically to ensure reproducible simulations and auditable provenance.

## Phases

1. Ingest: scout nominates candidate updates.
2. Cartography: cartographer clusters, labels lifecycle, updates NOG.
3. Forecast: forecaster predicts trajectories and risks.
4. Strategy: strategist proposes structured interventions.
5. Governance: governor evaluates interventions against policy.
6. Execution: optional, gated by policy + approval + connector flag.
7. Observation: outcomes feed back into NOG calibration.

## Constraints

- Execution connectors are off by default.
- All interventions are structured objects, not free-form text.
- Each phase emits an audit event with snapshot hash and agent metadata.
