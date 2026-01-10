# Continuous Hazard Forecasting

## Purpose

Hazard forecasting models the likelihood of a near-term event as a
continuous-time process over evolving exposure signals. It produces
confidence-bounded time-to-event estimates and auditable decompositions of
signal influence.

## Inputs

- Exposure signals (vulnerability, configuration, leak indicators, proximity).
- Temporal metadata (first seen, last seen, dwell time).
- Asset context (criticality, segment, ownership).

## Modeling guidance

- Use survival models that support time-varying covariates with decay.
- Maintain calibrated baselines per asset class and environment.
- Store hazard decomposition weights per signal for audit replay.

## Change-point detection

- Apply sequential tests (SPRT, BOCPD) to hazard deltas.
- Require minimum dwell-time before alerting to reduce oscillation.
- Persist a change-point record with model version, thresholds, and evidence.

## Outputs

- **Forecast artifact**: hazard value, time-to-event estimate, confidence
  interval, decomposition witness, determinism token.
- **Alert event**: change-point metadata and impacted assets.

## Failure modes & mitigation

- **Sparse signals**: widen confidence intervals and flag low-evidence state.
- **Policy scope changes**: emit redaction summary and update artifact.
- **Signal poisoning**: cap per-signal contribution; require multi-signal
  corroboration.

## Observability

- Track hazard compute latency, change-point rate, drift score, and forecast
  accuracy over time.
