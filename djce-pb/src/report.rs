use hyperloglog::HyperLogLog;
use serde::{Deserialize, Serialize};

use crate::sketch::DatasetProfile;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RiskLevel {
    Low,
    Moderate,
    High,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RiskBounds {
    pub lower_bound: f64,
    pub upper_bound: f64,
    pub classification: RiskLevel,
    pub notes: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct EstimateInterval {
    pub point_estimate: f64,
    pub lower_bound: f64,
    pub upper_bound: f64,
    pub relative_error: f64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DatasetSummary {
    pub name: String,
    pub record_count: usize,
    pub quasi_identifier_width: usize,
    pub estimated_unique: f64,
    pub uniqueness_ratio: f64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct JoinRiskReport {
    pub left: DatasetSummary,
    pub right: DatasetSummary,
    pub join_cardinality: EstimateInterval,
    pub jaccard_similarity: f64,
    pub overlap_ratio: f64,
    pub risk_bounds: RiskBounds,
    pub guardrail_recommendations: Vec<String>,
    pub seed: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RiskThresholds {
    pub high_overlap: f64,
    pub moderate_overlap: f64,
    pub uniqueness_alert: f64,
    pub near_exact_match_ratio: f64,
}

impl Default for RiskThresholds {
    fn default() -> Self {
        RiskThresholds {
            high_overlap: 0.45,
            moderate_overlap: 0.2,
            uniqueness_alert: 0.75,
            near_exact_match_ratio: 0.9,
        }
    }
}

#[derive(Clone, Debug)]
pub struct JoinEstimator {
    thresholds: RiskThresholds,
}

impl JoinEstimator {
    pub fn new(thresholds: RiskThresholds) -> Self {
        JoinEstimator { thresholds }
    }

    pub fn with_default_thresholds() -> Self {
        Self::new(RiskThresholds::default())
    }

    pub fn thresholds(&self) -> &RiskThresholds {
        &self.thresholds
    }

    pub fn assess_join(&self, left: &DatasetProfile, right: &DatasetProfile) -> JoinRiskReport {
        let left_config = left.sketch.config().clone();
        let right_config = right.sketch.config().clone();

        let left_cardinality = left.sketch.estimated_cardinality();
        let right_cardinality = right.sketch.estimated_cardinality();

        let mut union_hll = HyperLogLog::new_from_template(left.sketch.hyperloglog());
        union_hll.merge(left.sketch.hyperloglog());
        union_hll.merge(right.sketch.hyperloglog());
        let union_estimate = union_hll.len();

        let jaccard = left.sketch.minhash().estimate_jaccard(right.sketch.minhash());
        let mut intersection_estimate = jaccard * union_estimate;
        intersection_estimate = intersection_estimate
            .min(left_cardinality)
            .min(right_cardinality)
            .max(0.0);

        let hll_error = left_config
            .hll_error_rate
            .max(right_config.hll_error_rate)
            .clamp(0.0, 0.2);
        let minhash_error = left_config
            .minhash_error()
            .max(right_config.minhash_error())
            .clamp(0.0, 0.5);
        let bloom_fp = left
            .sketch
            .bloom()
            .false_positive_rate()
            .max(right.sketch.bloom().false_positive_rate());

        let combined_error = hll_error + minhash_error;
        let lower_bound = (intersection_estimate * (1.0 - combined_error - bloom_fp)).max(0.0);
        let upper_bound = (intersection_estimate * (1.0 + combined_error + bloom_fp)).max(lower_bound);

        let overlap_ratio = if union_estimate > 0.0 {
            intersection_estimate / union_estimate
        } else {
            0.0
        };

        let left_uniqueness = if left.record_count > 0 {
            (left_cardinality / left.record_count as f64).clamp(0.0, 1.0)
        } else {
            0.0
        };
        let right_uniqueness = if right.record_count > 0 {
            (right_cardinality / right.record_count as f64).clamp(0.0, 1.0)
        } else {
            0.0
        };

        let base_ratio = if left.record_count == 0 || right.record_count == 0 {
            0.0
        } else {
            let left_ratio = intersection_estimate / left.record_count as f64;
            let right_ratio = intersection_estimate / right.record_count as f64;
            left_ratio.max(right_ratio).clamp(0.0, 1.0)
        };

        let risk_lower = (base_ratio - combined_error - bloom_fp).clamp(0.0, 1.0);
        let risk_upper = (base_ratio + combined_error + bloom_fp).clamp(0.0, 1.0);

        let mut notes = Vec::new();
        if overlap_ratio > self.thresholds.high_overlap {
            notes.push(format!(
                "Estimated overlap ratio {:.2}% exceeds the high-risk threshold",
                overlap_ratio * 100.0
            ));
        }
        if left_uniqueness > self.thresholds.uniqueness_alert {
            notes.push(format!(
                "{} shows {:.1}% unique quasi-identifier tuples",
                left.name,
                left_uniqueness * 100.0
            ));
        }
        if right_uniqueness > self.thresholds.uniqueness_alert {
            notes.push(format!(
                "{} shows {:.1}% unique quasi-identifier tuples",
                right.name,
                right_uniqueness * 100.0
            ));
        }

        let classification = if risk_upper >= self.thresholds.high_overlap
            || left_uniqueness > self.thresholds.uniqueness_alert
            || right_uniqueness > self.thresholds.uniqueness_alert
            || overlap_ratio >= self.thresholds.near_exact_match_ratio
        {
            RiskLevel::High
        } else if risk_upper >= self.thresholds.moderate_overlap {
            RiskLevel::Moderate
        } else {
            RiskLevel::Low
        };

        let mut guardrails = Vec::new();
        guardrails.push(
            "Document join assumptions and monitor observed overlap against DJCE-PB bounds.".to_string(),
        );
        match classification {
            RiskLevel::High => {
                guardrails.push(
                    "Require privacy review, apply k-anonymity/l-diversity, or aggregate before release.".to_string(),
                );
                guardrails.push(
                    "Implement row-level suppression for records mapping 1:1 across datasets.".to_string(),
                );
            }
            RiskLevel::Moderate => {
                guardrails.push(
                    "Limit join output to aggregated statistics or apply differential privacy noise.".to_string(),
                );
            }
            RiskLevel::Low => {
                guardrails.push(
                    "Maintain logging of join queries and enforce least-privilege data access.".to_string(),
                );
            }
        }
        if overlap_ratio >= self.thresholds.near_exact_match_ratio {
            guardrails.push(
                "Delay join execution until contractual guardrails and consent approvals are validated.".to_string(),
            );
        }
        if left_uniqueness > 0.9 || right_uniqueness > 0.9 {
            guardrails.push(
                "Generalize or bucket quasi-identifiers with >90% uniqueness prior to joining.".to_string(),
            );
        }

        let left_summary = DatasetSummary {
            name: left.name.clone(),
            record_count: left.record_count,
            quasi_identifier_width: left.quasi_identifier_width,
            estimated_unique: left_cardinality,
            uniqueness_ratio: left_uniqueness,
        };
        let right_summary = DatasetSummary {
            name: right.name.clone(),
            record_count: right.record_count,
            quasi_identifier_width: right.quasi_identifier_width,
            estimated_unique: right_cardinality,
            uniqueness_ratio: right_uniqueness,
        };

        JoinRiskReport {
            left: left_summary,
            right: right_summary,
            join_cardinality: EstimateInterval {
                point_estimate: intersection_estimate,
                lower_bound,
                upper_bound,
                relative_error: combined_error + bloom_fp,
            },
            jaccard_similarity: jaccard,
            overlap_ratio,
            risk_bounds: RiskBounds {
                lower_bound: risk_lower,
                upper_bound: risk_upper,
                classification,
                notes,
            },
            guardrail_recommendations: deduplicate(guardrails),
            seed: left_config.seed ^ right_config.seed.rotate_left(13),
        }
    }
}

fn deduplicate(items: Vec<String>) -> Vec<String> {
    let mut seen = std::collections::BTreeSet::new();
    let mut out = Vec::new();
    for item in items {
        if seen.insert(item.clone()) {
            out.push(item);
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use pretty_assertions::assert_eq;

    use super::*;
    use crate::sketch::SketchConfig;

    fn sample_records(prefix: &str, overlap: usize, unique: usize) -> Vec<Vec<String>> {
        let mut records = Vec::new();
        for i in 0..overlap {
            records.push(vec![format!("{prefix}-shared-{i}"), format!("q{i}"), "1980".to_string()]);
        }
        for i in 0..unique {
            records.push(vec![
                format!("{prefix}-private-{i}"),
                format!("z{i}"),
                format!("19{:02}", (i % 90) + 10),
            ]);
        }
        records
    }

    fn build_dataset(
        unique_prefix: &str,
        shared: usize,
        shared_dups: usize,
        unique: usize,
        unique_dups: usize,
    ) -> Vec<Vec<String>> {
        let mut records = Vec::new();
        for idx in 0..shared {
            let shared_entry = vec![
                format!("shared-person-{idx}"),
                format!("zip-shared-{}", idx % 10),
                format!("198{}", idx % 10),
            ];
            for _ in 0..shared_dups {
                records.push(shared_entry.clone());
            }
        }
        for idx in 0..unique {
            let unique_entry = vec![
                format!("{unique_prefix}-uniq-{idx}"),
                format!("zip-uniq-{}", idx % 10),
                format!("197{}", idx % 10),
            ];
            for _ in 0..unique_dups {
                records.push(unique_entry.clone());
            }
        }
        records
    }

    #[test]
    fn deterministic_reports_for_fixed_seeds() {
        let config = SketchConfig { seed: 7, ..Default::default() };
        let left_records = sample_records("left", 50, 150);
        let right_records = sample_records("right", 50, 80);
        let left = DatasetProfile::from_records("left", left_records.clone(), config.clone());
        let right = DatasetProfile::from_records("right", right_records.clone(), config.clone());
        let estimator = JoinEstimator::with_default_thresholds();

        let report_a = estimator.assess_join(&left, &right);
        let report_b = estimator.assess_join(&left, &right);
        assert_eq!(serde_json::to_string(&report_a).unwrap(), serde_json::to_string(&report_b).unwrap());
    }

    #[test]
    fn high_overlap_triggers_high_risk() {
        let config = SketchConfig { seed: 99, ..Default::default() };
        let shared = sample_records("shared", 150, 0);
        let left = DatasetProfile::from_records("left", shared.clone(), config.clone());
        let right = DatasetProfile::from_records("right", shared, config.clone());
        let estimator = JoinEstimator::with_default_thresholds();

        let report = estimator.assess_join(&left, &right);
        assert_eq!(report.risk_bounds.classification, RiskLevel::High);
        assert!(report
            .guardrail_recommendations
            .iter()
            .any(|rec| rec.contains("privacy review")));
    }

    #[test]
    fn moderate_overlap_is_detected() {
        let config = SketchConfig { seed: 12345, ..Default::default() };
        let left_records = build_dataset("left", 30, 2, 20, 7);
        let right_records = build_dataset("right", 30, 1, 20, 3);
        let left = DatasetProfile::from_records("left", left_records, config.clone());
        let right = DatasetProfile::from_records("right", right_records, config.clone());
        let estimator = JoinEstimator::with_default_thresholds();
        let report = estimator.assess_join(&left, &right);
        assert!(report.risk_bounds.upper_bound >= estimator.thresholds().moderate_overlap);
        assert!(report.risk_bounds.upper_bound <= estimator.thresholds().high_overlap + 0.15);
        assert_eq!(report.risk_bounds.classification, RiskLevel::Moderate);
    }
}
