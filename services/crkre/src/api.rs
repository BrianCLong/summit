use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::routing::{get, post};
use axum::Json;
use serde::Serialize;
use serde_json::json;
use serde_with::{base64::Base64, serde_as};
use uuid::Uuid;

use crate::service::{
    CreateEscrowRequest, CreateKeyParams, CrkreError, CrkreService, DecryptionParams,
    DecryptionResult, EncryptionResult, QuorumRecoveryRequest, QuorumRecoveryResult,
};
use crate::time::TimeProvider;

#[derive(Clone)]
pub struct ApiState<T: TimeProvider> {
    pub service: CrkreService<T>,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
    detail: Option<String>,
}

fn map_error(err: CrkreError) -> (StatusCode, Json<ErrorResponse>) {
    let (code, detail) = match &err {
        CrkreError::InvalidThreshold => (StatusCode::BAD_REQUEST, Some(err.to_string())),
        CrkreError::JurisdictionMismatch
        | CrkreError::ResidencyMismatch
        | CrkreError::PurposeMismatch
        | CrkreError::InsufficientQuorum
        | CrkreError::Signature
        | CrkreError::InvalidExpiry => (StatusCode::BAD_REQUEST, Some(err.to_string())),
        CrkreError::ShareUnknown => (StatusCode::BAD_REQUEST, Some(err.to_string())),
        CrkreError::KeyNotFound | CrkreError::EscrowNotFound => {
            (StatusCode::NOT_FOUND, Some(err.to_string()))
        }
        CrkreError::EscrowExpired => (StatusCode::GONE, Some(err.to_string())),
        CrkreError::Crypto(inner) => match inner {
            crate::crypto::CryptoError::InvalidThreshold
            | crate::crypto::CryptoError::InvalidShare => {
                (StatusCode::BAD_REQUEST, Some(inner.to_string()))
            }
            _ => (StatusCode::INTERNAL_SERVER_ERROR, Some(inner.to_string())),
        },
    };
    (
        code,
        Json(ErrorResponse {
            error: err.to_string(),
            detail,
        }),
    )
}

pub fn router<T: TimeProvider>(state: ApiState<T>) -> axum::Router {
    axum::Router::new()
        .route("/keys", post(create_key::<T>))
        .route("/keys/:key_id/provenance", get(get_provenance::<T>))
        .route("/keys/:key_id/escrow", post(create_escrow::<T>))
        .route("/escrow/:escrow_id", get(fetch_escrow::<T>))
        .route("/encrypt", post(encrypt::<T>))
        .route("/decrypt", post(decrypt::<T>))
        .route("/quorum/recover", post(recover::<T>))
        .route("/health", get(health))
        .with_state(state)
}

async fn create_key<T: TimeProvider>(
    State(state): State<ApiState<T>>,
    Json(payload): Json<CreateKeyParams>,
) -> Result<Json<crate::service::KeyMetadata>, (StatusCode, Json<ErrorResponse>)> {
    state
        .service
        .create_key(payload)
        .await
        .map(Json)
        .map_err(map_error)
}

async fn get_provenance<T: TimeProvider>(
    State(state): State<ApiState<T>>,
    Path(key_id): Path<Uuid>,
) -> Result<Json<Vec<crate::service::ShareProof>>, (StatusCode, Json<ErrorResponse>)> {
    state
        .service
        .all_provenance(key_id)
        .await
        .map(Json)
        .map_err(map_error)
}

#[serde_as]
#[derive(serde::Deserialize)]
struct EncryptRequest {
    pub key_id: Uuid,
    pub jurisdiction: String,
    pub residency: String,
    pub purpose: String,
    #[serde_as(as = "Base64")]
    pub plaintext: Vec<u8>,
}

async fn encrypt<T: TimeProvider>(
    State(state): State<ApiState<T>>,
    Json(payload): Json<EncryptRequest>,
) -> Result<Json<EncryptionResult>, (StatusCode, Json<ErrorResponse>)> {
    state
        .service
        .encrypt(
            payload.key_id,
            payload.jurisdiction,
            payload.residency,
            payload.purpose,
            payload.plaintext,
        )
        .await
        .map(Json)
        .map_err(map_error)
}

async fn decrypt<T: TimeProvider>(
    State(state): State<ApiState<T>>,
    Json(payload): Json<DecryptionParams>,
) -> Result<Json<DecryptionResult>, (StatusCode, Json<ErrorResponse>)> {
    state
        .service
        .decrypt(payload)
        .await
        .map(Json)
        .map_err(map_error)
}

async fn recover<T: TimeProvider>(
    State(state): State<ApiState<T>>,
    Json(payload): Json<QuorumRecoveryRequest>,
) -> Result<Json<QuorumRecoveryResult>, (StatusCode, Json<ErrorResponse>)> {
    state
        .service
        .recover_quorum(payload)
        .await
        .map(Json)
        .map_err(map_error)
}

#[derive(serde::Deserialize)]
struct EscrowRequestBody {
    pub share_ids: Vec<Uuid>,
    pub ttl_seconds: u64,
}

async fn create_escrow<T: TimeProvider>(
    State(state): State<ApiState<T>>,
    Path(key_id): Path<Uuid>,
    Json(body): Json<EscrowRequestBody>,
) -> Result<Json<crate::service::EscrowDescriptor>, (StatusCode, Json<ErrorResponse>)> {
    state
        .service
        .create_escrow(CreateEscrowRequest {
            key_id,
            share_ids: body.share_ids,
            ttl_seconds: body.ttl_seconds,
        })
        .await
        .map(Json)
        .map_err(map_error)
}

async fn fetch_escrow<T: TimeProvider>(
    State(state): State<ApiState<T>>,
    Path(escrow_id): Path<Uuid>,
) -> Result<Json<crate::service::EscrowMaterial>, (StatusCode, Json<ErrorResponse>)> {
    state
        .service
        .fetch_escrow(escrow_id)
        .await
        .map(Json)
        .map_err(map_error)
}

async fn health() -> Json<serde_json::Value> {
    Json(json!({ "status": "ok" }))
}
