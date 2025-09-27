use std::collections::HashMap;
use std::convert::TryFrom;
use std::sync::Arc;
use std::time::{Duration, SystemTime};

use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use chrono::{DateTime, Utc};
use ed25519_dalek::{Signature, SigningKey, VerifyingKey};
use ed25519_dalek::{Signer, Verifier};
use rand::rngs::OsRng;
use serde::{Deserialize, Serialize};
use serde_with::{base64::Base64, serde_as};
use sha2::{Digest, Sha256};
use thiserror::Error;
use tokio::sync::RwLock;
use uuid::Uuid;

use crate::crypto;
use crate::crypto::CryptoError;
use crate::time::TimeProvider;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum BackendKind {
    Hsm,
    Kms,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShareBackendConfig {
    pub backend: BackendKind,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateKeyParams {
    pub jurisdiction: String,
    pub residency: String,
    pub purpose: String,
    pub threshold: usize,
    pub shares: Vec<ShareBackendConfig>,
}

#[serde_as]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShareProof {
    pub key_id: Uuid,
    pub share_id: Uuid,
    pub jurisdiction: String,
    pub residency: String,
    pub purpose: String,
    pub backend: BackendKind,
    #[serde_as(as = "Base64")]
    pub digest: Vec<u8>,
    #[serde_as(as = "Base64")]
    pub signature: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShareDescriptor {
    pub share_id: Uuid,
    pub backend: BackendKind,
    pub proof: ShareProof,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyMetadata {
    pub key_id: Uuid,
    pub jurisdiction: String,
    pub residency: String,
    pub purpose: String,
    pub threshold: usize,
    pub public_provenance_key: String,
    pub shares: Vec<ShareDescriptor>,
}

#[serde_as]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncryptionResult {
    #[serde_as(as = "Base64")]
    pub nonce: Vec<u8>,
    #[serde_as(as = "Base64")]
    pub ciphertext: Vec<u8>,
}

#[serde_as]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProvidedShare {
    pub share_id: Uuid,
    #[serde_as(as = "Base64")]
    pub share: Vec<u8>,
}

#[serde_as]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecryptionParams {
    pub key_id: Uuid,
    pub jurisdiction: String,
    pub residency: String,
    pub purpose: String,
    #[serde_as(as = "Base64")]
    pub nonce: Vec<u8>,
    #[serde_as(as = "Base64")]
    pub ciphertext: Vec<u8>,
    pub shares: Vec<ProvidedShare>,
}

#[serde_as]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecryptionResult {
    #[serde_as(as = "Base64")]
    pub plaintext: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuorumRecoveryRequest {
    pub key_id: Uuid,
    pub shares: Vec<ProvidedShare>,
}

