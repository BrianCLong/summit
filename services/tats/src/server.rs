use base64::Engine;
use std::collections::BTreeMap;
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use axum::extract::State;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use hyper::Error as HyperError;
use serde::{Deserialize, Serialize};
use thiserror::Error;
use tokio::net::TcpListener;
use tracing::{error, info};

use crate::attenuation::{self, AttenuationRequest};
use crate::config::ServiceConfig;
use crate::token::{compute_default_nonce, encode_token, verify_token, TokenClaims, TokenError};

#[derive(Clone)]
struct AppState {
    signing_key: Arc<ed25519_dalek::SigningKey>,
    verifying_key: ed25519_dalek::VerifyingKey,
    default_ttl_secs: u64,
    max_ttl_secs: u64,
}

impl AppState {
    fn new(config: ServiceConfig) -> Result<(Self, SocketAddr), ServerError> {
        let ServiceConfig {
            bind_address,
            signing_key,
            verifying_key,
            default_ttl,
            max_ttl,
        } = config;
        let addr = bind_address.parse().map_err(ServerError::Address)?;
        let state = Self {
            signing_key: Arc::new(signing_key),
            verifying_key,
            default_ttl_secs: default_ttl.num_seconds() as u64,
            max_ttl_secs: max_ttl.num_seconds() as u64,
        };
        Ok((state, addr))
    }
}

#[derive(Debug, Deserialize)]
pub struct IssueTokenRequest {
    pub audience: String,
    pub dataset_ids: Vec<String>,
    #[serde(default)]
    pub row_scopes: BTreeMap<String, Vec<String>>,
    pub purposes: Vec<String>,
    #[serde(default)]
    pub ttl_seconds: Option<u64>,
    #[serde(default)]
    pub nonce: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TokenResponse {
    pub token: String,
    pub token_id: String,
    pub expires_at: i64,
}

#[derive(Debug, Error)]
pub enum ApiError {
    #[error("{0}")]
    BadRequest(String),
    #[error("unauthorized")]
    Unauthorized,
    #[error("internal error")]
    Internal,
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let status = match self {
            ApiError::BadRequest(_) => StatusCode::BAD_REQUEST,
            ApiError::Unauthorized => StatusCode::UNAUTHORIZED,
            ApiError::Internal => StatusCode::INTERNAL_SERVER_ERROR,
        };
        let message = self.to_string();
        let body = Json(serde_json::json!({ "error": message }));
        (status, body).into_response()
    }
}

#[derive(Debug, Error)]
pub enum ServerError {
    #[error("bind address invalid: {0}")]
    Address(std::net::AddrParseError),
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error(transparent)]
    Http(#[from] HyperError),
}

pub async fn serve(config: ServiceConfig) -> Result<(), ServerError> {
    let (state, addr) = AppState::new(config)?;
    let app = Router::new()
        .route("/healthz", get(health))
        .route("/v1/tokens", post(issue_token))
        .route("/v1/attenuate", post(attenuate_token))
        .route("/v1/keys", get(keys))
        .with_state(state.clone());

    let listener = TcpListener::bind(addr).await?;
    info!(%addr, "tats server started");
    axum::serve(listener, app.into_make_service()).await?;
    Ok(())
}

async fn health() -> &'static str {
    "ok"
}

async fn keys(State(state): State<AppState>) -> Json<serde_json::Value> {
    let verifying_key = state.verifying_key;
    let key_b64 = base64::engine::general_purpose::STANDARD.encode(verifying_key.to_bytes());
    Json(serde_json::json!({
        "algorithm": "EdDSA",
        "public_key": key_b64,
    }))
}

async fn issue_token(
    State(state): State<AppState>,
    Json(req): Json<IssueTokenRequest>,
) -> Result<Json<TokenResponse>, ApiError> {
    if req.dataset_ids.is_empty() {
        return Err(ApiError::BadRequest("dataset_ids must not be empty".into()));
    }
    if req.purposes.is_empty() {
        return Err(ApiError::BadRequest("purposes must not be empty".into()));
    }

    let issued_at = current_timestamp();
    let mut dataset_ids = req.dataset_ids.clone();
    dataset_ids.sort();
    dataset_ids.dedup();

    let mut row_scopes = req.row_scopes.clone();
    for (dataset, rows) in row_scopes.iter_mut() {
        rows.sort();
        rows.dedup();
        if !dataset_ids.contains(dataset) {
            return Err(ApiError::BadRequest(format!(
                "row scope dataset {} not permitted",
                dataset
            )));
        }
    }

    let mut purposes = req.purposes.clone();
    purposes.sort();
    purposes.dedup();

    let ttl_request = req.ttl_seconds.unwrap_or(state.default_ttl_secs);
    if ttl_request == 0 {
        return Err(ApiError::BadRequest("ttl_seconds must be positive".into()));
    }
    let ttl_seconds = ttl_request.min(state.max_ttl_secs);
    let expires_at = issued_at + ttl_seconds as i64;

    let nonce = req.nonce.unwrap_or_else(|| {
        compute_default_nonce(
            &req.audience,
            &dataset_ids,
            &row_scopes,
            &purposes,
            expires_at,
        )
    });

    let claims = TokenClaims::new(
        dataset_ids.clone(),
        row_scopes.clone(),
        purposes.clone(),
        req.audience.clone(),
        issued_at,
        expires_at,
        None,
        nonce,
    );

    let token = encode_token(&claims, &state.signing_key).map_err(|err| {
        error!(error = %err, "failed to encode token");
        ApiError::Internal
    })?;

    Ok(Json(TokenResponse {
        token,
        token_id: claims.jti.clone(),
        expires_at: claims.expires_at,
    }))
}

async fn attenuate_token(
    State(state): State<AppState>,
    Json(request): Json<AttenuationRequest>,
) -> Result<Json<TokenResponse>, ApiError> {
    let (_, parent_claims) =
        verify_token(&request.parent_token, &state.verifying_key).map_err(|err| match err {
            TokenError::InvalidSignature => ApiError::Unauthorized,
            _ => ApiError::BadRequest("parent token invalid".into()),
        })?;

    let now = current_timestamp();
    if parent_claims.expires_at <= now {
        return Err(ApiError::Unauthorized);
    }

    let attenuated = attenuation::attenuate(
        &parent_claims,
        request,
        now,
        chrono::Duration::seconds(state.max_ttl_secs as i64),
    )
    .map_err(|err| ApiError::BadRequest(err.to_string()))?;

    let token = encode_token(&attenuated, &state.signing_key).map_err(|err| {
        error!(error = %err, "failed to encode attenuated token");
        ApiError::Internal
    })?;

    Ok(Json(TokenResponse {
        token,
        token_id: attenuated.jti.clone(),
        expires_at: attenuated.expires_at,
    }))
}

fn current_timestamp() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or(Duration::ZERO)
        .as_secs() as i64
}
