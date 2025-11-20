use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize)]
pub struct TenantCommitment {
    /// Salted selector commitments represented as opaque strings.
    pub commitments: Vec<String>,
}

impl TenantCommitment {
    pub fn len(&self) -> usize {
        self.commitments.len()
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct OverlapProofRequest {
    pub tenant_a: TenantCommitment,
    pub tenant_b: TenantCommitment,
    /// Optional hint to select a specific proving circuit implementation.
    #[serde(default)]
    pub circuit_hint: Option<String>,
    /// Enable red-team mode to simulate inference attempts. Disabled by default.
    #[serde(default)]
    pub red_team: bool,
}

#[derive(Debug, Clone)]
pub struct OverlapProof {
    pub overlap: bool,
    pub proof: Vec<u8>,
}

impl OverlapProof {
    pub fn size(&self) -> usize {
        self.proof.len()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RedTeamReport {
    pub success: bool,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct OverlapProofResponse {
    pub overlap: bool,
    pub proof: String,
    pub circuit: String,
    pub proof_size: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub red_team_report: Option<RedTeamReport>,
}
