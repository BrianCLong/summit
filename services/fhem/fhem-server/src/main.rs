use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Instant;

use axum::extract::State;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::post;
use axum::{serve, Json, Router};
use fhem_core::{
    ciphertext_to_base64, ciphertexts_from_base64, generate_keys, homomorphic_count,
    homomorphic_sum, CiphertextStats, KeyConfig, KeyMaterial,
};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use thiserror::Error;
use tokio::net::TcpListener;
use tracing::info;

#[derive(Clone)]
struct AppState {
    keys: Arc<KeyMaterial>,
    latest_stats: Arc<RwLock<Option<CiphertextStats>>>,
}

#[derive(Debug, Deserialize, Serialize)]
struct EncRequest {
    ciphertexts: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct EncResponse {
    ciphertext: String,
    ciphertext_bytes: usize,
    input_ciphertext_bytes: usize,
    latency_micros: u128,
}

#[derive(Debug, Serialize)]
struct StatsResponse {
    last_batch: Option<CiphertextStats>,
}

#[derive(Debug, Error)]
enum AppError {
    #[error("{0}")]
    Core(#[from] fhem_core::FhemError),
    #[error("invalid payload: {0}")]
    BadRequest(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = match self {
            AppError::Core(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::BadRequest(_) => StatusCode::BAD_REQUEST,
        };
        let message = self.to_string();
        (status, Json(serde_json::json!({ "error": message }))).into_response()
    }
}

#[tokio::main]
async fn main() -> Result<(), AppError> {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .with_target(false)
        .init();

    let key_material = generate_keys(&KeyConfig::default())?;
    info!("FHE key material generated");

    let state = AppState {
        keys: Arc::new(key_material),
        latest_stats: Arc::new(RwLock::new(None)),
    };

    let addr: SocketAddr = "0.0.0.0:8080".parse().expect("bind address");
    info!("listening on {addr}");

    let listener = TcpListener::bind(addr)
        .await
        .map_err(|err| AppError::BadRequest(err.to_string()))?;

    serve(listener, build_router(state))
        .await
        .map_err(|err| AppError::BadRequest(err.to_string()))
}

fn build_router(state: AppState) -> Router {
    Router::new()
        .route("/enc-sum", post(enc_sum))
        .route("/enc-count", post(enc_count))
        .route("/stats", post(stats))
        .with_state(state)
}

#[cfg(test)]
mod tests {
    use super::*;
    use fhem_core::{decrypt_ciphertext_base64, encrypt_batch_base64};

    fn test_state() -> AppState {
        let keys = generate_keys(&KeyConfig::default()).expect("keys");
        AppState {
            keys: Arc::new(keys),
            latest_stats: Arc::new(RwLock::new(None)),
        }
    }

    #[tokio::test]
    async fn sum_endpoint_roundtrip() {
        let state = test_state();
        let (ciphertexts, _) = encrypt_batch_base64(&[4u32], &state.keys).expect("encrypt batch");

        let response = enc_sum(State(state.clone()), Json(EncRequest { ciphertexts }))
            .await
            .expect("handler success");
        let payload = response.0;

        let decrypted =
            decrypt_ciphertext_base64(&payload.ciphertext, &state.keys).expect("decrypt result");
        assert_eq!(decrypted, 4);
        assert!(payload.latency_micros > 0);
        assert!(payload.ciphertext_bytes > 0);
    }
}

async fn enc_sum(
    State(state): State<AppState>,
    Json(payload): Json<EncRequest>,
) -> Result<Json<EncResponse>, AppError> {
    process_request(state, payload, |raw, keys| homomorphic_sum(raw, keys)).await
}

async fn enc_count(
    State(state): State<AppState>,
    Json(payload): Json<EncRequest>,
) -> Result<Json<EncResponse>, AppError> {
    process_request(state, payload, |raw, keys| homomorphic_count(raw, keys)).await
}

async fn stats(State(state): State<AppState>) -> Result<Json<StatsResponse>, AppError> {
    let snapshot = state.latest_stats.read().clone();
    Ok(Json(StatsResponse {
        last_batch: snapshot,
    }))
}

async fn process_request<F>(
    state: AppState,
    payload: EncRequest,
    op: F,
) -> Result<Json<EncResponse>, AppError>
where
    F: Fn(&[Vec<u8>], &KeyMaterial) -> Result<Vec<u8>, fhem_core::FhemError>,
{
    if payload.ciphertexts.is_empty() {
        return Err(AppError::BadRequest("ciphertexts must not be empty".into()));
    }

    let start = Instant::now();
    let raw_ciphertexts = ciphertexts_from_base64(&payload.ciphertexts)?;
    let total_bytes: usize = raw_ciphertexts.iter().map(|ct| ct.len()).sum();

    let result = op(&raw_ciphertexts, &state.keys)?;
    let latency_micros = start.elapsed().as_micros();
    let encoded = ciphertext_to_base64(&result);

    let mut guard = state.latest_stats.write();
    *guard = Some(CiphertextStats::new(payload.ciphertexts.len(), total_bytes));

    Ok(Json(EncResponse {
        ciphertext: encoded,
        ciphertext_bytes: result.len(),
        input_ciphertext_bytes: total_bytes,
        latency_micros,
    }))
}
