use crate::models::{GrantPayload, SignedGrant};
use base64::Engine;
use base64::engine::general_purpose::STANDARD;
use ed25519_dalek::{PublicKey, Signature, Verifier};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum CryptoError {
    #[error("failed to decode base64: {0}")]
    InvalidBase64(#[from] base64::DecodeError),
    #[error("invalid public key: {0}")]
    InvalidPublicKey(String),
    #[error("invalid signature: {0}")]
    InvalidSignature(String),
    #[error("signature verification failed")]
    VerificationFailed,
    #[error("serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
}

pub fn parse_public_key(encoded: &str) -> Result<PublicKey, CryptoError> {
    let bytes = STANDARD.decode(encoded)?;
    PublicKey::from_bytes(&bytes).map_err(|err| CryptoError::InvalidPublicKey(err.to_string()))
}

pub fn parse_signature(bytes: &[u8]) -> Result<Signature, CryptoError> {
    Signature::from_bytes(bytes).map_err(|err| CryptoError::InvalidSignature(err.to_string()))
}

pub fn grant_message_bytes(payload: &GrantPayload) -> Result<Vec<u8>, CryptoError> {
    Ok(serde_json::to_vec(payload)?)
}

pub fn verify_signed_grant(grant: &SignedGrant, key: &PublicKey) -> Result<(), CryptoError> {
    let message = grant_message_bytes(&grant.payload)?;
    let signature = parse_signature(&grant.signature)?;
    key.verify(&message, &signature)
        .map_err(|_| CryptoError::VerificationFailed)
}

pub fn encode_public_key(key: &PublicKey) -> String {
    STANDARD.encode(key.as_bytes())
}
