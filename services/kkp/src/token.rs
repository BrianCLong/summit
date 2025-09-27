use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use ed25519_dalek::{PublicKey, Signature, Verifier};
use serde::{Deserialize, Serialize};
use serde_json::json;
use time::{Duration, OffsetDateTime};

use crate::{
    error::ProxyError,
    keyring::{JwkPublicKey, SigningKeyRing},
};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TokenClaims {
    pub sub: String,
    pub aud: String,
    pub backend: String,
    pub key_id: String,
    pub policy_claims: serde_json::Value,
    pub exp: i64,
    pub iat: i64,
    pub jti: String,
}

impl TokenClaims {
    pub fn new(
        subject: impl Into<String>,
        audience: impl Into<String>,
        backend: impl Into<String>,
        key_id: impl Into<String>,
        policy_claims: serde_json::Value,
        ttl: Duration,
    ) -> Self {
        let now = OffsetDateTime::now_utc();
        let exp = now + ttl;
        Self {
            sub: subject.into(),
            aud: audience.into(),
            backend: backend.into(),
            key_id: key_id.into(),
            policy_claims,
            exp: exp.unix_timestamp(),
            iat: now.unix_timestamp(),
            jti: uuid::Uuid::new_v4().to_string(),
        }
    }

    pub fn is_expired(&self) -> bool {
        OffsetDateTime::now_utc().unix_timestamp() >= self.exp
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct TokenHeader {
    alg: String,
    typ: String,
    kid: String,
}

fn base64_encode<T: AsRef<[u8]>>(data: T) -> String {
    URL_SAFE_NO_PAD.encode(data)
}

fn base64_decode(data: &str) -> Result<Vec<u8>, ProxyError> {
    URL_SAFE_NO_PAD
        .decode(data)
        .map_err(|err| ProxyError::InvalidToken(format!("base64 decode failed: {err}")))
}

pub fn sign_token(ring: &SigningKeyRing, claims: &TokenClaims) -> Result<String, ProxyError> {
    let kid = ring.current().id.clone();
    let header = TokenHeader {
        alg: "EdDSA".to_string(),
        typ: "JWT".to_string(),
        kid: kid.clone(),
    };
    let header_b64 = base64_encode(
        serde_json::to_vec(&header)
            .map_err(|err| ProxyError::InvalidToken(format!("serialize header failed: {err}")))?,
    );
    let payload_b64 = base64_encode(
        serde_json::to_vec(claims)
            .map_err(|err| ProxyError::InvalidToken(format!("serialize claims failed: {err}")))?,
    );

    let signing_input = format!("{}.{}", header_b64, payload_b64);
    let (_, sig_bytes) = ring.sign_current(signing_input.as_bytes());
    let signature_b64 = base64_encode(sig_bytes);
    Ok(format!("{}.{}.{}", header_b64, payload_b64, signature_b64))
}

pub fn verify_token(ring: &SigningKeyRing, token: &str) -> Result<TokenClaims, ProxyError> {
    let (header, claims, signature, signing_input) = decode_token_parts(token)?;
    ring.verify(&header.kid, signing_input.as_bytes(), &signature)?;
    if claims.is_expired() {
        return Err(ProxyError::InvalidToken("token expired".into()));
    }
    Ok(claims)
}

pub fn verify_with_jwks(keys: &[JwkPublicKey], token: &str) -> Result<TokenClaims, ProxyError> {
    let (header, claims, signature, signing_input) = decode_token_parts(token)?;
    let jwk = keys
        .iter()
        .find(|k| k.kid == header.kid)
        .ok_or_else(|| ProxyError::InvalidToken("unknown kid".into()))?;
    let public_key_bytes = base64_decode(&jwk.x)?;
    let public_key = PublicKey::from_bytes(&public_key_bytes)
        .map_err(|err| ProxyError::InvalidToken(format!("invalid public key: {err}")))?;
    let signature = Signature::from_bytes(&signature)
        .map_err(|err| ProxyError::InvalidToken(format!("signature parse failed: {err}")))?;
    public_key
        .verify(signing_input.as_bytes(), &signature)
        .map_err(|err| ProxyError::InvalidToken(format!("signature verification failed: {err}")))?;
    if claims.is_expired() {
        return Err(ProxyError::InvalidToken("token expired".into()));
    }
    Ok(claims)
}

fn decode_token_parts(
    token: &str,
) -> Result<(TokenHeader, TokenClaims, Vec<u8>, String), ProxyError> {
    let segments: Vec<&str> = token.split('.').collect();
    if segments.len() != 3 {
        return Err(ProxyError::InvalidToken("token format invalid".into()));
    }
    let header_bytes = base64_decode(segments[0])?;
    let payload_bytes = base64_decode(segments[1])?;
    let signature_bytes = base64_decode(segments[2])?;
    let header: TokenHeader = serde_json::from_slice(&header_bytes)
        .map_err(|err| ProxyError::InvalidToken(format!("invalid token header: {err}")))?;
    if header.alg != "EdDSA" || header.typ != "JWT" {
        return Err(ProxyError::InvalidToken("unsupported token header".into()));
    }
    let claims: TokenClaims = serde_json::from_slice(&payload_bytes)
        .map_err(|err| ProxyError::InvalidToken(format!("invalid token payload: {err}")))?;
    let signing_input = format!("{}.{}", segments[0], segments[1]);
    Ok((header, claims, signature_bytes, signing_input))
}

pub fn build_policy_input(
    action: &str,
    claims: &TokenClaims,
    request: serde_json::Value,
) -> serde_json::Value {
    json!({
        "action": action,
        "claims": claims,
        "request": request,
    })
}
