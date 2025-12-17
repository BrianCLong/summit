use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::policy::CompiledPolicy;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SealedOutput {
    pub policy_id: String,
    pub nonce: String,
    pub commitment: String,
    pub encrypted_result: String,
}

#[derive(Debug, thiserror::Error)]
pub enum SealingError {
    #[error("commitment mismatch")]
    CommitmentMismatch,
    #[error("invalid ciphertext")]
    InvalidCiphertext,
}

pub fn seal_result(result: f64, policy: &CompiledPolicy) -> (SealedOutput, [u8; 8]) {
    let mut nonce_bytes = [0u8; 16];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let nonce = STANDARD.encode(nonce_bytes);

    let mut key_hasher = Sha256::new();
    key_hasher.update(policy.signature.as_bytes());
    key_hasher.update(&nonce_bytes);
    let key_material = key_hasher.finalize();
    let mut key = [0u8; 8];
    key.copy_from_slice(&key_material[..8]);

    let mut value_bytes = result.to_le_bytes();
    for (i, b) in value_bytes.iter_mut().enumerate() {
        *b ^= key[i % key.len()];
    }
    let encrypted_result = STANDARD.encode(value_bytes);

    let mut commitment_hasher = Sha256::new();
    commitment_hasher.update(result.to_le_bytes());
    commitment_hasher.update(&key);
    let commitment = hex::encode(commitment_hasher.finalize());

    (
        SealedOutput {
            policy_id: policy.policy_id.clone(),
            nonce,
            commitment,
            encrypted_result,
        },
        key,
    )
}

pub fn unseal_result(sealed: &SealedOutput, policy: &CompiledPolicy) -> Result<f64, SealingError> {
    let nonce_bytes = STANDARD
        .decode(&sealed.nonce)
        .map_err(|_| SealingError::InvalidCiphertext)?;

    let mut key_hasher = Sha256::new();
    key_hasher.update(policy.signature.as_bytes());
    key_hasher.update(&nonce_bytes);
    let key_material = key_hasher.finalize();
    let mut key = [0u8; 8];
    key.copy_from_slice(&key_material[..8]);

    let mut encrypted_bytes = STANDARD
        .decode(&sealed.encrypted_result)
        .map_err(|_| SealingError::InvalidCiphertext)?;
    if encrypted_bytes.len() != 8 {
        return Err(SealingError::InvalidCiphertext);
    }

    for (i, b) in encrypted_bytes.iter_mut().enumerate() {
        *b ^= key[i % key.len()];
    }

    let result = f64::from_le_bytes(encrypted_bytes.try_into().expect("length checked"));

    let mut commitment_hasher = Sha256::new();
    commitment_hasher.update(result.to_le_bytes());
    commitment_hasher.update(&key);
    let expected = hex::encode(commitment_hasher.finalize());
    if expected != sealed.commitment {
        return Err(SealingError::CommitmentMismatch);
    }

    Ok(result)
}
