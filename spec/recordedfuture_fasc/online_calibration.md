# Online Calibration Logic

## Reliability Scoring

- Incremental updates per outcome arrival; supports streaming alignment.
- Combines true/false positive counts, lead time, and severity calibration.
- Applies provenance-weighted decay to prefer recent high-quality signals.

## Weight Update Policy

1. Compute reliability delta per feed.
2. Adjust feed weights with learning rate; enforce floor/ceiling bounds.
3. Persist weights with versioning and determinism tokens.
4. Emit calibration artifacts to the witness ledger and cache keyed by time window.

## Counterfactual Simulation

- Optionally simulate removal of a feed to estimate impact on predictive performance.
- Record simulation results in artifacts for reviewer context.
