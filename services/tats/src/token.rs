use std::collections::BTreeMap;
use std::convert::TryFrom;

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use chrono::{DateTime, TimeZone, Utc};
use ed25519_dalek::{Signer, SigningKey, Verifier, VerifyingKey};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use thiserror::Error;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TokenHeader {
    pub alg: String,
    pub typ: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub kid: Option<String>,
}

impl Default for TokenHeader {
    fn default() -> Self {
        Self {
            alg: "EdDSA".to_string(),
            typ: "TATS".to_string(),
            kid: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TokenClaims {
    pub jti: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub parent: Option<String>,
    pub audience: String,
    pub dataset_ids: Vec<String>,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub row_scopes: BTreeMap<String, Vec<String>>,
    pub purposes: Vec<String>,
    pub issued_at: i64,
    pub expires_at: i64,
    pub nonce: String,
}

impl TokenClaims {
    pub fn new(
        mut dataset_ids: Vec<String>,
        mut row_scopes: BTreeMap<String, Vec<String>>,
        mut purposes: Vec<String>,
        audience: String,
        issued_at: i64,
        expires_at: i64,
        parent: Option<String>,
        nonce: String,
    ) -> Self {
        dataset_ids.sort();
        dataset_ids.dedup();
        for rows in row_scopes.values_mut() {
            rows.sort();
            rows.dedup();
        }
        purposes.sort();
        purposes.dedup();

        let jti = compute_jti(
            parent.as_deref(),
            &audience,
            &dataset_ids,
            &row_scopes,
            &purposes,
            issued_at,
            expires_at,
            &nonce,
        );

        Self {
            jti,
            parent,
            audience,
            dataset_ids,
            row_scopes,
            purposes,
            issued_at,
            expires_at,
            nonce,
        }
    }

    pub fn expires_at_datetime(&self) -> DateTime<Utc> {
        Utc.timestamp_opt(self.expires_at, 0).single().unwrap()
    }

    pub fn issued_at_datetime(&self) -> DateTime<Utc> {
        Utc.timestamp_opt(self.issued_at, 0).single().unwrap()
    }
}

#[derive(Debug, Error)]
pub enum TokenError {
    #[error("token format invalid")]
    InvalidFormat,
    #[error("token signature invalid")]
    InvalidSignature,
    #[error("token payload malformed: {0}")]
    Payload(#[from] serde_json::Error),
}

#[derive(Debug, Clone)]
pub struct TokenParts {
    pub header: TokenHeader,
    pub claims: TokenClaims,
    pub signature: Vec<u8>,
    pub header_b64: String,
    pub payload_b64: String,
}

pub fn encode_token(claims: &TokenClaims, signing_key: &SigningKey) -> Result<String, TokenError> {
    let header = TokenHeader::default();
    let header_json = serde_json::to_vec(&header)?;
    let payload_json = serde_json::to_vec(claims)?;
    let header_b64 = URL_SAFE_NO_PAD.encode(header_json);
    let payload_b64 = URL_SAFE_NO_PAD.encode(payload_json);
    let signing_input = format!("{}.{}", header_b64, payload_b64);
    let signature = signing_key.sign(signing_input.as_bytes());
    let sig_b64 = URL_SAFE_NO_PAD.encode(signature.to_bytes());
    Ok(format!("{}.{}.{}", header_b64, payload_b64, sig_b64))
}

pub fn decode_token(token: &str) -> Result<TokenParts, TokenError> {
    let mut parts = token.split('.');
    let header_b64 = parts.next().ok_or(TokenError::InvalidFormat)?.to_string();
    let payload_b64 = parts.next().ok_or(TokenError::InvalidFormat)?.to_string();
    let sig_b64 = parts.next().ok_or(TokenError::InvalidFormat)?;
    if parts.next().is_some() {
        return Err(TokenError::InvalidFormat);
    }

    let header_bytes = URL_SAFE_NO_PAD
        .decode(header_b64.as_bytes())
        .map_err(|_| TokenError::InvalidFormat)?;
    let payload_bytes = URL_SAFE_NO_PAD
        .decode(payload_b64.as_bytes())
        .map_err(|_| TokenError::InvalidFormat)?;
    let signature_bytes = URL_SAFE_NO_PAD
        .decode(sig_b64.as_bytes())
        .map_err(|_| TokenError::InvalidFormat)?;

    let header: TokenHeader = serde_json::from_slice(&header_bytes)?;
    let claims: TokenClaims = serde_json::from_slice(&payload_bytes)?;
    Ok(TokenParts {
        header,
        claims,
        signature: signature_bytes,
        header_b64,
        payload_b64,
    })
}

pub fn verify_token(
    token: &str,
    verifying_key: &VerifyingKey,
) -> Result<(TokenHeader, TokenClaims), TokenError> {
    let parts = decode_token(token)?;
    let signing_input = format!("{}.{}", parts.header_b64, parts.payload_b64);
    let signature = ed25519_dalek::Signature::try_from(parts.signature.as_slice())
        .map_err(|_| TokenError::InvalidFormat)?;
    verifying_key
        .verify(signing_input.as_bytes(), &signature)
        .map_err(|_| TokenError::InvalidSignature)?;
    Ok((parts.header, parts.claims))
}

pub fn compute_jti(
    parent: Option<&str>,
    audience: &str,
    dataset_ids: &[String],
    row_scopes: &BTreeMap<String, Vec<String>>,
    purposes: &[String],
    issued_at: i64,
    expires_at: i64,
    nonce: &str,
) -> String {
    let mut hasher = Sha256::new();
    if let Some(parent) = parent {
        hasher.update(parent.as_bytes());
    }
    hasher.update(audience.as_bytes());
    for id in dataset_ids {
        hasher.update(id.as_bytes());
    }
    for (dataset, rows) in row_scopes.iter() {
        hasher.update(dataset.as_bytes());
        for row in rows {
            hasher.update(row.as_bytes());
        }
    }
    for purpose in purposes {
        hasher.update(purpose.as_bytes());
    }
    hasher.update(issued_at.to_be_bytes());
    hasher.update(expires_at.to_be_bytes());
    hasher.update(nonce.as_bytes());
    hex::encode(hasher.finalize())
}

pub fn compute_default_nonce(
    audience: &str,
    dataset_ids: &[String],
    row_scopes: &BTreeMap<String, Vec<String>>,
    purposes: &[String],
    expires_at: i64,
) -> String {
    let mut hasher = Sha256::new();
    hasher.update(audience.as_bytes());
    for id in dataset_ids {
        hasher.update(id.as_bytes());
    }
    for (dataset, rows) in row_scopes.iter() {
        hasher.update(dataset.as_bytes());
        for row in rows {
            hasher.update(row.as_bytes());
        }
    }
    for purpose in purposes {
        hasher.update(purpose.as_bytes());
    }
    hasher.update(expires_at.to_be_bytes());
    hex::encode(hasher.finalize())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn signing_key() -> SigningKey {
        let seed = [7u8; 32];
        SigningKey::from_bytes(&seed)
    }

    #[test]
    fn encode_and_verify_round_trip() {
        let signing_key = signing_key();
        let verifying_key = signing_key.verifying_key();
        let claims = TokenClaims::new(
            vec!["dataset-a".into(), "dataset-b".into()],
            BTreeMap::from([("dataset-a".into(), vec!["row-1".into(), "row-2".into()])]),
            vec!["analytics".into()],
            "aud-a".into(),
            1_700_000_000,
            1_700_000_500,
            None,
            "nonce".into(),
        );
        let token = encode_token(&claims, &signing_key).expect("token");
        let (_, verified) = verify_token(&token, &verifying_key).expect("verify");
        assert_eq!(claims.jti, verified.jti);
        assert_eq!(claims.dataset_ids, verified.dataset_ids);
        assert_eq!(claims.row_scopes, verified.row_scopes);
    }

    #[test]
    fn deterministic_nonce() {
        let dataset_ids = vec!["b".into(), "a".into()];
        let row_scopes = BTreeMap::from([(String::from("a"), vec!["2".into(), "1".into()])]);
        let purposes = vec!["use".into(), "limit".into()];
        let nonce1 = compute_default_nonce("aud", &dataset_ids, &row_scopes, &purposes, 10);
        let nonce2 = compute_default_nonce("aud", &dataset_ids, &row_scopes, &purposes, 10);
        assert_eq!(nonce1, nonce2);
    }
}
