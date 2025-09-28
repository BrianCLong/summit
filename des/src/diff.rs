use std::collections::BTreeMap;

use ordered_float::OrderedFloat;

use crate::{error::DesError, store::EmbeddingRecord};

#[derive(Clone, Debug)]
pub struct DriftEntry {
    pub item_id: String,
    pub baseline_version: String,
    pub candidate_version: String,
    pub cosine_similarity: f32,
    pub cosine_delta: f32,
}

#[derive(Clone, Debug)]
pub struct CosineDrift {
    pub entries: Vec<DriftEntry>,
    pub missing_from_candidate: Vec<String>,
    pub missing_from_baseline: Vec<String>,
    pub average_similarity: Option<f32>,
}

impl CosineDrift {
    pub fn worst(&self) -> Option<&DriftEntry> {
        self.entries
            .iter()
            .min_by_key(|entry| OrderedFloat(entry.cosine_similarity))
    }
}

pub fn cosine_drift(
    baseline: &BTreeMap<String, EmbeddingRecord>,
    candidate: &BTreeMap<String, EmbeddingRecord>,
) -> Result<CosineDrift, DesError> {
    let mut entries = Vec::new();
    let mut missing_from_candidate = Vec::new();
    let mut missing_from_baseline = Vec::new();

    for (id, base_record) in baseline {
        match candidate.get(id) {
            Some(candidate_record) => {
                let cosine = cosine_similarity(&base_record.vector, &candidate_record.vector);
                let entry = DriftEntry {
                    item_id: id.clone(),
                    baseline_version: base_record.version.clone(),
                    candidate_version: candidate_record.version.clone(),
                    cosine_delta: 1.0 - cosine,
                    cosine_similarity: cosine,
                };
                entries.push(entry);
            }
            None => missing_from_candidate.push(id.clone()),
        }
    }

    for id in candidate.keys() {
        if !baseline.contains_key(id) {
            missing_from_baseline.push(id.clone());
        }
    }

    if entries.is_empty() {
        return Err(DesError::EmptyDiff);
    }

    entries.sort_by(|a, b| a.item_id.cmp(&b.item_id));
    let avg = entries
        .iter()
        .map(|entry| entry.cosine_similarity as f64)
        .sum::<f64>()
        / entries.len() as f64;

    Ok(CosineDrift {
        entries,
        missing_from_candidate,
        missing_from_baseline,
        average_similarity: Some(avg as f32),
    })
}

fn cosine_similarity(lhs: &[f32], rhs: &[f32]) -> f32 {
    let dot = lhs
        .iter()
        .zip(rhs.iter())
        .map(|(l, r)| (*l as f64) * (*r as f64))
        .sum::<f64>();
    let lhs_norm = lhs
        .iter()
        .map(|v| (*v as f64) * (*v as f64))
        .sum::<f64>()
        .sqrt();
    let rhs_norm = rhs
        .iter()
        .map(|v| (*v as f64) * (*v as f64))
        .sum::<f64>()
        .sqrt();
    if lhs_norm == 0.0 || rhs_norm == 0.0 {
        0.0
    } else {
        (dot / (lhs_norm * rhs_norm)) as f32
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        config::{EmbeddingConfig, PoolingMethod},
        store::EmbeddingRecord,
    };

    fn config() -> EmbeddingConfig {
        EmbeddingConfig {
            model_id: "test".into(),
            model_hash: "hash".into(),
            tokenizer_hash: "tok".into(),
            pooling: PoolingMethod::Mean,
            quantization: None,
            pre_normalization: vec![],
            post_normalization: vec![],
        }
    }

    #[test]
    fn computes_cosine_drift() {
        let cfg = config();
        let baseline = EmbeddingRecord::new("a", "v1", cfg.clone(), vec![1.0, 0.0], None);
        let candidate = EmbeddingRecord::new("a", "v2", cfg, vec![0.0, 1.0], None);
        let mut base = BTreeMap::new();
        base.insert("a".to_string(), baseline);
        let mut cand = BTreeMap::new();
        cand.insert("a".to_string(), candidate);

        let drift = cosine_drift(&base, &cand).expect("drift");
        assert_eq!(drift.entries.len(), 1);
        assert!((drift.entries[0].cosine_similarity.abs() - 0.0).abs() < 1e-6);
    }
}
