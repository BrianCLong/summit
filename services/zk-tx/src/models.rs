use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Serialize, Deserialize, Eq, PartialEq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum SelectorKind {
    Email,
    Phone,
    Iban,
}

#[derive(Clone, Debug, Serialize, Deserialize, Default)]
pub struct SelectorSet {
    pub emails: Vec<String>,
    pub phones: Vec<String>,
    pub ibans: Vec<String>,
}

impl SelectorSet {
    pub fn count(&self) -> usize {
        self.emails.len() + self.phones.len() + self.ibans.len()
    }

    pub fn iter(&self) -> impl Iterator<Item = (SelectorKind, &str)> {
        let email_iter = self.emails.iter().map(|v| (SelectorKind::Email, v.as_str()));
        let phone_iter = self.phones.iter().map(|v| (SelectorKind::Phone, v.as_str()));
        let iban_iter = self.ibans.iter().map(|v| (SelectorKind::Iban, v.as_str()));

        email_iter.chain(phone_iter).chain(iban_iter)
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TenantSubmission {
    pub tenant_id: String,
    pub salt: String,
    #[serde(default)]
    pub scope: Vec<String>,
    pub selectors: SelectorSet,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct HashedSelector {
    pub kind: SelectorKind,
    pub digest: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TenantCommitment {
    pub tenant_id: String,
    pub scope: Vec<String>,
    /// Hash of the ordered hashed selectors; used to verify transcript integrity without raw values.
    pub set_commitment: String,
    pub hashed_selectors: Vec<HashedSelector>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ProofType {
    Overlap,
    NonOverlap,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TranscriptEntry {
    pub step: String,
    pub detail: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ProofTranscript {
    pub entries: Vec<TranscriptEntry>,
    pub leakage: u8,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ProofEnvelope {
    pub proof_type: ProofType,
    pub circuit: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub overlap: bool,
    pub commitments: Vec<TenantCommitment>,
    pub overlap_commitment: String,
    pub transcript: ProofTranscript,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OverlapProofRequest {
    pub tenant_a: TenantSubmission,
    pub tenant_b: TenantSubmission,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProofResponse {
    pub overlap: bool,
    pub proof: String,
    pub circuit: String,
    pub transcript: ProofTranscript,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VerifyRequest {
    pub proof: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VerifyResponse {
    pub valid: bool,
    pub overlap: bool,
    pub leakage: u8,
}
