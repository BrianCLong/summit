use std::collections::HashMap;
use std::sync::Arc;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use parking_lot::RwLock;
use tokio::sync::Mutex;
use tokio_postgres::Client;

use crate::crypto::SealedFeatureBlob;
use crate::error::{EfsError, Result};
use crate::policy::AttestationPolicy;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct FeatureRecord {
    pub tenant_id: String,
    pub feature_key: String,
    pub sealed_blob: SealedFeatureBlob,
    pub policy: AttestationPolicy,
    pub policy_hash: Vec<u8>,
    pub created_at: DateTime<Utc>,
}

impl FeatureRecord {
    pub fn new(
        tenant_id: String,
        feature_key: String,
        sealed_blob: SealedFeatureBlob,
        policy: AttestationPolicy,
    ) -> Self {
        let policy_hash = policy.hash().to_vec();
        Self {
            tenant_id,
            feature_key,
            sealed_blob,
            policy,
            policy_hash,
            created_at: Utc::now(),
        }
    }
}

#[async_trait]
pub trait FeatureRepository: Send + Sync {
    async fn put(&self, record: FeatureRecord) -> Result<()>;
    async fn get(&self, tenant_id: &str, feature_key: &str) -> Result<Option<FeatureRecord>>;
}

#[derive(Clone, Default)]
pub struct InMemoryFeatureRepository {
    inner: Arc<RwLock<HashMap<(String, String), FeatureRecord>>>,
}

#[async_trait]
impl FeatureRepository for InMemoryFeatureRepository {
    async fn put(&self, record: FeatureRecord) -> Result<()> {
        let key = (record.tenant_id.clone(), record.feature_key.clone());
        self.inner.write().insert(key, record);
        Ok(())
    }

    async fn get(&self, tenant_id: &str, feature_key: &str) -> Result<Option<FeatureRecord>> {
        Ok(self
            .inner
            .read()
            .get(&(tenant_id.to_string(), feature_key.to_string()))
            .cloned())
    }
}

pub struct PgFeatureRepository {
    client: Arc<Mutex<Client>>,
}

impl PgFeatureRepository {
    pub fn new(client: Client) -> Self {
        Self {
            client: Arc::new(Mutex::new(client)),
        }
    }
}

#[async_trait]
impl FeatureRepository for PgFeatureRepository {
    async fn put(&self, record: FeatureRecord) -> Result<()> {
        let sealed_bytes = serde_json::to_vec(&record.sealed_blob)?;
        let policy_json = serde_json::to_string(&record.policy)?;
        let client = self.client.lock().await;
        client
            .execute(
                "INSERT INTO efs_features (tenant_id, feature_key, sealed_blob, policy_json, policy_hash, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (tenant_id, feature_key)
                 DO UPDATE SET sealed_blob = EXCLUDED.sealed_blob,
                               policy_json = EXCLUDED.policy_json,
                               policy_hash = EXCLUDED.policy_hash,
                               created_at = EXCLUDED.created_at",
                &[&record.tenant_id, &record.feature_key, &sealed_bytes, &policy_json, &record.policy_hash, &record.created_at],
            )
            .await
            .map_err(|e| EfsError::Repository(e.to_string()))?;
        Ok(())
    }

    async fn get(&self, tenant_id: &str, feature_key: &str) -> Result<Option<FeatureRecord>> {
        let client = self.client.lock().await;
        let row = client
            .query_opt(
                "SELECT sealed_blob, policy_json, policy_hash, created_at FROM efs_features WHERE tenant_id = $1 AND feature_key = $2",
                &[&tenant_id, &feature_key],
            )
            .await
            .map_err(|e| EfsError::Repository(e.to_string()))?;
        if let Some(row) = row {
            let sealed_bytes: Vec<u8> = row.get("sealed_blob");
            let policy_json: String = row.get("policy_json");
            let policy_hash: Vec<u8> = row.get("policy_hash");
            let created_at: DateTime<Utc> = row.get("created_at");
            let sealed_blob: SealedFeatureBlob = serde_json::from_slice(&sealed_bytes)
                .map_err(|e| EfsError::Repository(e.to_string()))?;
            let policy: AttestationPolicy = serde_json::from_str(&policy_json)
                .map_err(|e| EfsError::Repository(e.to_string()))?;
            Ok(Some(FeatureRecord {
                tenant_id: tenant_id.to_string(),
                feature_key: feature_key.to_string(),
                sealed_blob,
                policy,
                policy_hash,
                created_at,
            }))
        } else {
            Ok(None)
        }
    }
}
