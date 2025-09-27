use rand::prelude::*;
use rand_distr::{Distribution, Exp1, Normal};
use serde::{Deserialize, Serialize};

use crate::errors::{DPSCError, Result};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum Mechanism {
    Laplace,
    Gaussian,
}

impl Mechanism {
    pub fn from_str(value: &str) -> Result<Self> {
        match value.to_ascii_lowercase().as_str() {
            "laplace" => Ok(Mechanism::Laplace),
            "gaussian" => Ok(Mechanism::Gaussian),
            other => Err(DPSCError::UnsupportedMechanism(other.to_string())),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct NoiseParameters {
    pub scale: f64,
    pub epsilon: f64,
    pub delta: Option<f64>,
    pub sensitivity: f64,
}

impl NoiseParameters {
    pub fn new_laplace(epsilon: f64, sensitivity: f64) -> Self {
        Self {
            scale: sensitivity / epsilon,
            epsilon,
            delta: None,
            sensitivity,
        }
    }

    pub fn new_gaussian(epsilon: f64, delta: f64, sensitivity: f64) -> Self {
        let sigma = sensitivity * (2.0 * (1.25 / delta).ln()).sqrt() / epsilon;
        Self {
            scale: sigma,
            epsilon,
            delta: Some(delta),
            sensitivity,
        }
    }

    pub fn variance(&self, mechanism: Mechanism) -> f64 {
        match mechanism {
            Mechanism::Laplace => 2.0 * self.scale.powi(2),
            Mechanism::Gaussian => self.scale.powi(2),
        }
    }
}

pub fn sample_noise(mechanism: Mechanism, params: &NoiseParameters, rng: &mut StdRng) -> f64 {
    match mechanism {
        Mechanism::Laplace => {
            let exp_sample: f64 = Exp1.sample(rng);
            let sign = if rng.gen_bool(0.5) { 1.0 } else { -1.0 };
            sign * exp_sample * params.scale
        }
        Mechanism::Gaussian => {
            let dist = Normal::new(0.0, params.scale).expect("gaussian parameters valid");
            dist.sample(rng)
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum AggregationKind {
    Count,
    Sum,
    Avg,
}

impl AggregationKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            AggregationKind::Count => "COUNT",
            AggregationKind::Sum => "SUM",
            AggregationKind::Avg => "AVG",
        }
    }
}

impl From<&str> for AggregationKind {
    fn from(value: &str) -> Self {
        match value.to_ascii_uppercase().as_str() {
            "COUNT" => AggregationKind::Count,
            "SUM" => AggregationKind::Sum,
            "AVG" | "AVERAGE" => AggregationKind::Avg,
            _ => AggregationKind::Sum,
        }
    }
}

pub fn numeric_sensitivity(bounds: &Option<crate::annotation::Bounds>) -> Result<f64> {
    if let Some(b) = bounds {
        Ok(b.upper.abs().max(b.lower.abs()))
    } else {
        Err(DPSCError::AnnotationParse(
            "numeric aggregates require bounds; provide lower and upper".into(),
        ))
    }
}
