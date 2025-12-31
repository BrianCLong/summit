# Drift Detection and Re-Certification

This guide defines signals, thresholds, and actions to detect drift and enforce timely re-certification of learning artifacts.

## Drift Signals

- **Input Distribution Drift**: Significant shift in feature/embedding distributions or prompt/traffic mix; monitor via KL divergence or population stability index with alert thresholds tuned per artifact.
- **Outcome Drift**: Shifts in label prevalence, decision class mix, false positive/negative rates, or refusal frequencies relative to the active baseline.
- **Confidence & Calibration Degradation**: Increased entropy, lower confidence margins, or rising calibration error beyond tolerance.
- **Operational Drift**: Latency or cost deviations exceeding budget envelopes; rising rate of safety/policy interventions.

## Detection Cadence

- **Real-time Guards**: Inline monitors on action-eligible paths; alerts routed to owners within 5 minutes of breach.
- **Daily Jobs**: Batch evaluation on sampled traffic with stored snapshots for reproducibility.
- **Weekly Deep-Dive**: Comparative evaluation against held-out validation sets and prior release checkpoints.

## Triggers & Actions

- **Soft threshold breach**: Flag artifact as `under-review`; increase sampling and require owner acknowledgement.
- **Hard threshold breach**: Auto-downgrade to `advisory` mode and initiate rollback to last known good version via `scripts/learning/rollback_artifact.sh`.
- **Repeated breaches (≥2 in 7 days)**: Mandatory re-certification and bias re-run before re-activation.
- **Data lineage changes**: Any upstream dataset/schema change automatically triggers re-certification.

## Re-Certification Process

1. Capture drift evidence and affected metrics; file governance incident if action-eligible.
2. Re-run evaluation gates per `EVALUATION_GATES.md` using the current traffic snapshot and historical baseline.
3. Update provenance records and status (`artifacts/learning/status/<id>.json`) with re-certification results.
4. Promote only after thresholds are re-met and owners approve.

## Documentation & Retention

- Store drift reports and re-certification evidence alongside history in `artifacts/learning/history/`.
- Map alerts to owners defined in `GOVERNANCE_CADENCE.md` to ensure accountability.
