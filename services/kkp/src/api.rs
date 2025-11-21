use axum::{extract::State, http::StatusCode, Json};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use time::Duration;

use crate::{
    app::AppState,
    error::ProxyError,
    keyring::JwkPublicKey,
    kms::{Envelope, EnvelopeDecryptRequest, EnvelopeRequest},
    token::{sign_token, verify_token, TokenClaims},
};

#[derive(Debug, Deserialize)]
#[serde(default)]
pub struct TokenRequest {
    pub subject: String,
    pub audience: String,
    pub backend: String,
    pub key_id: String,
    pub ttl_seconds: Option<u64>,
    pub policy_claims: Value,
    pub request_context: Value,
}

impl Default for TokenRequest {
    fn default() -> Self {
        Self {
            subject: String::new(),
            audience: String::new(),
            backend: String::new(),
            key_id: String::new(),
            ttl_seconds: None,
            policy_claims: json!({}),
            request_context: json!({}),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TokenResponse {
    pub token: String,
    pub expires_at: i64,
    pub kid: String,
}

#[derive(Debug, Deserialize)]
#[serde(default)]
pub struct EncryptRequest {
    pub backend: String,
    pub key_id: String,
    pub plaintext: String,
    pub associated_data: Option<String>,
    pub policy_context: Value,
}

impl Default for EncryptRequest {
    fn default() -> Self {
        Self {
            backend: String::new(),
            key_id: String::new(),
            plaintext: String::new(),
            associated_data: None,
            policy_context: json!({}),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EncryptResponse {
    pub envelope: Envelope,
}

#[derive(Debug, Deserialize)]
#[serde(default)]
pub struct DecryptRequest {
    pub token: String,
    pub envelope: EnvelopeDecryptRequest,
    pub expected_audience: Option<String>,
    pub context: Value,
}

impl Default for DecryptRequest {
    fn default() -> Self {
        Self {
            token: String::new(),
            envelope: EnvelopeDecryptRequest {
                backend: String::new(),
                key_id: String::new(),
                ciphertext: String::new(),
                nonce: String::new(),
                encrypted_data_key: String::new(),
                associated_data: None,
            },
            expected_audience: None,
            context: json!({}),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DecryptResponse {
    pub plaintext: String,
    pub claims: TokenClaims,
}

pub async fn issue_token(
    State(state): State<AppState>,
    Json(req): Json<TokenRequest>,
) -> Result<Json<TokenResponse>, ProxyError> {
    if req.subject.is_empty() || req.audience.is_empty() {
        return Err(ProxyError::PolicyDenied(
            "subject and audience must be provided".into(),
        ));
    }
    if req.backend.is_empty() || req.key_id.is_empty() {
        return Err(ProxyError::PolicyDenied(
            "backend and key identifier required".into(),
        ));
    }

    let ttl = req
        .ttl_seconds
        .map(|s| Duration::seconds(s as i64))
        .unwrap_or(state.default_token_ttl);
    let claims = TokenClaims::new(
        req.subject,
        req.audience,
        req.backend,
        req.key_id,
        req.policy_claims.clone(),
        ttl,
    );

    let claims_value = serde_json::to_value(&claims)
        .map_err(|err| ProxyError::Internal(format!("serialize claims failed: {err}")))?;
    let policy_input = json!({
        "action": "issue_token",
        "claims": claims_value,
        "request": {
            "context": req.request_context,
        }
    });
    state.policy.evaluate(&policy_input)?;

    let ring = state.keyring.read();
    let token = sign_token(&ring, &claims)?;
    let kid = ring.current().id.clone();
    Ok(Json(TokenResponse {
        token,
        expires_at: claims.exp,
        kid,
    }))
}

pub async fn encrypt_envelope(
    State(state): State<AppState>,
    Json(req): Json<EncryptRequest>,
) -> Result<Json<EncryptResponse>, ProxyError> {
    if req.backend.is_empty() || req.key_id.is_empty() {
        return Err(ProxyError::Envelope("backend and key id required".into()));
    }
    if req.plaintext.is_empty() {
        return Err(ProxyError::Envelope("plaintext required".into()));
    }

    let policy_input = json!({
        "action": "encrypt",
        "request": {
            "backend": req.backend.clone(),
            "key_id": req.key_id.clone(),
            "context": req.policy_context,
        }
    });
    state.policy.evaluate(&policy_input)?;

    let envelope = state.kms.encrypt(&EnvelopeRequest {
        backend: req.backend,
        key_id: req.key_id,
        plaintext: req.plaintext,
        associated_data: req.associated_data,
    })?;
    Ok(Json(EncryptResponse { envelope }))
}

pub async fn decrypt_envelope(
    State(state): State<AppState>,
    Json(req): Json<DecryptRequest>,
) -> Result<Json<DecryptResponse>, ProxyError> {
    if req.token.is_empty() {
        return Err(ProxyError::InvalidToken("token missing".into()));
    }
    let ring_guard = state.keyring.read();
    let claims = verify_token(&ring_guard, &req.token)?;
    drop(ring_guard);

    if claims.backend != req.envelope.backend || claims.key_id != req.envelope.key_id {
        return Err(ProxyError::PolicyDenied(
            "token scope does not match envelope".into(),
        ));
    }
    if let Some(expected) = &req.expected_audience {
        if expected != &claims.aud {
            return Err(ProxyError::PolicyDenied("audience mismatch".into()));
        }
    }

    let claims_value = serde_json::to_value(&claims)
        .map_err(|err| ProxyError::Internal(format!("serialize claims failed: {err}")))?;
    let policy_input = json!({
        "action": "decrypt",
        "claims": claims_value,
        "request": {
            "context": req.context,
            "envelope": &req.envelope,
        }
    });
    state.policy.evaluate(&policy_input)?;

    let plaintext_bytes = state.kms.decrypt(&req.envelope)?;
    let plaintext = String::from_utf8(plaintext_bytes)
        .map_err(|_| ProxyError::Envelope("plaintext is not valid utf-8".into()))?;
    Ok(Json(DecryptResponse { plaintext, claims }))
}

#[derive(Debug, Serialize, Deserialize)]
pub struct JwksResponse {
    pub keys: Vec<JwkPublicKey>,
}

pub async fn get_jwks(State(state): State<AppState>) -> Result<Json<JwksResponse>, ProxyError> {
    let guard = state.keyring.read();
    Ok(Json(JwksResponse {
        keys: guard.all_public_keys(),
    }))
}

#[derive(Debug, Serialize)]
pub struct JwkRotateResponse {
    pub kid: String,
    pub expires_at: i64,
}

pub async fn rotate_keys(
    State(state): State<AppState>,
) -> Result<(StatusCode, Json<JwkRotateResponse>), ProxyError> {
    let mut guard = state.keyring.write();
    guard.prune_expired();
    guard.rotate();
    let key = guard.current().clone();
    Ok((
        StatusCode::CREATED,
        Json(JwkRotateResponse {
            kid: key.id,
            expires_at: key.expires_at.unix_timestamp(),
        }),
    ))
}
