use axum::{extract::State, http::StatusCode, response::IntoResponse, routing::post, Json, Router};
use serde_json::json;
use tracing::info;

use crate::models::{OverlapProofRequest, ProofResponse, VerifyRequest, VerifyResponse};
use crate::proof::{
    generate_nonoverlap_proof, generate_overlap_proof, verify_nonoverlap, verify_overlap, ProofError,
};

#[derive(Clone, Default)]
pub struct AppState;

pub fn build_router() -> Router {
    Router::new()
        .route("/proofs/overlap", post(overlap_proof))
        .route("/verify/overlap", post(verify_overlap_route))
        .route("/proofs/nonoverlap", post(nonoverlap_proof))
        .route("/verify/nonoverlap", post(verify_nonoverlap_route))
        .with_state(AppState)
}

async fn overlap_proof(
    State(_state): State<AppState>,
    Json(request): Json<OverlapProofRequest>,
) -> Result<Json<ProofResponse>, ProofError> {
    let proof = generate_overlap_proof(&request)?;
    info!(target: "zk_tx_transcript", overlap = proof.overlap, leakage = proof.transcript.leakage);
    Ok(Json(proof))
}

async fn nonoverlap_proof(
    State(_state): State<AppState>,
    Json(request): Json<OverlapProofRequest>,
) -> Result<Json<ProofResponse>, ProofError> {
    let proof = generate_nonoverlap_proof(&request)?;
    info!(target: "zk_tx_transcript", overlap = proof.overlap, leakage = proof.transcript.leakage);
    Ok(Json(proof))
}

async fn verify_overlap_route(
    State(_state): State<AppState>,
    Json(request): Json<VerifyRequest>,
) -> Result<Json<VerifyResponse>, ProofError> {
    let result = verify_overlap(&request)?;
    Ok(Json(result))
}

async fn verify_nonoverlap_route(
    State(_state): State<AppState>,
    Json(request): Json<VerifyRequest>,
) -> Result<Json<VerifyResponse>, ProofError> {
    let result = verify_nonoverlap(&request)?;
    Ok(Json(result))
}

impl IntoResponse for ProofError {
    fn into_response(self) -> axum::response::Response {
        let (status, message) = match &self {
            ProofError::MissingOverlap => (StatusCode::BAD_REQUEST, self.to_string()),
            ProofError::DisjointnessViolated => (StatusCode::BAD_REQUEST, self.to_string()),
            ProofError::InvalidFormat(_) => (StatusCode::BAD_REQUEST, self.to_string()),
        };

        (status, Json(json!({ "error": message }))).into_response()
    }
}
