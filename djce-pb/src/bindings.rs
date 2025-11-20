#![allow(clippy::needless_pass_by_value)]

use napi::bindgen_prelude::*;

use crate::{
    report::{JoinEstimator, JoinRiskReport, RiskLevel, RiskThresholds},
    sketch::{DatasetProfile, SketchConfig},
};

#[napi(object)]
pub struct JsSketchConfig {
    pub expected_items: Option<u32>,
    pub bloom_false_positive_rate: Option<f64>,
    pub hll_error_rate: Option<f64>,
    pub minhash_permutations: Option<u32>,
    pub seed: Option<u64>,
}

#[napi(object)]
pub struct JsDatasetInput {
    pub name: String,
    pub records: Vec<Vec<String>>,
    pub sketch: Option<JsSketchConfig>,
}

#[napi(object)]
pub struct JsThresholds {
    pub high_overlap: Option<f64>,
    pub moderate_overlap: Option<f64>,
    pub uniqueness_alert: Option<f64>,
    pub near_exact_match_ratio: Option<f64>,
}

#[napi(object)]
pub struct JsJoinOptions {
    pub thresholds: Option<JsThresholds>,
}

#[napi(object)]
pub struct JsDatasetSummary {
    pub name: String,
    pub record_count: u32,
    pub quasi_identifier_width: u32,
    pub estimated_unique: f64,
    pub uniqueness_ratio: f64,
}

#[napi(object)]
pub struct JsEstimateInterval {
    pub point_estimate: f64,
    pub lower_bound: f64,
    pub upper_bound: f64,
    pub relative_error: f64,
}

#[napi(object)]
pub struct JsRiskBounds {
    pub lower_bound: f64,
    pub upper_bound: f64,
    pub classification: String,
    pub notes: Vec<String>,
}

#[napi(object)]
pub struct JsJoinRiskReport {
    pub left: JsDatasetSummary,
    pub right: JsDatasetSummary,
    pub join_cardinality: JsEstimateInterval,
    pub jaccard_similarity: f64,
    pub overlap_ratio: f64,
    pub risk_bounds: JsRiskBounds,
    pub guardrail_recommendations: Vec<String>,
    pub seed: u64,
}

#[napi]
pub fn assess_join(
    left: JsDatasetInput,
    right: JsDatasetInput,
    options: Option<JsJoinOptions>,
) -> Result<JsJoinRiskReport> {
    let left_config = apply_sketch_overrides(left.sketch.clone(), SketchConfig::default());
    let right_config = apply_sketch_overrides(right.sketch.clone(), SketchConfig::default());

    let left_profile = DatasetProfile::from_records(left.name, left.records, left_config);
    let right_profile = DatasetProfile::from_records(right.name, right.records, right_config);

    let thresholds = options
        .and_then(|opts| opts.thresholds)
        .map(apply_thresholds)
        .unwrap_or_default();
    let estimator = JoinEstimator::new(thresholds);
    let report = estimator.assess_join(&left_profile, &right_profile);
    Ok(to_js_report(report))
}

fn apply_sketch_overrides(overrides: Option<JsSketchConfig>, mut config: SketchConfig) -> SketchConfig {
    if let Some(overrides) = overrides {
        if let Some(items) = overrides.expected_items {
            config.expected_items = items as usize;
        }
        if let Some(fpr) = overrides.bloom_false_positive_rate {
            config.bloom_false_positive_rate = fpr;
        }
        if let Some(err) = overrides.hll_error_rate {
            config.hll_error_rate = err;
        }
        if let Some(perms) = overrides.minhash_permutations {
            config.minhash_permutations = perms as usize;
        }
        if let Some(seed) = overrides.seed {
            config.seed = seed;
        }
    }
    config
}

fn apply_thresholds(thresholds: JsThresholds) -> RiskThresholds {
    let mut configured = RiskThresholds::default();
    if let Some(v) = thresholds.high_overlap {
        configured.high_overlap = v;
    }
    if let Some(v) = thresholds.moderate_overlap {
        configured.moderate_overlap = v;
    }
    if let Some(v) = thresholds.uniqueness_alert {
        configured.uniqueness_alert = v;
    }
    if let Some(v) = thresholds.near_exact_match_ratio {
        configured.near_exact_match_ratio = v;
    }
    configured
}

fn to_js_report(report: JoinRiskReport) -> JsJoinRiskReport {
    JsJoinRiskReport {
        left: JsDatasetSummary {
            name: report.left.name,
            record_count: report.left.record_count as u32,
            quasi_identifier_width: report.left.quasi_identifier_width as u32,
            estimated_unique: report.left.estimated_unique,
            uniqueness_ratio: report.left.uniqueness_ratio,
        },
        right: JsDatasetSummary {
            name: report.right.name,
            record_count: report.right.record_count as u32,
            quasi_identifier_width: report.right.quasi_identifier_width as u32,
            estimated_unique: report.right.estimated_unique,
            uniqueness_ratio: report.right.uniqueness_ratio,
        },
        join_cardinality: JsEstimateInterval {
            point_estimate: report.join_cardinality.point_estimate,
            lower_bound: report.join_cardinality.lower_bound,
            upper_bound: report.join_cardinality.upper_bound,
            relative_error: report.join_cardinality.relative_error,
        },
        jaccard_similarity: report.jaccard_similarity,
        overlap_ratio: report.overlap_ratio,
        risk_bounds: JsRiskBounds {
            lower_bound: report.risk_bounds.lower_bound,
            upper_bound: report.risk_bounds.upper_bound,
            classification: match report.risk_bounds.classification {
                RiskLevel::Low => "low".to_string(),
                RiskLevel::Moderate => "moderate".to_string(),
                RiskLevel::High => "high".to_string(),
            },
            notes: report.risk_bounds.notes,
        },
        guardrail_recommendations: report.guardrail_recommendations,
        seed: report.seed,
    }
}
