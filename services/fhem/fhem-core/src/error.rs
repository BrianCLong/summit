use thiserror::Error;

#[derive(Debug, Error)]
pub enum FhemError {
    #[error("encryption failed: {0}")]
    Encryption(String),
    #[error("decryption failed: {0}")]
    Decryption(String),
    #[error("serialization failed: {0}")]
    Serialization(#[from] bincode::Error),
    #[error("base64 decode failed: {0}")]
    Base64Decode(#[from] base64::DecodeError),
    #[error("tfhe error: {0}")]
    Tfhe(#[from] tfhe::Error),
}

impl FhemError {
    pub fn encryption<E: std::fmt::Display>(err: E) -> Self {
        Self::Encryption(err.to_string())
    }

    pub fn decryption<E: std::fmt::Display>(err: E) -> Self {
        Self::Decryption(err.to_string())
    }
}
