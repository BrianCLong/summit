use std::convert::TryInto;
use std::env;

use base64::Engine;
use chrono::Duration;
use ed25519_dalek::{SignatureError, SigningKey, VerifyingKey};
use rand::rngs::OsRng;
use thiserror::Error;

#[derive(Debug, Clone)]
pub struct ServiceConfig {
    pub bind_address: String,
    pub signing_key: SigningKey,
    pub verifying_key: VerifyingKey,
    pub default_ttl: Duration,
    pub max_ttl: Duration,
}

#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("invalid signing key: {0}")]
    InvalidSigningKey(SignatureError),
    #[error("failed to decode signing key: {0}")]
    DecodeSigningKey(#[from] base64::DecodeError),
    #[error("signing key must decode to 32 bytes")]
    InvalidSigningKeyLength,
}

impl ServiceConfig {
    pub fn from_env() -> Result<Self, ConfigError> {
        let bind_address =
            env::var("TATS_BIND_ADDRESS").unwrap_or_else(|_| "0.0.0.0:8080".to_string());
        let default_ttl_secs = env::var("TATS_DEFAULT_TTL_SECONDS")
            .ok()
            .and_then(|v| v.parse::<i64>().ok())
            .filter(|&v| v > 0)
            .unwrap_or(3600);
        let max_ttl_secs = env::var("TATS_MAX_TTL_SECONDS")
            .ok()
            .and_then(|v| v.parse::<i64>().ok())
            .filter(|&v| v > 0)
            .unwrap_or(86_400);

        let signing_key = match env::var("TATS_SIGNING_KEY") {
            Ok(value) => {
                let bytes = base64::engine::general_purpose::STANDARD.decode(value)?;
                let secret: [u8; 32] = bytes
                    .try_into()
                    .map_err(|_| ConfigError::InvalidSigningKeyLength)?;
                SigningKey::from_bytes(&secret)
            }
            Err(_) => SigningKey::generate(&mut OsRng),
        };
        let verifying_key = signing_key.verifying_key();

        Ok(Self {
            bind_address,
            signing_key,
            verifying_key,
            default_ttl: Duration::seconds(default_ttl_secs),
            max_ttl: Duration::seconds(max_ttl_secs),
        })
    }
}
