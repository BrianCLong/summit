use crate::attestation::{AttestationProof, AttestationTranscript};
use crate::policy::CompiledPolicy;
use crate::sealing::{unseal_result, SealedOutput, SealingError};

#[derive(Debug, thiserror::Error)]
pub enum AuditorError {
    #[error("sealed output does not match attestation")]
    SealedOutputMismatch,
    #[error("attestation proof invalid")]
    InvalidProof,
    #[error("sealed output could not be opened: {0}")]
    SealingFailure(#[from] SealingError),
}

pub struct Auditor;

impl Auditor {
    pub fn verify(
        policy: &CompiledPolicy,
        sealed_output: &SealedOutput,
        proof: &AttestationProof,
    ) -> Result<(), AuditorError> {
        if proof.output_commitment != sealed_output.commitment {
            return Err(AuditorError::SealedOutputMismatch);
        }

        let transcript = AttestationTranscript {
            domain: policy.attestation_domain(),
            input_commitment: proof.input_commitment.clone(),
            output_commitment: sealed_output.commitment.clone(),
        };

        if proof.verify(&transcript) {
            Ok(())
        } else {
            Err(AuditorError::InvalidProof)
        }
    }

    pub fn verify_and_unseal(
        policy: &CompiledPolicy,
        sealed_output: &SealedOutput,
        proof: &AttestationProof,
    ) -> Result<f64, AuditorError> {
        Self::verify(policy, sealed_output, proof)?;
        Ok(unseal_result(sealed_output, policy)?)
    }
}
