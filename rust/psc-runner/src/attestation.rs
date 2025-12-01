use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::functional_encryption::InputBinding;
use crate::policy::ToyAnalytic;
use crate::sealing::SealedOutput;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AttestationDomain {
    pub policy_digest: String,
    pub analytic: ToyAnalytic,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttestationTranscript {
    pub domain: AttestationDomain,
    pub input_commitment: String,
    pub output_commitment: String,
}

impl AttestationTranscript {
    pub fn from_artifacts(
        domain: AttestationDomain,
        input_binding: &InputBinding,
        sealed_output: &SealedOutput,
    ) -> Self {
        Self {
            domain,
            input_commitment: input_binding.input_commitment.clone(),
            output_commitment: sealed_output.commitment.clone(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AttestationProof {
    pub domain: AttestationDomain,
    pub input_commitment: String,
    pub output_commitment: String,
    pub commitment_hash: String,
}

impl AttestationProof {
    pub fn prove(transcript: &AttestationTranscript) -> Self {
        let mut hasher = Sha256::new();
        hasher.update(transcript.domain.policy_digest.as_bytes());
        hasher.update(b"|");
        hasher.update(transcript.domain.analytic.to_string().as_bytes());
        hasher.update(b"|");
        hasher.update(transcript.input_commitment.as_bytes());
        hasher.update(b"|");
        hasher.update(transcript.output_commitment.as_bytes());
        let commitment_hash = hex::encode(hasher.finalize());
        Self {
            domain: transcript.domain.clone(),
            input_commitment: transcript.input_commitment.clone(),
            output_commitment: transcript.output_commitment.clone(),
            commitment_hash,
        }
    }

    pub fn verify(&self, transcript: &AttestationTranscript) -> bool {
        let expected = AttestationProof::prove(transcript);
        expected == *self
    }
}
