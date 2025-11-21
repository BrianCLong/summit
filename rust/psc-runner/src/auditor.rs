use crate::attestation::{AttestationProof, AttestationTranscript};
use crate::policy::CompiledPolicy;
use crate::sealing::SealedOutput;

#[derive(Debug, thiserror::Error)]
pub enum AuditorError {
    #[error("sealed output does not match attestation")]
    SealedOutputMismatch,
    #[error("attestation proof invalid")]
    InvalidProof,
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
}
