# Recorded Future CEVH Specification

## Concept

Continuous Exposure-to-Victim Hazard (CEVH) forecasts near-term
victimization likelihood by modeling exposure signals as a hazard process
with change-point detection and decomposition witnesses.

## Goals

- Provide time-to-event estimates with confidence intervals.
- Detect hazard shifts quickly with auditable evidence.
- Offer replayable forecast artifacts.

## Data model

- **Assets**: entities with identifiers and criticality metadata.
- **Exposure signals**: vulnerabilities, misconfigurations, leak indicators,
  infrastructure proximity, and threat activity.
- **Time series**: hazard values computed per asset per window.

## Processing flow

1. Retrieve exposure signals per asset under policy scope.
2. Compute hazard values with time decay and covariates.
3. Detect change points via sequential tests.
4. Generate forecast artifacts with decomposition witness and determinism token.
5. Emit alerts when hazard exceeds threshold for dwell time.

## Outputs

- **Forecast artifact**: hazard value, time-to-event estimate, confidence
  interval, decomposition witness, replay token.
- **Change-point alert**: evidence summary and impacted assets.

## Security & compliance

- Redact exposure signals based on policy rules.
- Store artifacts in transparency log for verification.
