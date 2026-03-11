# CogWar Resilience Delta Simulator (RDS)

## Purpose

The Resilience Delta Simulator is a defensive CogWar planning engine that computes a governed, deterministic intervention portfolio for reducing campaign pressure across cognitive infrastructure dimensions.

Implementation: `packages/summit-cogbattlespace/src/strategy/resilienceDeltaSimulator.ts`

## Novel Mechanism

RDS combines four capabilities in one deterministic step:

1. Weighted cognitive-pressure scoring over `adaptivity`, `cognitiveInfrastructure`, `crossDomainLinkage`, and `swarmCoordination`.
2. Portfolio search across intervention primitives with hard governance constraints (`maxBudget`, `maxLatencyHours`, `minimumConfidence`, evidence floor).
3. Non-linear blended-effect model using a miss-probability composition (`1 - Π(1-effect)` per dimension).
4. Stable plan identity and rank ordering (hash-derived `planId` and deterministic sort by delta, novelty, cost, latency, ID).

## Defensive Posture

- Analytics and defensive planning only.
- No persona generation.
- No targeting export.
- No autonomous influence deployment.

## Inputs and Outputs

### Input

- `CampaignPressureSnapshot`
- `InterventionPrimitive[]` (optional, defaults provided)
- `SimulationPolicy` overrides (optional)

### Output

- Ranked candidate portfolios with:
  - `planId`
  - `primitiveIds`
  - `projectedScores`
  - `resilienceDelta`
  - `noveltyScore`
  - `confidence`
  - `cost`
  - `latencyHours`
  - `rationale`

## Determinism Requirements

- Primitive IDs sorted before plan hashing.
- Stable key ordering for hash inputs.
- Stable candidate sort order with explicit tie-breakers.
- Rounded numeric outputs for reproducibility.

## MAESTRO Alignment

- **MAESTRO Layers**: Data, Agents, Tools, Observability, Security.
- **Threats Considered**: prompt injection in analyst prompts, tool abuse through unconstrained optimization, poisoned evidence sparsity.
- **Mitigations**: policy-constrained search, minimum confidence gates, evidence thresholds, deterministic outputs for audit replay.
