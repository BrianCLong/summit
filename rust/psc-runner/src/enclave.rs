use std::collections::HashMap;

use crate::attestation::{AttestationProof, AttestationTranscript};
use crate::functional_encryption::{FunctionalEncryptionEngine, InputCiphertext};
use crate::policy::{CompiledPolicy, ToyAnalytic};
use crate::sealing::{seal_result, SealedOutput};

#[derive(Debug, thiserror::Error)]
pub enum EnclaveError {
    #[error("disallowed field encountered: {0}")]
    DisallowedField(String),
    #[error("no fields provided for analytic")]
    EmptyDataset,
    #[error(transparent)]
    FunctionalEncryption(#[from] crate::functional_encryption::FunctionalEncryptionError),
}

#[derive(Debug, Clone)]
pub struct ExecutionReceipt {
    pub sealed_output: SealedOutput,
    pub proof: AttestationProof,
    pub clear_result: f64,
}

pub struct EnclaveShim;

impl EnclaveShim {
    pub fn execute(
        policy: &CompiledPolicy,
        ciphertext: &InputCiphertext,
    ) -> Result<ExecutionReceipt, EnclaveError> {
        if !policy.bind_input(ciphertext.binding()) {
            return Err(
                crate::functional_encryption::FunctionalEncryptionError::PolicyMismatch.into(),
            );
        }

        let decrypted = FunctionalEncryptionEngine::decrypt(policy, ciphertext)?;
        if decrypted.is_empty() {
            return Err(EnclaveError::EmptyDataset);
        }

        let mut values: HashMap<String, f64> = HashMap::new();
        for field in decrypted.iter() {
            if !policy.allowed_fields.contains(&field.name) {
                return Err(EnclaveError::DisallowedField(field.name.clone()));
            }
            values.insert(field.name.clone(), field.value);
        }

        let clear_result = match policy.analytic {
            ToyAnalytic::Sum => values.values().sum(),
            ToyAnalytic::Mean => values.values().sum::<f64>() / values.len() as f64,
        };

        let (sealed_output, _key) = seal_result(clear_result, policy);
        let transcript = AttestationTranscript::from_artifacts(
            policy.attestation_domain(),
            ciphertext.binding(),
            &sealed_output,
        );
        let proof = AttestationProof::prove(&transcript);

        Ok(ExecutionReceipt {
            sealed_output,
            proof,
            clear_result,
        })
    }
}
