# Change-Point Detection (CEVH)

## Methods

- Sequential probability ratio tests for rapid detection with bounded false alarms.
- Bayesian online change-point detection for adaptive thresholds and richer posteriors.

## Guidance

- Use SPRT for low-latency, high-sensitivity alerting paths; fall back to Bayesian for high-stability tiers.
- Pair change-point events with decomposition witnesses to highlight which exposures shifted.
- Gate alerts on dwell time to reduce noise; include replay tokens for audit.
