use std::cmp::Ordering;
use std::sync::Arc;

use serde::Deserialize;

use crate::types::VectorRecord;

#[derive(Clone)]
pub struct SearchCandidate {
    pub record: Arc<VectorRecord>,
    pub score: f32,
}

impl SearchCandidate {
    fn new(record: Arc<VectorRecord>, score: f32) -> Self {
        Self { record, score }
    }
}

pub trait VectorBackend: Send + Sync {
    fn search(&self, query_vector: &[f32], top_k: usize) -> Vec<SearchCandidate>;
}

#[derive(Clone)]
pub struct HnswBackend {
    records: Vec<Arc<VectorRecord>>,
}

impl HnswBackend {
    pub fn new(records: Vec<VectorRecord>) -> Self {
        let records = records.into_iter().map(Arc::new).collect();
        Self { records }
    }
}

impl VectorBackend for HnswBackend {
    fn search(&self, query_vector: &[f32], top_k: usize) -> Vec<SearchCandidate> {
        let mut scored: Vec<_> = self
            .records
            .iter()
            .cloned()
            .map(|record| {
                let score = dot_product(&record.vector, query_vector);
                SearchCandidate::new(record, score)
            })
            .collect();

        scored.sort_by(|a, b| compare_candidates(a, b));
        scored.truncate(top_k.min(scored.len()));
        scored
    }
}

#[derive(Clone)]
pub struct IvfBackend {
    records: Vec<Arc<VectorRecord>>,
}

impl IvfBackend {
    pub fn new(records: Vec<VectorRecord>) -> Self {
        let records = records.into_iter().map(Arc::new).collect();
        Self { records }
    }
}

impl VectorBackend for IvfBackend {
    fn search(&self, query_vector: &[f32], top_k: usize) -> Vec<SearchCandidate> {
        let mut scored: Vec<_> = self
            .records
            .iter()
            .cloned()
            .map(|record| {
                let score = negative_l2(&record.vector, query_vector);
                SearchCandidate::new(record, score)
            })
            .collect();

        scored.sort_by(|a, b| compare_candidates(a, b));
        scored.truncate(top_k.min(scored.len()));
        scored
    }
}

fn compare_candidates(a: &SearchCandidate, b: &SearchCandidate) -> Ordering {
    b.score
        .partial_cmp(&a.score)
        .unwrap_or(Ordering::Equal)
        .then_with(|| a.record.id.cmp(&b.record.id))
}

fn dot_product(a: &[f32], b: &[f32]) -> f32 {
    a.iter().zip(b.iter()).map(|(x, y)| x * y).sum::<f32>()
}

fn negative_l2(a: &[f32], b: &[f32]) -> f32 {
    -a.iter()
        .zip(b.iter())
        .map(|(x, y)| (x - y).powi(2))
        .sum::<f32>()
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BackendKind {
    Hnsw,
    Ivf,
}
