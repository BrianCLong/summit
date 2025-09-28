use std::collections::{HashMap, HashSet};
use std::sync::Arc;

use parking_lot::Mutex;
use subtle::ConstantTimeEq;

use crate::attestation::{AttestationReport, MockEnclave};
use crate::crypto::{SealedFeatureBlob, SealingKeyProvider};
use crate::error::{EfsError, Result};
use crate::policy::AttestationPolicy;
use crate::repository::{FeatureRecord, FeatureRepository};

#[derive(Debug, Clone)]
pub struct AttestationRequest {
    pub tenant_id: String,
    pub feature_key: String,
    pub nonce: Vec<u8>,
    pub expected_policy_hash: Vec<u8>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AttestedFeatureBundle {
    pub sealed_blob: SealedFeatureBlob,
    pub report: AttestationReport,
}

pub struct FeatureStore<R: FeatureRepository> {
    repository: Arc<R>,
    sealing: SealingKeyProvider,
    enclave: MockEnclave,
    nonce_guard: Mutex<HashMap<(String, String), HashSet<Vec<u8>>>>,
}

impl<R: FeatureRepository> FeatureStore<R> {
    pub fn new(repository: R, sealing: SealingKeyProvider, attestation_key: [u8; 32]) -> Self {
        Self {
            repository: Arc::new(repository),
            sealing,
            enclave: MockEnclave::new(attestation_key),
            nonce_guard: Mutex::new(HashMap::new()),
        }
    }

    pub fn with_repository(
        repository: Arc<R>,
        sealing: SealingKeyProvider,
        attestation_key: [u8; 32],
    ) -> Self {
        Self {
            repository,
            sealing,
            enclave: MockEnclave::new(attestation_key),
            nonce_guard: Mutex::new(HashMap::new()),
        }
    }

    pub fn attestation_key(&self) -> [u8; 32] {
        self.enclave.attestation_key()
    }

    pub async fn put_features(
        &self,
        tenant_id: &str,
        feature_key: &str,
        payload: &[u8],
        policy: AttestationPolicy,
    ) -> Result<()> {
        let sealed_blob = self.sealing.seal(tenant_id, payload)?;
        let record = FeatureRecord::new(
            tenant_id.to_string(),
            feature_key.to_string(),
            sealed_blob,
            policy,
        );
        self.repository.put(record).await
    }

    pub async fn get_features_attested(
        &self,
        request: AttestationRequest,
    ) -> Result<AttestedFeatureBundle> {
        let record = self
            .repository
            .get(&request.tenant_id, &request.feature_key)
            .await?
            .ok_or(EfsError::NotFound)?;

        if request.expected_policy_hash.len() != record.policy_hash.len()
            || request
                .expected_policy_hash
                .ct_eq(&record.policy_hash)
                .unwrap_u8()
                == 0
        {
            return Err(EfsError::PolicyMismatch);
        }

        self.ensure_nonce(&request.tenant_id, &request.feature_key, &request.nonce)?;

        match self.enclave.attest(
            &request.tenant_id,
            &request.feature_key,
            &request.nonce,
            &record.policy_hash,
            &record.sealed_blob,
        ) {
            Ok(report) => Ok(AttestedFeatureBundle {
                sealed_blob: record.sealed_blob,
                report,
            }),
            Err(err) => {
                self.rollback_nonce(&request.tenant_id, &request.feature_key, &request.nonce);
                Err(err)
            }
        }
    }

    fn ensure_nonce(&self, tenant_id: &str, feature_key: &str, nonce: &[u8]) -> Result<()> {
        let mut guard = self.nonce_guard.lock();
        let entry = guard
            .entry((tenant_id.to_string(), feature_key.to_string()))
            .or_insert_with(HashSet::new);
        if entry.contains(nonce) {
            return Err(EfsError::ReplayDetected);
        }
        entry.insert(nonce.to_vec());
        Ok(())
    }

    fn rollback_nonce(&self, tenant_id: &str, feature_key: &str, nonce: &[u8]) {
        let mut guard = self.nonce_guard.lock();
        if let Some(entry) = guard.get_mut(&(tenant_id.to_string(), feature_key.to_string())) {
            entry.remove(nonce);
        }
    }

    pub fn sealing_provider(&self) -> &SealingKeyProvider {
        &self.sealing
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repository::InMemoryFeatureRepository;

    fn test_store() -> FeatureStore<InMemoryFeatureRepository> {
        let repo = InMemoryFeatureRepository::default();
        let sealing = SealingKeyProvider::new([7u8; 32]);
        FeatureStore::new(repo, sealing, [9u8; 32])
    }

    fn sample_policy() -> AttestationPolicy {
        AttestationPolicy {
            version: 1,
            statement: "features may be released to attested callers".into(),
            extra_context: None,
        }
    }

    #[tokio::test]
    async fn denies_reads_without_valid_policy_hash() {
        let store = test_store();
        let policy = sample_policy();
        store
            .put_features("tenant-a", "feature-x", b"{\"score\":0.91}", policy.clone())
            .await
            .unwrap();

        let request = AttestationRequest {
            tenant_id: "tenant-a".into(),
            feature_key: "feature-x".into(),
            nonce: vec![1, 2, 3, 4],
            expected_policy_hash: vec![0; 32],
        };

        let err = store.get_features_attested(request).await.unwrap_err();
        assert!(matches!(err, EfsError::PolicyMismatch));
    }

    #[tokio::test]
    async fn replay_is_detected() {
        let store = test_store();
        let policy = sample_policy();
        let policy_hash = policy.hash().to_vec();
        store
            .put_features("tenant-b", "feature-y", b"{\"score\":0.11}", policy)
            .await
            .unwrap();

        let request = AttestationRequest {
            tenant_id: "tenant-b".into(),
            feature_key: "feature-y".into(),
            nonce: vec![8, 8, 8, 8],
            expected_policy_hash: policy_hash.clone(),
        };

        store
            .get_features_attested(request.clone())
            .await
            .expect("first attestation succeeds");
        let err = store.get_features_attested(request).await.unwrap_err();
        assert!(matches!(err, EfsError::ReplayDetected));
    }

    #[tokio::test]
    async fn attestation_verifies_offline() {
        let store = test_store();
        let policy = sample_policy();
        let policy_hash = policy.hash().to_vec();
        store
            .put_features("tenant-c", "feature-z", b"{\"score\":0.55}", policy)
            .await
            .unwrap();

        let request = AttestationRequest {
            tenant_id: "tenant-c".into(),
            feature_key: "feature-z".into(),
            nonce: vec![9, 9, 9, 9, 1],
            expected_policy_hash: policy_hash,
        };

        let bundle = store
            .get_features_attested(request)
            .await
            .expect("attestation succeeds");
        let attestation_key = store.attestation_key();
        crate::verifier::verify_quote(&bundle.report.quote, &attestation_key, &bundle.sealed_blob)
            .expect("quote verifies");
        assert!(crate::verifier::verify_payload_hash(
            &bundle.report.quote,
            &bundle.sealed_blob
        ));
    }
}
