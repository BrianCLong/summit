use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub enum NormalizationStep {
    /// Scale vector to unit length (L2 norm == 1).
    L2,
    /// Subtract the mean of the vector from each component.
    MeanCenter,
    /// Normalize by standard deviation with optional epsilon guard.
    ZScore { epsilon: f32 },
}

impl NormalizationStep {
    pub(crate) fn apply(&self, vector: &mut [f32]) {
        match self {
            NormalizationStep::L2 => {
                let norm = vector
                    .iter()
                    .map(|v| (*v as f64) * (*v as f64))
                    .sum::<f64>()
                    .sqrt();
                if norm > 0.0 {
                    let inv = 1.0 / norm;
                    for v in vector {
                        *v = (*v as f64 * inv) as f32;
                    }
                }
            }
            NormalizationStep::MeanCenter => {
                if vector.is_empty() {
                    return;
                }
                let mean = vector.iter().map(|v| *v as f64).sum::<f64>() / vector.len() as f64;
                for v in vector {
                    *v = (*v as f64 - mean) as f32;
                }
            }
            NormalizationStep::ZScore { epsilon } => {
                if vector.is_empty() {
                    return;
                }
                let mean = vector.iter().map(|v| *v as f64).sum::<f64>() / vector.len() as f64;
                let variance = vector
                    .iter()
                    .map(|v| {
                        let centered = *v as f64 - mean;
                        centered * centered
                    })
                    .sum::<f64>()
                    / vector.len().max(1) as f64;
                let std = (variance + (*epsilon as f64)).sqrt();
                if std > 0.0 {
                    for v in vector {
                        *v = ((*v as f64 - mean) / std) as f32;
                    }
                }
            }
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum PoolingMethod {
    Mean,
    Max,
    Sum,
    CLS,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct DeterministicQuantization {
    pub method: String,
    pub bits: u8,
    pub scale: f32,
    pub zero_point: f32,
}

impl DeterministicQuantization {
    pub fn apply(&self, vector: &mut [f32]) {
        if vector.is_empty() {
            return;
        }
        let levels = (1u32 << self.bits) - 1;
        let max_level = levels as f32;
        for value in vector {
            let transformed = (*value / self.scale) + self.zero_point;
            let clamped = transformed.clamp(0.0, max_level);
            let quantized = clamped.round();
            *value = (quantized - self.zero_point) * self.scale;
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct EmbeddingConfig {
    pub model_id: String,
    pub model_hash: String,
    pub tokenizer_hash: String,
    pub pooling: PoolingMethod,
    pub quantization: Option<DeterministicQuantization>,
    pub pre_normalization: Vec<NormalizationStep>,
    pub post_normalization: Vec<NormalizationStep>,
}

impl EmbeddingConfig {
    pub fn signature(&self) -> String {
        serde_json::to_string(self).expect("config signature serialization never fails")
    }

    pub fn apply_pipeline(&self, vector: &[f32]) -> Vec<f32> {
        let mut working = vector.to_vec();
        for step in &self.pre_normalization {
            step.apply(&mut working);
        }
        if let Some(quantization) = &self.quantization {
            quantization.apply(&mut working);
        }
        for step in &self.post_normalization {
            step.apply(&mut working);
        }
        working
    }
}
