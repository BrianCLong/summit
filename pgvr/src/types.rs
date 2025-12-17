use std::collections::{HashMap, HashSet};

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq)]
pub struct VectorRecord {
    pub id: String,
    pub tenant_id: String,
    pub vector: Vec<f32>,
    pub fields: HashMap<String, String>,
    pub jurisdictions: HashSet<String>,
    pub purposes: HashSet<String>,
}

impl VectorRecord {
    pub fn is_accessible(&self, jurisdiction: Option<&str>, purpose: Option<&str>) -> bool {
        if let Some(j) = jurisdiction {
            if !self.jurisdictions.contains(j) {
                return false;
            }
        }
        if let Some(p) = purpose {
            if !self.purposes.contains(p) {
                return false;
            }
        }
        true
    }
}

#[derive(Debug, Clone)]
pub struct SearchQuery {
    pub tenant_id: String,
    pub vector: Vec<f32>,
    pub top_k: usize,
    pub requested_fields: HashSet<String>,
    pub jurisdiction: Option<String>,
    pub purpose: Option<String>,
}

impl SearchQuery {
    pub fn new(
        tenant_id: impl Into<String>,
        vector: Vec<f32>,
        top_k: usize,
        requested_fields: impl IntoIterator<Item = String>,
        jurisdiction: Option<String>,
        purpose: Option<String>,
    ) -> Self {
        let requested_fields = requested_fields.into_iter().collect();
        Self {
            tenant_id: tenant_id.into(),
            vector,
            top_k,
            requested_fields,
            jurisdiction,
            purpose,
        }
    }

    pub fn requested_fields(&self) -> &HashSet<String> {
        &self.requested_fields
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum SearchMode {
    Live,
    DryRun,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub vector_id: String,
    pub score: f32,
    pub index_id: String,
    pub policy_hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SearchResponse {
    pub mode: SearchMode,
    pub results: Vec<SearchResult>,
}
