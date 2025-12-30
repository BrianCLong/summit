# Recorded Future — Feed-Adaptive Signal Calibration with Drift Alarms (FASC)

FASC calibrates and monitors threat intelligence feeds using outcome data to weight reliability, detect drift, and quarantine degraded feeds with auditable justification.

## Objectives

- Continuously update feed weights based on confirmed outcomes (incidents, exploit confirmations).
- Detect distribution drift or poisoning in near real time and trigger quarantine actions.
- Produce calibration artifacts with justification witnesses and replay tokens.

## Workflow Overview

1. **Ingest Signals:** Pull threat signals across feeds with metadata (feed ID, timestamp, entity, severity).
2. **Outcome Alignment:** Join signals with observed outcomes to compute reliability scores.
3. **Weight Updates:** Apply online learning to adjust feed weights with provenance-weighted decay.
4. **Drift Detection:** Monitor divergence between expected and observed feed behavior; compute dwell-aware alarms.
5. **Quarantine Actions:** Down-weight, exclude, or route to corroboration-only path when drift detected.
6. **Calibration Artifact:** Emit feed weights, drift indicators, justification witness, and replay token.

## Governance Hooks

- Cache per-feed drift statistics keyed by time window for audit.
- Policy engine determines quarantine thresholds and corroboration requirements.
- Exported artifacts pass disclosure constraints and include determinism tokens.
