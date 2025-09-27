//! Dataset Join Cardinality Estimator with Privacy Bounds (DJCE-PB).
//!
//! This crate provides probabilistic data sketches (Bloom filter, HyperLogLog,
//! and MinHash) to pre-evaluate candidate dataset joins while supplying
//! re-identification risk bounds and guardrail recommendations.

pub mod bloom;
pub mod hash;
pub mod minhash;
pub mod report;
pub mod sketch;

pub use report::{
    EstimateInterval, JoinEstimator, JoinRiskReport, RiskBounds, RiskLevel, RiskThresholds,
};
pub use sketch::{DatasetProfile, DatasetSketch, SketchConfig};

#[cfg(feature = "node")]
pub mod bindings;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn end_to_end_join_assessment() {
        let config = SketchConfig { seed: 2024, ..Default::default() };
        let dataset_a = DatasetProfile::from_records(
            "marketing",
            vec![
                vec!["alice".into(), "1985".into(), "denver".into()],
                vec!["bob".into(), "1976".into(), "denver".into()],
                vec!["carol".into(), "1985".into(), "miami".into()],
            ],
            config.clone(),
        );
        let dataset_b = DatasetProfile::from_records(
            "crm",
            vec![
                vec!["alice".into(), "1985".into(), "denver".into()],
                vec!["dave".into(), "1990".into(), "boston".into()],
                vec!["ellen".into(), "1976".into(), "denver".into()],
            ],
            config.clone(),
        );
        let estimator = JoinEstimator::with_default_thresholds();
        let report = estimator.assess_join(&dataset_a, &dataset_b);
        assert!(report.join_cardinality.point_estimate >= 1.0);
        assert!(report.join_cardinality.upper_bound >= report.join_cardinality.lower_bound);
    }
}
