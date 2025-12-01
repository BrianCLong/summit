use std::collections::HashMap;

use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use base64::Engine;
use parking_lot::RwLock;
use rand::{rngs::OsRng, RngCore};
use serde::{Deserialize, Serialize};

use crate::error::ProxyError;

const DATA_KEY_SIZE: usize = 32;
const AEAD_NONCE_SIZE: usize = 12;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Envelope {
    pub backend: String,
    pub key_id: String,
    pub ciphertext: String,
    pub nonce: String,
    pub encrypted_data_key: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub associated_data: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct EnvelopeRequest {
    pub backend: String,
    pub key_id: String,
    pub plaintext: String,
    #[serde(default)]
    pub associated_data: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvelopeDecryptRequest {
    pub backend: String,
    pub key_id: String,
    pub ciphertext: String,
    pub nonce: String,
    pub encrypted_data_key: String,
    #[serde(default)]
    pub associated_data: Option<String>,
}

#[derive(Debug, Clone)]
struct MasterKey {
    bytes: [u8; DATA_KEY_SIZE],
}

impl MasterKey {
    fn new() -> Self {
        let mut bytes = [0u8; DATA_KEY_SIZE];
        rand::thread_rng().fill_bytes(&mut bytes);
        Self { bytes }
    }
}

pub trait KmsBackend: Send + Sync + 'static {
    fn name(&self) -> &str;
    fn encrypt_key(
        &self,
        key_id: &str,
        plaintext: &[u8],
        aad: &[u8],
    ) -> Result<Vec<u8>, ProxyError>;
    fn decrypt_key(
        &self,
        key_id: &str,
        ciphertext: &[u8],
        aad: &[u8],
    ) -> Result<Vec<u8>, ProxyError>;
}

#[derive(Debug)]
pub struct InMemoryKms {
    provider: String,
    master_keys: RwLock<HashMap<String, MasterKey>>,
}

impl InMemoryKms {
    pub fn new(provider: impl Into<String>) -> Self {
        Self {
            provider: provider.into(),
            master_keys: RwLock::new(HashMap::new()),
        }
    }

    fn get_or_create_key(&self, key_id: &str) -> MasterKey {
        let mut guard = self.master_keys.write();
        guard
            .entry(key_id.to_string())
            .or_insert_with(MasterKey::new)
            .clone()
    }
}

impl KmsBackend for InMemoryKms {
    fn name(&self) -> &str {
        &self.provider
    }

    fn encrypt_key(
        &self,
        key_id: &str,
        plaintext: &[u8],
        aad: &[u8],
    ) -> Result<Vec<u8>, ProxyError> {
        let master = self.get_or_create_key(key_id);
        let cipher = Aes256Gcm::new_from_slice(&master.bytes)
            .map_err(|err| ProxyError::Kms(format!("{key_id}: {err}")))?;
        let mut nonce_bytes = [0u8; AEAD_NONCE_SIZE];
        let mut os_rng = OsRng;
        os_rng.fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);
        let mut combined = nonce_bytes.to_vec();
        combined.extend(
            cipher
                .encrypt(
                    nonce,
                    aes_gcm::aead::Payload {
                        msg: plaintext,
                        aad,
                    },
                )
                .map_err(|err| ProxyError::Kms(format!("encrypt data key failed: {err}")))?,
        );
        Ok(combined)
    }

    fn decrypt_key(
        &self,
        key_id: &str,
        ciphertext: &[u8],
        aad: &[u8],
    ) -> Result<Vec<u8>, ProxyError> {
        if ciphertext.len() < AEAD_NONCE_SIZE {
            return Err(ProxyError::Kms("ciphertext too short".into()));
        }
        let (nonce_bytes, ct) = ciphertext.split_at(AEAD_NONCE_SIZE);
        let master = self.get_or_create_key(key_id);
        let cipher = Aes256Gcm::new_from_slice(&master.bytes)
            .map_err(|err| ProxyError::Kms(format!("{key_id}: {err}")))?;
        cipher
            .decrypt(
                Nonce::from_slice(nonce_bytes),
                aes_gcm::aead::Payload { msg: ct, aad },
            )
            .map_err(|err| ProxyError::Kms(format!("decrypt data key failed: {err}")))
    }
}

