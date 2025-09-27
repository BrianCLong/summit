use std::collections::HashSet;

use blake3::Hasher;
use thiserror::Error;

use crate::model::{OverlapProof, TenantCommitment};

const MAX_COMMITMENTS_PER_TENANT: usize = 4096;

#[derive(Debug, Error)]
pub enum CircuitError {
    #[error("too many commitments provided: {provided} > {max}")]
    TooManyCommitments { provided: usize, max: usize },
    #[error("circuit hint does not match active implementation: expected {expected}, received {received:?}")]
    CircuitHintMismatch {
        expected: &'static str,
        received: Option<String>,
    },
}

pub trait OverlapCircuit: Send + Sync {
    fn name(&self) -> &'static str;

    fn prove_overlap(
        &self,
        tenant_a: &TenantCommitment,
        tenant_b: &TenantCommitment,
    ) -> Result<OverlapProof, CircuitError>;

    fn validate_hint(&self, hint: &Option<String>) -> Result<(), CircuitError> {
        if let Some(h) = hint {
            if h != self.name() {
                return Err(CircuitError::CircuitHintMismatch {
                    expected: self.name(),
                    received: hint.clone(),
                });
            }
        }
        Ok(())
    }
}

#[derive(Debug, Default)]
pub struct PedersenMiMCCircuit;

impl PedersenMiMCCircuit {
    pub fn new() -> Self {
        Self
    }
}

impl OverlapCircuit for PedersenMiMCCircuit {
    fn name(&self) -> &'static str {
        "pedersen-mimc-stub"
    }

    fn prove_overlap(
        &self,
        tenant_a: &TenantCommitment,
        tenant_b: &TenantCommitment,
    ) -> Result<OverlapProof, CircuitError> {
        if tenant_a.len() > MAX_COMMITMENTS_PER_TENANT {
            return Err(CircuitError::TooManyCommitments {
                provided: tenant_a.len(),
                max: MAX_COMMITMENTS_PER_TENANT,
            });
        }
        if tenant_b.len() > MAX_COMMITMENTS_PER_TENANT {
            return Err(CircuitError::TooManyCommitments {
                provided: tenant_b.len(),
                max: MAX_COMMITMENTS_PER_TENANT,
            });
        }

        let commitments_a: HashSet<&String> = tenant_a.commitments.iter().collect();
        let intersection_count = tenant_b
            .commitments
            .iter()
            .filter(|c| commitments_a.contains(c))
            .count();
        let overlap = intersection_count > 0;

        let mut hasher = Hasher::new();
        hasher.update(b"zk-tx-overlap-proof");
        hasher.update(self.name().as_bytes());
        hasher.update(&[overlap as u8]);
        hasher.update(&(tenant_a.len() as u64).to_be_bytes());
        hasher.update(&(tenant_b.len() as u64).to_be_bytes());
        hasher.update(&(intersection_count as u64).to_be_bytes());
        let proof = hasher.finalize().as_bytes().to_vec();

        Ok(OverlapProof { overlap, proof })
    }
}
