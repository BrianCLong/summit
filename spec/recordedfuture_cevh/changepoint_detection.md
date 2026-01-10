# CEVH Change-Point Detection

## Detection strategy

- Use sequential probability ratio test (SPRT) or Bayesian online change-point
  detection (BOCPD) to identify hazard shifts.
- Require minimum dwell time to reduce oscillations.

## Evidence capture

- Record pre/post hazard levels, signal deltas, and threshold crossings.
- Attach determinism token and model version to each event.
