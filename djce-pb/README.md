# djce-pb

Dataset Join Cardinality Estimator with Privacy Bounds (DJCE-PB). This crate
uses a hybrid of Bloom filters, HyperLogLog counters, and MinHash sketches to
approximate join overlap before execution and produce re-identification risk
bounds.

## Features

- Deterministic sketches with configurable seeds.
- HyperLogLog-driven cardinality interval estimation with MinHash similarity
  refinement.
- Bloom filter false-positive adjustments embedded in risk bounds.
- Guardrail recommendations for high-risk scenarios.
- Optional Node.js bindings via `napi-rs` (enable the `node` feature).

## Example

```rust
use djce_pb::{DatasetProfile, JoinEstimator, SketchConfig};

let config = SketchConfig { seed: 1337, ..Default::default() };
let left = DatasetProfile::from_records(
    "marketing",
    vec![vec!["alice".into(), "1985".into(), "denver".into()]],
    config.clone(),
);
let right = DatasetProfile::from_records(
    "crm",
    vec![vec!["alice".into(), "1985".into(), "denver".into()]],
    config.clone(),
);
let estimator = JoinEstimator::with_default_thresholds();
let report = estimator.assess_join(&left, &right);
println!("risk: {:?}", report.risk_bounds.classification);
```
