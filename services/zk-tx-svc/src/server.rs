use std::{sync::Arc, time::Instant};

use axum::{extract::State, http::StatusCode, response::IntoResponse, routing::post, Json, Router};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde_json::json;

use crate::{
    circuit::{CircuitError, OverlapCircuit},
    model::{OverlapProofRequest, OverlapProofResponse},
    red_team::RedTeamAnalyzer,
};

#[derive(Clone)]
pub struct AppState {
    pub circuit: Arc<dyn OverlapCircuit>,
}

pub fn build_router(circuit: Arc<dyn OverlapCircuit>) -> Router {
    Router::new()
        .route("/overlap-proof", post(overlap_proof))
        .with_state(AppState { circuit })
}

#[derive(Debug)]
pub enum ServiceError {
    Circuit(CircuitError),
}

impl From<CircuitError> for ServiceError {
    fn from(value: CircuitError) -> Self {
        Self::Circuit(value)
    }
}

impl IntoResponse for ServiceError {
    fn into_response(self) -> axum::response::Response {
        match self {
            ServiceError::Circuit(err) => {
                let body = json!({ "error": err.to_string() });
                (StatusCode::BAD_REQUEST, Json(body)).into_response()
            }
        }
    }
}

async fn overlap_proof(
    State(state): State<AppState>,
    Json(request): Json<OverlapProofRequest>,
) -> Result<Json<OverlapProofResponse>, ServiceError> {
    state.circuit.validate_hint(&request.circuit_hint)?;

    let start = Instant::now();
    let proof = state
        .circuit
        .prove_overlap(&request.tenant_a, &request.tenant_b)?;
    let elapsed = start.elapsed();
    let proof_size = proof.size();

    tracing::info!(target: "zk_tx_metrics", proof_size, elapsed_ms = elapsed.as_millis());

    let proof_b64 = STANDARD.encode(&proof.proof);
    let red_team_report = if request.red_team {
        Some(RedTeamAnalyzer::attempt_inference(&request, &proof))
    } else {
        None
    };

    Ok(Json(OverlapProofResponse {
        overlap: proof.overlap,
        proof: proof_b64,
        circuit: state.circuit.name().to_string(),
        proof_size,
        red_team_report,
    }))
}
