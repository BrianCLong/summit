use std::collections::BTreeMap;

use parking_lot::RwLock;
use serde::{Deserialize, Serialize};

use crate::{config::EmbeddingConfig, error::DesError};

pub type VersionId = String;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct EmbeddingRecord {
    pub item_id: String,
    pub version: VersionId,
    pub config: EmbeddingConfig,
    pub vector: Vec<f32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<serde_json::Value>,
}

impl EmbeddingRecord {
    pub fn new(
        item_id: impl Into<String>,
        version: impl Into<String>,
        config: EmbeddingConfig,
        raw_vector: Vec<f32>,
        metadata: Option<serde_json::Value>,
    ) -> Self {
        let processed = config.apply_pipeline(&raw_vector);
        EmbeddingRecord {
            item_id: item_id.into(),
            version: version.into(),
            config,
            vector: processed,
            metadata,
        }
    }

    pub fn dimension(&self) -> usize {
        self.vector.len()
    }
}

#[derive(Default)]
pub struct EmbeddingStore {
    inner: RwLock<BTreeMap<String, BTreeMap<VersionId, EmbeddingRecord>>>,
}

impl EmbeddingStore {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn len(&self) -> usize {
        self.inner
            .read()
            .values()
            .map(|versions| versions.len())
            .sum()
    }

    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }

    pub fn upsert(&self, record: EmbeddingRecord) -> Result<EmbeddingRecord, DesError> {
        let mut guard = self.inner.write();
        let entry = guard.entry(record.item_id.clone()).or_default();
        if let Some(existing) = entry.get(&record.version) {
            if existing.config.signature() != record.config.signature()
                || existing.vector != record.vector
            {
                return Err(DesError::ConflictingEmbedding {
                    id: record.item_id,
                    version: record.version,
                });
            }
            return Ok(existing.clone());
        }
        if let Some((_, existing)) = entry.iter().next() {
            if existing.dimension() != record.dimension() {
                return Err(DesError::DimensionMismatch {
                    id: record.item_id.clone(),
                    expected: existing.dimension(),
                    actual: record.dimension(),
                });
            }
        }
        entry.insert(record.version.clone(), record.clone());
        Ok(record)
    }

    pub fn get(&self, item_id: &str, version: &str) -> Result<EmbeddingRecord, DesError> {
        let guard = self.inner.read();
        guard
            .get(item_id)
            .and_then(|versions| versions.get(version))
            .cloned()
            .ok_or_else(|| DesError::VersionNotFound {
                id: item_id.to_string(),
                version: version.to_string(),
            })
    }

    pub fn versions_for(&self, item_id: &str) -> Option<Vec<VersionId>> {
        let guard = self.inner.read();
        guard
            .get(item_id)
            .map(|versions| versions.keys().cloned().collect())
    }

    pub fn export_snapshot(&self) -> Result<String, DesError> {
        let guard = self.inner.read();
        let snapshot = guard.clone();
        Ok(serde_json::to_string_pretty(&snapshot)?)
    }

    pub fn import_snapshot(&self, snapshot: &str) -> Result<(), DesError> {
        let decoded: BTreeMap<String, BTreeMap<VersionId, EmbeddingRecord>> =
            serde_json::from_str(snapshot)?;
        let mut guard = self.inner.write();
        *guard = decoded;
        Ok(())
    }

    pub fn records_for_version(&self, version: &str) -> BTreeMap<String, EmbeddingRecord> {
        let guard = self.inner.read();
        guard
            .iter()
            .filter_map(|(id, versions)| {
                versions
                    .get(version)
                    .map(|record| (id.clone(), record.clone()))
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::{EmbeddingConfig, NormalizationStep, PoolingMethod};

    fn config() -> EmbeddingConfig {
        EmbeddingConfig {
            model_id: "m".into(),
            model_hash: "hash".into(),
            tokenizer_hash: "tok".into(),
            pooling: PoolingMethod::CLS,
            quantization: None,
            pre_normalization: vec![NormalizationStep::MeanCenter],
            post_normalization: vec![NormalizationStep::L2],
        }
    }

    #[test]
    fn identical_reembedding_is_idempotent() {
        let store = EmbeddingStore::new();
        let cfg = config();
        let record = EmbeddingRecord::new("doc", "v1", cfg.clone(), vec![1.0, 2.0], None);
        let stored = store.upsert(record.clone()).expect("insert");
        let replay = EmbeddingRecord::new("doc", "v1", cfg, vec![1.0, 2.0], None);
        let stored_again = store.upsert(replay).expect("reinsert");
        assert_eq!(stored.vector, stored_again.vector);
        assert_eq!(store.len(), 1);
    }

    #[test]
    fn conflicting_embeddings_error() {
        let store = EmbeddingStore::new();
        let cfg = config();
        let record = EmbeddingRecord::new("doc", "v1", cfg.clone(), vec![1.0, 0.0], None);
        store.upsert(record).expect("insert");
        let conflicting = EmbeddingRecord::new("doc", "v1", cfg, vec![0.0, 1.0], None);
        let err = store.upsert(conflicting).expect_err("conflict");
        assert!(matches!(err, DesError::ConflictingEmbedding { .. }));
    }
}
