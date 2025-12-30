# Drift Detection

## Signals

- Divergence between historical and current signal distributions (e.g., KL, JS divergence).
- Sudden drop in corroboration rate or spike in false positives.
- Structural anomalies: new entity classes, unexpected geos, or out-of-window timestamps.

## Thresholding

- Dwell-aware thresholds: require sustained divergence beyond dwell time before quarantine.
- Adaptive baselines per feed class (malware, vuln, phishing) with seasonality handling.

## Actions

- **Quarantine:** Down-weight or exclude feed; require corroboration before fusion.
- **Alert:** Emit drift alarm with justification witness and replay token.
- **Recovery:** Gradually restore weight after stability, with policy-approved ramp schedule.
