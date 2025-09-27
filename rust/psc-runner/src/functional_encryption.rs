use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;

use crate::policy::CompiledPolicy;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldValue {
    pub name: String,
    pub value: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InputBinding {
    pub policy_signature: String,
    pub input_commitment: String,
    pub nonce: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InputCiphertext {
    binding: InputBinding,
    fields: Vec<FieldValue>,
}

impl InputCiphertext {
    pub fn binding(&self) -> &InputBinding {
        &self.binding
    }

    pub fn fields(&self) -> &[FieldValue] {
        &self.fields
    }
}

#[derive(Debug, thiserror::Error)]
pub enum FunctionalEncryptionError {
    #[error("policy signature mismatch")]
    PolicyMismatch,
    #[error("ciphertext integrity mismatch")]
    IntegrityViolation,
}

pub struct FunctionalEncryptionEngine;

impl FunctionalEncryptionEngine {
    pub fn bind_inputs(policy: &CompiledPolicy, inputs: &HashMap<String, f64>) -> InputCiphertext {
        let mut fields: Vec<FieldValue> = inputs
            .iter()
            .map(|(name, value)| FieldValue {
                name: name.clone(),
                value: *value,
            })
            .collect();
        fields.sort_by(|a, b| a.name.cmp(&b.name));

        let mut hasher = Sha256::new();
        for field in fields.iter() {
            hasher.update(field.name.as_bytes());
            hasher.update(b"=");
            hasher.update(field.value.to_le_bytes());
        }

        let mut nonce_bytes = [0u8; 16];
        rand::thread_rng().fill_bytes(&mut nonce_bytes);
        hasher.update(&nonce_bytes);

        let input_commitment = hex::encode(hasher.finalize());
        let nonce = STANDARD.encode(nonce_bytes);

        let binding = InputBinding {
            policy_signature: policy.signature.clone(),
            input_commitment,
            nonce,
        };

        InputCiphertext { binding, fields }
    }

    pub fn decrypt(
        policy: &CompiledPolicy,
        ciphertext: &InputCiphertext,
    ) -> Result<Vec<FieldValue>, FunctionalEncryptionError> {
        if ciphertext.binding.policy_signature != policy.signature {
            return Err(FunctionalEncryptionError::PolicyMismatch);
        }

        let mut hasher = Sha256::new();
        for field in ciphertext.fields.iter() {
            hasher.update(field.name.as_bytes());
            hasher.update(b"=");
            hasher.update(field.value.to_le_bytes());
        }
        let nonce = STANDARD
            .decode(&ciphertext.binding.nonce)
            .map_err(|_| FunctionalEncryptionError::IntegrityViolation)?;
        hasher.update(&nonce);
        let expected = hex::encode(hasher.finalize());
        if expected != ciphertext.binding.input_commitment {
            return Err(FunctionalEncryptionError::IntegrityViolation);
        }

        Ok(ciphertext.fields.clone())
    }
}
