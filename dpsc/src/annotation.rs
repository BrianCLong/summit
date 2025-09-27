use regex::Regex;
use serde::{Deserialize, Serialize};

use crate::errors::{DPSCError, Result};
use crate::noise::Mechanism;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Bounds {
    pub lower: f64,
    pub upper: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DPAnnotation {
    pub epsilon: f64,
    pub mechanism: Mechanism,
    pub delta: Option<f64>,
    pub sensitivity: Option<f64>,
    pub job_id: Option<String>,
    pub bounds: Option<Bounds>,
}

impl DPAnnotation {
    pub fn parse(sql: &str) -> Result<(Self, String)> {
        let start = sql.find("/*dp:").ok_or(DPSCError::MissingAnnotation)?;
        let after_start = &sql[start + 5..];
        let end_rel = after_start
            .find("*/")
            .ok_or_else(|| DPSCError::AnnotationParse("unterminated dp comment".into()))?;
        let annotation_body = &after_start[..end_rel];
        let end_idx = start + 5 + end_rel + 2;

        let mut stripped = String::new();
        stripped.push_str(sql[..start].trim_end());
        if !stripped.is_empty() {
            stripped.push(' ');
        }
        stripped.push_str(sql[end_idx..].trim_start());

        let mut epsilon = None;
        let mut mechanism = None;
        let mut delta = None;
        let mut sensitivity = None;
        let mut job_id = None;
        let mut lower = None;
        let mut upper = None;

        let token_pattern = Regex::new(r"[\w\-]+=[^\s]+").expect("valid regex");
        for token in annotation_body.split_whitespace() {
            if !token_pattern.is_match(token) {
                continue;
            }
            let mut parts = token.splitn(2, '=');
            let key = parts.next().unwrap().trim().to_ascii_lowercase();
            let raw_value = parts.next().unwrap().trim();
            match key.as_str() {
                "epsilon" => {
                    let value = raw_value
                        .parse::<f64>()
                        .map_err(|e| DPSCError::AnnotationParse(e.to_string()))?;
                    if value <= 0.0 {
                        return Err(DPSCError::InvalidEpsilon(value));
                    }
                    epsilon = Some(value);
                }
                "mech" | "mechanism" => {
                    mechanism = Some(Mechanism::from_str(raw_value)?);
                }
                "delta" => {
                    let value = raw_value
                        .parse::<f64>()
                        .map_err(|e| DPSCError::AnnotationParse(e.to_string()))?;
                    if !(0.0 < value && value < 1.0) {
                        return Err(DPSCError::InvalidDelta(value));
                    }
                    delta = Some(value);
                }
                "sensitivity" => {
                    let value = raw_value
                        .parse::<f64>()
                        .map_err(|e| DPSCError::AnnotationParse(e.to_string()))?;
                    if value <= 0.0 {
                        return Err(DPSCError::InvalidSensitivity(value));
                    }
                    sensitivity = Some(value);
                }
                "job" | "job_id" => {
                    job_id = Some(raw_value.to_string());
                }
                "lower" => {
                    lower = Some(
                        raw_value
                            .parse::<f64>()
                            .map_err(|e| DPSCError::AnnotationParse(e.to_string()))?,
                    );
                }
                "upper" => {
                    upper = Some(
                        raw_value
                            .parse::<f64>()
                            .map_err(|e| DPSCError::AnnotationParse(e.to_string()))?,
                    );
                }
                _ => {}
            }
        }

        let epsilon = epsilon.ok_or_else(|| {
            DPSCError::AnnotationParse("epsilon is required in dp annotation".into())
        })?;
        let mechanism = mechanism.ok_or_else(|| {
            DPSCError::AnnotationParse("mechanism is required in dp annotation".into())
        })?;

        let bounds = match (lower, upper) {
            (Some(l), Some(u)) => Some(Bounds { lower: l, upper: u }),
            (None, None) => None,
            _ => {
                return Err(DPSCError::AnnotationParse(
                    "both lower and upper bounds must be supplied".into(),
                ));
            }
        };

        Ok((
            DPAnnotation {
                epsilon,
                mechanism,
                delta,
                sensitivity,
                job_id,
                bounds,
            },
            stripped,
        ))
    }
}
