# Recorded Future CEVH Specification

## Concept

Continuous Exposure-to-Victim Hazard (CEVH) models near-term victimization likelihood by treating exposure indicators as a hazard process on an intelligence graph. The system forecasts time-to-event, detects change points, and produces audit-ready decomposition witnesses.

## Data model

- **Assets**: Identified by stable asset IDs with policy scopes.
- **Exposure signals**: Vulnerability indicators, configuration indicators, credential leakage indicators, infrastructure proximity indicators.
- **Temporal features**: Time decay and freshness windows for each signal category.

## Processing flow

1. Retrieve exposure signals for an asset under policy scope and redaction rules.
2. Compute time-varying hazard values with confidence intervals and time-to-event estimates.
3. Apply online change-point detection to surface significant shifts.
4. Generate decomposition witnesses capturing minimal support sets and counterfactual impacts.
5. Emit forecast artifacts with replay tokens, Merkle commitments, and optional attestation quotes.

## Outputs

- **Forecast artifact**: Hazard value trajectory, time-to-event estimate, decomposition witness, counterfactual impacts, replay token.
- **Alerts**: Threshold + dwell-time triggered notifications with change-point context.