#[serde_as]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuorumRecoveryResult {
    #[serde_as(as = "Base64")]
    pub master_secret: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateEscrowRequest {
    pub key_id: Uuid,
    pub share_ids: Vec<Uuid>,
    pub ttl_seconds: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EscrowDescriptor {
    pub escrow_id: Uuid,
    pub key_id: Uuid,
    pub expires_at: DateTime<Utc>,
    pub share_ids: Vec<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EscrowMaterial {
    pub escrow_id: Uuid,
    pub key_id: Uuid,
    pub expires_at: DateTime<Utc>,
    pub shares: Vec<ProvidedShare>,
    pub proofs: Vec<ShareProof>,
}

#[derive(Debug, Error)]
pub enum CrkreError {
    #[error("threshold must be at least 1 and less than or equal to number of shares")]
    InvalidThreshold,
    #[error("jurisdiction mismatch")]
    JurisdictionMismatch,
    #[error("residency mismatch")]
    ResidencyMismatch,
    #[error("purpose mismatch")]
    PurposeMismatch,
    #[error("key not found")]
    KeyNotFound,
    #[error("share not found in key registry")]
    ShareUnknown,
    #[error("insufficient quorum provided")]
    InsufficientQuorum,
    #[error("crypto failure: {0}")]
    Crypto(#[from] CryptoError),
    #[error("escrow expired")]
    EscrowExpired,
    #[error("escrow not found")]
    EscrowNotFound,
    #[error("signature validation failed")]
    Signature,
    #[error("escrow ttl overflowed")]
    InvalidExpiry,
}

#[derive(Clone)]
struct ShareRecord {
    share_id: Uuid,
    backend: BackendKind,
    data: Vec<u8>,
    proof: ShareProof,
}

#[derive(Clone)]
struct KeyRecord {
    key_id: Uuid,
    jurisdiction: String,
    residency: String,
    purpose: String,
    threshold: usize,
    shares: Vec<ShareRecord>,
}

#[derive(Clone)]
struct EscrowRecord {
    key_id: Uuid,
    expires_at: SystemTime,
    share_ids: Vec<Uuid>,
}

impl EscrowRecord {
    fn is_expired<T: TimeProvider>(&self, time: &T) -> bool {
        time.now() >= self.expires_at
    }
}

struct InnerState<T: TimeProvider> {
    keys: RwLock<HashMap<Uuid, KeyRecord>>,
    escrows: RwLock<HashMap<Uuid, EscrowRecord>>,
    time: T,
    signing_key: SigningKey,
    verifying_key: VerifyingKey,
}

#[derive(Clone)]
pub struct CrkreService<T: TimeProvider> {
    inner: Arc<InnerState<T>>,
}

impl<T: TimeProvider> CrkreService<T> {
    pub fn new(time: T) -> Self {
        let signing_key = SigningKey::generate(&mut OsRng);
        let verifying_key = signing_key.verifying_key();
        Self {
            inner: Arc::new(InnerState {
                keys: RwLock::new(HashMap::new()),
                escrows: RwLock::new(HashMap::new()),
                time,
                signing_key,
                verifying_key,
            }),
        }
    }

    pub fn verifying_key_b64(&self) -> String {
        BASE64.encode(self.inner.verifying_key.to_bytes())
    }

    fn digest_share(share: &[u8]) -> Vec<u8> {
        let mut hasher = Sha256::new();
        hasher.update(share);
        hasher.finalize().to_vec()
    }

    fn provenance_payload(
        key_id: &Uuid,
        share_id: &Uuid,
        backend: &BackendKind,
        jurisdiction: &str,
        residency: &str,
        purpose: &str,
        digest: &[u8],
    ) -> Vec<u8> {
        [
            key_id.as_bytes().as_slice(),
            share_id.as_bytes().as_slice(),
            jurisdiction.as_bytes(),
            residency.as_bytes(),
            purpose.as_bytes(),
            backend_label(backend).as_bytes(),
            digest,
        ]
        .concat()
    }

    pub async fn create_key(&self, params: CreateKeyParams) -> Result<KeyMetadata, CrkreError> {
        if params.threshold == 0
            || params.threshold > params.shares.len()
            || params.threshold > 255
            || params.shares.len() > 256
        {
            return Err(CrkreError::InvalidThreshold);
        }
        let key_id = Uuid::new_v4();
        let master_secret = crypto::generate_master_secret();
        let share_material =
            crypto::split_secret(&master_secret, params.threshold, params.shares.len())?;

        let mut share_descriptors = Vec::with_capacity(params.shares.len());
        let mut share_records = Vec::with_capacity(params.shares.len());
        for (cfg, bytes) in params.shares.iter().zip(share_material.iter()) {
            let share_id = Uuid::new_v4();
            let digest = Self::digest_share(bytes);
            let payload = Self::provenance_payload(
                &key_id,
                &share_id,
                &cfg.backend,
                &params.jurisdiction,
                &params.residency,
                &params.purpose,
                &digest,
            );
            let signature = self.inner.signing_key.sign(payload.as_slice());
            let proof = ShareProof {
                key_id,
                share_id,
                jurisdiction: params.jurisdiction.clone(),
                residency: params.residency.clone(),
                purpose: params.purpose.clone(),
                backend: cfg.backend.clone(),
                digest,
                signature: signature.to_bytes().to_vec(),
            };
            share_descriptors.push(ShareDescriptor {
                share_id,
                backend: cfg.backend.clone(),
                proof: proof.clone(),
            });
            share_records.push(ShareRecord {
                share_id,
                backend: cfg.backend.clone(),
                data: bytes.clone(),
                proof,
            });
        }

        let metadata = KeyMetadata {
            key_id,
            jurisdiction: params.jurisdiction.clone(),
            residency: params.residency.clone(),
            purpose: params.purpose.clone(),
            threshold: params.threshold,
            public_provenance_key: self.verifying_key_b64(),
            shares: share_descriptors,
        };

        let mut guard = self.inner.keys.write().await;
        guard.insert(
            key_id,
            KeyRecord {
                key_id,
                jurisdiction: params.jurisdiction,
                residency: params.residency,
                purpose: params.purpose,
                threshold: metadata.threshold,
                shares: share_records,
            },
        );

        Ok(metadata)
    }

    fn ensure_alignment(
        record: &KeyRecord,
        jurisdiction: &str,
        residency: &str,
        purpose: &str,
    ) -> Result<(), CrkreError> {
        if record.jurisdiction != jurisdiction {
            return Err(CrkreError::JurisdictionMismatch);
        }
        if record.residency != residency {
            return Err(CrkreError::ResidencyMismatch);
        }
        if record.purpose != purpose {
            return Err(CrkreError::PurposeMismatch);
        }
        Ok(())
    }

    async fn get_key(&self, key_id: &Uuid) -> Result<KeyRecord, CrkreError> {
        let guard = self.inner.keys.read().await;
        guard.get(key_id).cloned().ok_or(CrkreError::KeyNotFound)
    }

    pub async fn encrypt(
        &self,
        key_id: Uuid,
        jurisdiction: String,
        residency: String,
        purpose: String,
        plaintext: Vec<u8>,
    ) -> Result<EncryptionResult, CrkreError> {
        let record = self.get_key(&key_id).await?;
        Self::ensure_alignment(&record, &jurisdiction, &residency, &purpose)?;
        let shares: Vec<Vec<u8>> = record
            .shares
            .iter()
            .take(record.threshold)
            .map(|s| s.data.clone())
            .collect();
        let master = crypto::recover_secret(&shares, record.threshold)?;
        let (nonce, ciphertext) = crypto::encrypt(&master, &plaintext)?;
        Ok(EncryptionResult { nonce, ciphertext })
    }

    fn validate_and_collect_shares(
        record: &KeyRecord,
        provided: &[ProvidedShare],
        verifier: &VerifyingKey,
    ) -> Result<Vec<Vec<u8>>, CrkreError> {
        if provided.len() < record.threshold {
            return Err(CrkreError::InsufficientQuorum);
        }
        let mut collected = Vec::with_capacity(provided.len());
        for share in provided {
            let stored = record
                .shares
                .iter()
                .find(|s| s.share_id == share.share_id)
                .ok_or(CrkreError::ShareUnknown)?;
            let digest = Self::digest_share(&share.share);
            if digest != stored.proof.digest {
                return Err(CrkreError::Signature);
            }
            let payload = Self::provenance_payload(
                &record.key_id,
                &share.share_id,
                &stored.backend,
                &record.jurisdiction,
                &record.residency,
                &record.purpose,
                &digest,
            );
            let signature = Signature::try_from(stored.proof.signature.as_slice())
                .map_err(|_| CrkreError::Signature)?;
            verifier
                .verify(payload.as_slice(), &signature)
                .map_err(|_| CrkreError::Signature)?;
            if stored.data != share.share {
                return Err(CrkreError::Signature);
            }
            collected.push(share.share.clone());
        }
        Ok(collected)
    }

    pub async fn decrypt(&self, params: DecryptionParams) -> Result<DecryptionResult, CrkreError> {
        let record = self.get_key(&params.key_id).await?;
        Self::ensure_alignment(
            &record,
            &params.jurisdiction,
            &params.residency,
            &params.purpose,
        )?;
        let shares =
            Self::validate_and_collect_shares(&record, &params.shares, &self.inner.verifying_key)?;
        let master = crypto::recover_secret(&shares, record.threshold)?;
        let plaintext = crypto::decrypt(&master, &params.nonce, &params.ciphertext)?;
        Ok(DecryptionResult { plaintext })
    }

    pub async fn recover_quorum(
        &self,
        params: QuorumRecoveryRequest,
    ) -> Result<QuorumRecoveryResult, CrkreError> {
        let record = self.get_key(&params.key_id).await?;
        let shares =
            Self::validate_and_collect_shares(&record, &params.shares, &self.inner.verifying_key)?;
        let master = crypto::recover_secret(&shares, record.threshold)?;
        Ok(QuorumRecoveryResult {
            master_secret: master,
        })
    }

    pub async fn create_escrow(
        &self,
        params: CreateEscrowRequest,
    ) -> Result<EscrowDescriptor, CrkreError> {
        let record = self.get_key(&params.key_id).await?;
        for share_id in &params.share_ids {
            if !record.shares.iter().any(|s| &s.share_id == share_id) {
                return Err(CrkreError::ShareUnknown);
            }
        }
        let base = self.inner.time.now();
        let expires_at = base
            .checked_add(Duration::from_secs(params.ttl_seconds))
            .ok_or(CrkreError::InvalidExpiry)?;
        let escrow_id = Uuid::new_v4();
        let descriptor = EscrowDescriptor {
            escrow_id,
            key_id: params.key_id,
            expires_at: DateTime::<Utc>::from(expires_at),
            share_ids: params.share_ids.clone(),
        };
        let mut guard = self.inner.escrows.write().await;
        guard.insert(
            escrow_id,
            EscrowRecord {
                key_id: params.key_id,
                expires_at,
                share_ids: params.share_ids,
            },
        );
        Ok(descriptor)
    }

    pub async fn fetch_escrow(&self, escrow_id: Uuid) -> Result<EscrowMaterial, CrkreError> {
        let record = {
            let guard = self.inner.escrows.read().await;
            guard
                .get(&escrow_id)
                .cloned()
                .ok_or(CrkreError::EscrowNotFound)?
        };
        if record.is_expired(&self.inner.time) {
            return Err(CrkreError::EscrowExpired);
        }
        let key = self.get_key(&record.key_id).await?;
        let mut shares = Vec::new();
        let mut proofs = Vec::new();
        for share_id in &record.share_ids {
            let share = key
                .shares
                .iter()
                .find(|s| &s.share_id == share_id)
                .ok_or(CrkreError::ShareUnknown)?;
            shares.push(ProvidedShare {
                share_id: *share_id,
                share: share.data.clone(),
            });
            proofs.push(share.proof.clone());
        }
        Ok(EscrowMaterial {
            escrow_id,
            key_id: record.key_id,
            expires_at: DateTime::<Utc>::from(record.expires_at),
            shares,
            proofs,
        })
    }

    pub async fn all_provenance(&self, key_id: Uuid) -> Result<Vec<ShareProof>, CrkreError> {
        let record = self.get_key(&key_id).await?;
        Ok(record.shares.iter().map(|s| s.proof.clone()).collect())
    }
}

fn backend_label(kind: &BackendKind) -> &'static str {
    match kind {
        BackendKind::Hsm => "hsm",
        BackendKind::Kms => "kms",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::time::MockTimeProvider;
    use ed25519_dalek::{Signature, VerifyingKey};
    use std::convert::TryInto;
    use std::time::{Duration, SystemTime};

    fn demo_params() -> CreateKeyParams {
        CreateKeyParams {
            jurisdiction: "eu".to_string(),
            residency: "de".to_string(),
            purpose: "payments".to_string(),
            threshold: 2,
            shares: vec![
                ShareBackendConfig {
                    backend: BackendKind::Hsm,
                },
                ShareBackendConfig {
                    backend: BackendKind::Kms,
                },
                ShareBackendConfig {
                    backend: BackendKind::Hsm,
                },
            ],
        }
    }

    #[tokio::test]
    async fn decrypt_requires_quorum_and_alignment() {
        let clock = MockTimeProvider::new(SystemTime::UNIX_EPOCH);
        let service = CrkreService::new(clock.clone());
        let metadata = service.create_key(demo_params()).await.unwrap();

        let plaintext = b"sensitive payload".to_vec();
        let enc = service
            .encrypt(
                metadata.key_id,
                metadata.jurisdiction.clone(),
                metadata.residency.clone(),
                metadata.purpose.clone(),
                plaintext.clone(),
            )
            .await
            .unwrap();

        let share_ids: Vec<Uuid> = metadata.shares.iter().map(|s| s.share_id).collect();
        let escrow = service
            .create_escrow(CreateEscrowRequest {
                key_id: metadata.key_id,
                share_ids: share_ids.clone(),
                ttl_seconds: 30,
            })
            .await
            .unwrap();

        let escrow_material = service.fetch_escrow(escrow.escrow_id).await.unwrap();
        let quorum: Vec<ProvidedShare> = escrow_material
            .shares
            .into_iter()
            .take(metadata.threshold)
            .collect();

        let decrypted = service
            .decrypt(DecryptionParams {
                key_id: metadata.key_id,
                jurisdiction: metadata.jurisdiction.clone(),
                residency: metadata.residency.clone(),
                purpose: metadata.purpose.clone(),
                nonce: enc.nonce.clone(),
                ciphertext: enc.ciphertext.clone(),
                shares: quorum.clone(),
            })
            .await
            .unwrap();
        assert_eq!(decrypted.plaintext, plaintext);

        let err = service
            .decrypt(DecryptionParams {
                key_id: metadata.key_id,
                jurisdiction: "us".to_string(),
                residency: metadata.residency.clone(),
                purpose: metadata.purpose.clone(),
                nonce: enc.nonce.clone(),
                ciphertext: enc.ciphertext.clone(),
                shares: quorum.clone(),
            })
            .await
            .unwrap_err();
        assert!(matches!(err, CrkreError::JurisdictionMismatch));

        let insufficient_err = service
            .decrypt(DecryptionParams {
                key_id: metadata.key_id,
                jurisdiction: metadata.jurisdiction.clone(),
                residency: metadata.residency.clone(),
                purpose: metadata.purpose.clone(),
                nonce: enc.nonce,
                ciphertext: enc.ciphertext,
                shares: quorum.into_iter().take(1).collect(),
            })
            .await
            .unwrap_err();
        assert!(matches!(insufficient_err, CrkreError::InsufficientQuorum));
    }

    #[tokio::test]
    async fn escrow_expiry_enforced() {
        let clock = MockTimeProvider::new(SystemTime::UNIX_EPOCH);
        let service = CrkreService::new(clock.clone());
        let metadata = service.create_key(demo_params()).await.unwrap();
        let share_ids: Vec<Uuid> = metadata.shares.iter().map(|s| s.share_id).collect();

        let escrow = service
            .create_escrow(CreateEscrowRequest {
                key_id: metadata.key_id,
                share_ids,
                ttl_seconds: 10,
            })
            .await
            .unwrap();

        assert!(service.fetch_escrow(escrow.escrow_id).await.is_ok());
        clock.advance(Duration::from_secs(11));
        let err = service.fetch_escrow(escrow.escrow_id).await.unwrap_err();
        assert!(matches!(err, CrkreError::EscrowExpired));
    }

    #[tokio::test]
    async fn provenance_verifies_offline() {
        let clock = MockTimeProvider::new(SystemTime::UNIX_EPOCH);
        let service = CrkreService::new(clock.clone());
        let metadata = service.create_key(demo_params()).await.unwrap();

        let verifying_key_bytes = BASE64
            .decode(metadata.public_provenance_key.as_bytes())
            .unwrap();
        let verifying_key =
            VerifyingKey::from_bytes(&verifying_key_bytes.try_into().unwrap()).unwrap();

        let share = metadata.shares.first().unwrap();
        let digest = &share.proof.digest;
        let payload = CrkreService::<MockTimeProvider>::provenance_payload(
            &metadata.key_id,
            &share.share_id,
            &share.backend,
            &metadata.jurisdiction,
            &metadata.residency,
            &metadata.purpose,
            digest,
        );
        let signature = Signature::try_from(share.proof.signature.as_slice()).unwrap();
        verifying_key
            .verify(payload.as_slice(), &signature)
            .unwrap();
    }
}
