use serde::{Deserialize, Serialize};

use crate::noise::Mechanism;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct LedgerEntry {
    pub job_id: String,
    pub target: String,
    pub mechanism: Mechanism,
    pub epsilon: f64,
    pub delta: Option<f64>,
    pub sensitivity: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
pub struct PrivacyLedger {
    pub entries: Vec<LedgerEntry>,
}

impl PrivacyLedger {
    pub fn new() -> Self {
        Self {
            entries: Vec::new(),
        }
    }

    pub fn record(&mut self, entry: LedgerEntry) {
        self.entries.push(entry);
    }

    pub fn cumulative_epsilon(&self, job_id: &str) -> f64 {
        self.entries
            .iter()
            .filter(|e| e.job_id == job_id)
            .map(|e| e.epsilon)
            .sum()
    }

    pub fn cumulative_delta(&self, job_id: &str) -> f64 {
        self.entries
            .iter()
            .filter(|e| e.job_id == job_id)
            .map(|e| e.delta.unwrap_or(0.0))
            .sum()
    }
}
