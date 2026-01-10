# Recorded Future — Feed-Adaptive Signal Calibration (FASC)

FASC calibrates feed reliability online using outcome signals, detects drift or poisoning, and
quarantines degraded feeds with auditable justification.

## Objectives

- Continuously update feed weights based on observed outcomes.
- Detect drift using statistical divergence and outcome mismatches.
- Quarantine feeds with evidence-backed witnesses.
- Provide replayable calibration artifacts bound to policy decisions.

## Architecture

1. **Signal Intake:** Normalize feed signals and map to entities.
2. **Outcome Store:** Collect incident outcomes and confirmations.
3. **Calibration Engine:** Update feed reliability scores and weights.
4. **Drift Detector:** Compare historical vs. current distributions.
5. **Quarantine Manager:** Apply policy effects and emit witnesses.
6. **Artifact Publisher:** Store calibration artifacts and transparency logs.

## Workflow

1. Ingest signals from multiple feeds.
2. Compute reliability scores using outcome data.
3. Update feed weights and emit calibration artifact.
4. Detect drift via divergence measures and dwell-time thresholds.
5. Quarantine or corroborate feeds when drift persists.

## Data Model

- **FeedScore:** `feed_id`, `reliability_score`, `weight`, `updated_at`.
- **DriftEvent:** `feed_id`, `divergence_metric`, `threshold`, `dwell_time`.
- **CalibrationArtifact:** Commitment envelope for weights + drift evidence.

## Policy-as-Code Hooks

- Quarantine decisions require policy approval and compliance log entries.
- Corroboration-only routing is expressed as policy effect rules.

## Failure Modes

- **Outcome lag:** Delay calibration updates and log a compliance warning.
- **Drift false positives:** Require corroboration across multiple metrics.
- **Feed poisoning:** Trigger quarantine and human review workflow.
