# Drift Detection (FASC)

## Detection Signals

- Statistical divergence between historical and current distributions.
- Outcome mismatch rates and corroboration failures.
- Spike detection on false positives or noise indicators.

## Process

1. Compute divergence metrics for each feed over a rolling window.
2. Apply dwell time thresholds to prevent transient noise.
3. Emit drift events with supporting evidence hashes.
4. Trigger policy effects (quarantine, corroboration-only).

## Auditability

Every drift event must produce a witness entry and transparency log record.
