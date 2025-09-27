use aes_gcm::aead::{Aead, KeyInit, OsRng};
use aes_gcm::{Aes256Gcm, Nonce};
use hkdf::Hkdf;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use serde_with::{base64::Base64, serde_as};
use sha2::Sha256;

use crate::error::{EfsError, Result};

#[serde_as]
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SealedFeatureBlob {
    #[serde_as(as = "Base64")]
    pub nonce: Vec<u8>,
    #[serde_as(as = "Base64")]
    pub ciphertext: Vec<u8>,
}

impl SealedFeatureBlob {
    pub fn measurement_bytes(&self) -> Vec<u8> {
        [self.nonce.as_slice(), self.ciphertext.as_slice()].concat()
    }
}

#[derive(Debug, Clone)]
pub struct SealingKeyProvider {
    master_key: [u8; 32],
}

impl SealingKeyProvider {
    pub fn new(master_key: [u8; 32]) -> Self {
        Self { master_key }
    }

    fn tenant_key(&self, tenant_id: &str) -> [u8; 32] {
        let hk = Hkdf::<Sha256>::new(Some(&self.master_key), tenant_id.as_bytes());
        let mut okm = [0u8; 32];
        hk.expand(&[], &mut okm).expect("hkdf expand");
        okm
    }

    pub fn seal(&self, tenant_id: &str, plaintext: &[u8]) -> Result<SealedFeatureBlob> {
        let key_bytes = self.tenant_key(tenant_id);
        let cipher = Aes256Gcm::new_from_slice(&key_bytes)
            .map_err(|e| EfsError::Attestation(e.to_string()))?;
        let mut nonce_bytes = [0u8; 12];
        OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);
        let ciphertext = cipher
            .encrypt(nonce, plaintext)
            .map_err(|e| EfsError::Attestation(format!("encryption failed: {e}")))?;
        Ok(SealedFeatureBlob {
            nonce: nonce_bytes.to_vec(),
            ciphertext,
        })
    }

    pub fn open(&self, tenant_id: &str, blob: &SealedFeatureBlob) -> Result<Vec<u8>> {
        let key_bytes = self.tenant_key(tenant_id);
        let cipher = Aes256Gcm::new_from_slice(&key_bytes)
            .map_err(|e| EfsError::Attestation(e.to_string()))?;
        let nonce = Nonce::from_slice(&blob.nonce);
        let plaintext = cipher
            .decrypt(nonce, blob.ciphertext.as_ref())
            .map_err(|e| EfsError::Attestation(format!("decryption failed: {e}")))?;
        Ok(plaintext)
    }
}
