use thiserror::Error;

pub type Result<T> = std::result::Result<T, EfsError>;

#[derive(Debug, Error)]
pub enum EfsError {
    #[error("repository error: {0}")]
    Repository(String),
    #[error("attestation failed: {0}")]
    Attestation(String),
    #[error("policy hash mismatch")]
    PolicyMismatch,
    #[error("replay detected for nonce")]
    ReplayDetected,
    #[error("feature not found")]
    NotFound,
}

impl From<anyhow::Error> for EfsError {
    fn from(err: anyhow::Error) -> Self {
        Self::Repository(err.to_string())
    }
}

impl From<serde_json::Error> for EfsError {
    fn from(err: serde_json::Error) -> Self {
        Self::Repository(err.to_string())
    }
}
