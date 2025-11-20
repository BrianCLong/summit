use std::collections::BTreeMap;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use ed25519_dalek::VerifyingKey;
use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::replay::ReplayCache;
use crate::token::{self, TokenClaims};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct VerificationOptions {
    pub expected_audience: Option<String>,
    #[serde(default)]
    pub required_datasets: Vec<String>,
    #[serde(default)]
    pub required_row_scopes: BTreeMap<String, Vec<String>>,
    #[serde(default)]
    pub required_purposes: Vec<String>,
}

#[derive(Debug, Error, PartialEq, Eq)]
pub enum VerificationError {
    #[error("token signature invalid")]
    InvalidSignature,
    #[error("token expired")]
    Expired,
    #[error("audience mismatch")]
    AudienceMismatch,
    #[error("dataset requirements not satisfied")]
    DatasetMismatch,
    #[error("row scope requirements not satisfied")]
    RowScopeMismatch,
    #[error("purpose requirements not satisfied")]
    PurposeMismatch,
    #[error("token replay detected")]
    Replay,
    #[error("token parse error")]
    Parse,
}

pub struct TokenVerifier<R: ReplayCache> {
    verifying_key: VerifyingKey,
    replay_cache: R,
}

impl<R: ReplayCache> TokenVerifier<R> {
    pub fn new(verifying_key: VerifyingKey, replay_cache: R) -> Self {
        Self {
            verifying_key,
            replay_cache,
        }
    }

    pub fn verify(
        &self,
        token: &str,
        options: VerificationOptions,
    ) -> Result<TokenClaims, VerificationError> {
        let (_, claims) = match token::verify_token(token, &self.verifying_key) {
            Ok(parts) => parts,
            Err(token::TokenError::InvalidSignature) => {
                return Err(VerificationError::InvalidSignature);
            }
            Err(token::TokenError::InvalidFormat) | Err(token::TokenError::Payload(_)) => {
                return Err(VerificationError::Parse);
            }
        };
        let now = current_timestamp();
        if claims.expires_at <= now {
            return Err(VerificationError::Expired);
        }
        if let Some(expected) = options.expected_audience {
            if claims.audience != expected {
                return Err(VerificationError::AudienceMismatch);
            }
        }
        if !options
            .required_datasets
            .iter()
            .all(|id| claims.dataset_ids.contains(id))
        {
            return Err(VerificationError::DatasetMismatch);
        }
        for (dataset, rows) in options.required_row_scopes.iter() {
            match claims.row_scopes.get(dataset) {
                Some(allowed_rows) => {
                    if !rows.iter().all(|row| allowed_rows.contains(row)) {
                        return Err(VerificationError::RowScopeMismatch);
                    }
                }
                None => {
                    if !claims.dataset_ids.contains(dataset) {
                        return Err(VerificationError::RowScopeMismatch);
                    }
                }
            }
        }
        if !options
            .required_purposes
            .iter()
            .all(|purpose| claims.purposes.contains(purpose))
        {
            return Err(VerificationError::PurposeMismatch);
        }
        if !self
            .replay_cache
            .check_and_store(&claims.jti, claims.expires_at)
        {
            return Err(VerificationError::Replay);
        }
        Ok(claims)
    }
}

fn current_timestamp() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or(Duration::ZERO)
        .as_secs() as i64
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::replay::MemoryReplayCache;
    use crate::token::{encode_token, TokenClaims};
    use ed25519_dalek::SigningKey;
    use std::collections::BTreeMap;

    fn signing_key() -> SigningKey {
        SigningKey::from_bytes(&[3u8; 32])
    }

    fn sample_claims() -> TokenClaims {
        TokenClaims::new(
            vec!["dataset-a".into()],
            BTreeMap::new(),
            vec!["analytics".into()],
            "aud".into(),
            1_700_000_000,
            1_800_000_000,
            None,
            "nonce".into(),
        )
    }

    #[test]
    fn verifies_and_tracks_replay() {
        let signing = signing_key();
        let verifying = signing.verifying_key();
        let claims = sample_claims();
        let token = encode_token(&claims, &signing).unwrap();
        let verifier = TokenVerifier::new(verifying, MemoryReplayCache::new());
        let options = VerificationOptions {
            expected_audience: Some("aud".into()),
            required_datasets: vec!["dataset-a".into()],
            required_row_scopes: BTreeMap::new(),
            required_purposes: vec!["analytics".into()],
        };
        let validated = verifier.verify(&token, options.clone()).unwrap();
        assert_eq!(validated.audience, "aud");
        let err = verifier.verify(&token, options).unwrap_err();
        assert_eq!(err, VerificationError::Replay);
    }

    #[test]
    fn rejects_mismatched_purpose() {
        let signing = signing_key();
        let verifying = signing.verifying_key();
        let claims = sample_claims();
        let token = encode_token(&claims, &signing).unwrap();
        let verifier = TokenVerifier::new(verifying, MemoryReplayCache::new());
        let err = verifier
            .verify(
                &token,
                VerificationOptions {
                    expected_audience: Some("aud".into()),
                    required_datasets: vec![],
                    required_row_scopes: BTreeMap::new(),
                    required_purposes: vec!["disallowed".into()],
                },
            )
            .unwrap_err();
        assert_eq!(err, VerificationError::PurposeMismatch);
    }
}