#[derive(Clone)]
pub struct KmsRegistry {
    backends: HashMap<String, std::sync::Arc<dyn KmsBackend>>,
}

impl KmsRegistry {
    pub fn new(backends: Vec<std::sync::Arc<dyn KmsBackend>>) -> Self {
        let map = backends
            .into_iter()
            .map(|backend| (backend.name().to_string(), backend))
            .collect();
        Self { backends: map }
    }

    pub fn encrypt(&self, req: &EnvelopeRequest) -> Result<Envelope, ProxyError> {
        let backend = self
            .backends
            .get(&req.backend)
            .ok_or_else(|| ProxyError::Kms(format!("unknown backend {}", req.backend)))?;

        let plaintext = req.plaintext.as_bytes();
        let aad_bytes = req
            .associated_data
            .as_ref()
            .map(|a| a.as_bytes().to_vec())
            .unwrap_or_default();

        let mut dek = [0u8; DATA_KEY_SIZE];
        rand::thread_rng().fill_bytes(&mut dek);
        let mut nonce_bytes = [0u8; AEAD_NONCE_SIZE];
        rand::thread_rng().fill_bytes(&mut nonce_bytes);
        let cipher = Aes256Gcm::new_from_slice(&dek)
            .map_err(|err| ProxyError::Envelope(format!("cipher init failed: {err}")))?;

        let ciphertext = cipher
            .encrypt(
                Nonce::from_slice(&nonce_bytes),
                aes_gcm::aead::Payload {
                    msg: plaintext,
                    aad: &aad_bytes,
                },
            )
            .map_err(|err| ProxyError::Envelope(format!("encrypt payload failed: {err}")))?;

        let encrypted_key = backend.encrypt_key(&req.key_id, &dek, &aad_bytes)?;

        Ok(Envelope {
            backend: req.backend.clone(),
            key_id: req.key_id.clone(),
            ciphertext: base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(ciphertext),
            nonce: base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(nonce_bytes),
            encrypted_data_key: base64::engine::general_purpose::URL_SAFE_NO_PAD
                .encode(encrypted_key),
            associated_data: req.associated_data.clone(),
        })
    }

    pub fn decrypt(&self, req: &EnvelopeDecryptRequest) -> Result<Vec<u8>, ProxyError> {
        let backend = self
            .backends
            .get(&req.backend)
            .ok_or_else(|| ProxyError::Kms(format!("unknown backend {}", req.backend)))?;

        let aad_bytes = req
            .associated_data
            .as_ref()
            .map(|a| a.as_bytes().to_vec())
            .unwrap_or_default();

        let dek = backend.decrypt_key(
            &req.key_id,
            &base64::engine::general_purpose::URL_SAFE_NO_PAD
                .decode(&req.encrypted_data_key)
                .map_err(|err| {
                    ProxyError::Envelope(format!("decode encrypted key failed: {err}"))
                })?,
            &aad_bytes,
        )?;

        let cipher = Aes256Gcm::new_from_slice(&dek)
            .map_err(|err| ProxyError::Envelope(format!("cipher init failed: {err}")))?;
        let nonce = base64::engine::general_purpose::URL_SAFE_NO_PAD
            .decode(&req.nonce)
            .map_err(|err| ProxyError::Envelope(format!("decode nonce failed: {err}")))?;
        let ciphertext = base64::engine::general_purpose::URL_SAFE_NO_PAD
            .decode(&req.ciphertext)
            .map_err(|err| ProxyError::Envelope(format!("decode ciphertext failed: {err}")))?;

        cipher
            .decrypt(
                Nonce::from_slice(&nonce),
                aes_gcm::aead::Payload {
                    msg: &ciphertext,
                    aad: &aad_bytes,
                },
            )
            .map_err(|err| ProxyError::Envelope(format!("decrypt payload failed: {err}")))
    }
}

impl Default for KmsRegistry {
    fn default() -> Self {
        let providers: Vec<std::sync::Arc<dyn KmsBackend>> = vec![
            std::sync::Arc::new(InMemoryKms::new("aws")),
            std::sync::Arc::new(InMemoryKms::new("gcp")),
            std::sync::Arc::new(InMemoryKms::new("azure")),
        ];
        Self::new(providers)
    }
}
