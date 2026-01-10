# OCT Spec Overview

Defines the Recorded Future wedge for Outcome-Calibrated Threat Signal Portfolio.

## Goals

- Build factor portfolios from multi-source threat signals.
- Calibrate factor weights using observed incident outcomes.
- Produce backtest artifacts with replayable evidence.

## Inputs

- Entity identifiers (IP, domain, actor, CVE, etc.).
- Threat signals with provenance and timestamps.
- Outcome data (confirmed incidents, exploits, takedowns).
- Policy context and disclosure budgets.

## Outputs

- Factor portfolio with calibrated weights.
- Backtest artifact with statistical evaluation.
- Risk portfolio capsule bound to replay token.

## Processing Stages

1. **Collect** signals across sources and normalize features.
2. **Compute** factor components with provenance weighting.
3. **Calibrate** weights using outcome data and online updates.
4. **Backtest** against historical outcomes.
5. **Package** portfolio + backtest into capsule.

## Governance

- Calibration decisions are logged in witness chains.
- Policy-as-code governs signal usage and disclosure.
