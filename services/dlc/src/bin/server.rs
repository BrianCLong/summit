use std::collections::BTreeSet;
use std::net::SocketAddr;
use std::path::PathBuf;

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::Json;
use axum::Router;
use chrono::{DateTime, Utc};
use clap::Parser;
use dlc::{
    AccessLogEntry, ComplianceReceipt, LeaseEngine, LeaseError, LeaseId, LeaseRecord, LeaseSpec,
    RowScope,
};
use serde::{Deserialize, Serialize};
use tracing::{error, info};

#[derive(Debug, Parser)]
struct Cli {
    #[arg(long, default_value = "0.0.0.0:8080")]
    listen: String,
    #[arg(long, default_value = "state")]
    state_dir: PathBuf,
}

#[derive(Clone)]
struct AppState {
    engine: LeaseEngine,
}

#[derive(Debug, Deserialize)]
struct LeaseSpecPayload {
    dataset_id: String,
    purposes: Vec<String>,
    row_scope: RowScope,
    expiry: DateTime<Utc>,
    revocation_hook: Option<String>,
}

#[derive(Debug, Deserialize)]
struct AccessRequest {
    row_id: String,
}

#[derive(Debug, Deserialize)]
struct RevokeRequest {
    reason: Option<String>,
}

#[derive(Debug, Serialize)]
struct HealthResponse {
    status: &'static str,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt::init();
    let cli = Cli::parse();
    let addr: SocketAddr = cli.listen.parse()?;
    let state_dir = cli.state_dir;

    let event_path = state_dir.join("events.jsonl");
    let receipt_dir = state_dir.join("receipts");
    let engine = LeaseEngine::builder()
        .with_event_path(event_path)
        .with_receipt_dir(receipt_dir)
        .build()
        .map_err(|err| {
            error!(?err, "failed to initialize lease engine");
            err
        })?;

    let app_state = AppState {
        engine: engine.clone(),
    };
    let app = Router::new()
        .route("/healthz", get(health))
        .route("/leases", post(create_lease).get(list_leases))
        .route("/leases/:id", get(get_lease))
        .route("/leases/:id/attenuate", post(attenuate))
        .route("/leases/:id/access", post(record_access))
        .route("/leases/:id/close", post(close_lease))
        .route("/leases/:id/revoke", post(revoke_lease))
        .with_state(app_state);
    let listener = tokio::net::TcpListener::bind(addr).await?;
    let actual_addr = listener.local_addr()?;
    info!(%actual_addr, "starting dlc server");
    axum::serve(listener, app.into_make_service())
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}

fn payload_to_spec(payload: LeaseSpecPayload) -> LeaseSpec {
    LeaseSpec {
        dataset_id: payload.dataset_id,
        purposes: payload.purposes.into_iter().collect::<BTreeSet<_>>(),
        row_scope: payload.row_scope,
        expiry: payload.expiry,
        revocation_hook: payload.revocation_hook,
    }
}

async fn create_lease(
    State(state): State<AppState>,
    Json(payload): Json<LeaseSpecPayload>,
) -> Result<Json<LeaseRecord>, ApiError> {
    let spec = payload_to_spec(payload);
    let lease = state
        .engine
        .create_lease(spec, None)
        .map_err(ApiError::from)?;
    Ok(Json(lease))
}

async fn attenuate(
    State(state): State<AppState>,
    Path(id): Path<LeaseId>,
    Json(payload): Json<LeaseSpecPayload>,
) -> Result<Json<LeaseRecord>, ApiError> {
    let spec = payload_to_spec(payload);
    let lease = state.engine.attenuate(id, spec).map_err(ApiError::from)?;
    Ok(Json(lease))
}

async fn record_access(
    State(state): State<AppState>,
    Path(id): Path<LeaseId>,
    Json(payload): Json<AccessRequest>,
) -> Result<Json<AccessLogEntry>, ApiError> {
    let entry = state
        .engine
        .record_access(id, payload.row_id)
        .map_err(ApiError::from)?;
    Ok(Json(entry))
}

async fn close_lease(
    State(state): State<AppState>,
    Path(id): Path<LeaseId>,
) -> Result<Json<ComplianceReceipt>, ApiError> {
    let receipt = state.engine.close_lease(id).map_err(ApiError::from)?;
    Ok(Json(receipt))
}

async fn revoke_lease(
    State(state): State<AppState>,
    Path(id): Path<LeaseId>,
    Json(payload): Json<RevokeRequest>,
) -> Result<StatusCode, ApiError> {
    state
        .engine
        .revoke(
            id,
            payload
                .reason
                .unwrap_or_else(|| "revoked via API".to_string()),
        )
        .map_err(ApiError::from)?;
    Ok(StatusCode::NO_CONTENT)
}

async fn list_leases(State(state): State<AppState>) -> Result<Json<Vec<LeaseRecord>>, ApiError> {
    let leases = state.engine.snapshot().leases;
    Ok(Json(leases))
}

async fn get_lease(
    State(state): State<AppState>,
    Path(id): Path<LeaseId>,
) -> Result<Json<LeaseRecord>, ApiError> {
    let snapshot = state.engine.snapshot();
    snapshot
        .leases
        .into_iter()
        .find(|lease| lease.id == id)
        .map(Json)
        .ok_or_else(|| ApiError::Lease(LeaseError::NotFound(id)))
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse { status: "ok" })
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
}

#[derive(Debug)]
enum ApiError {
    Lease(LeaseError),
}

impl From<LeaseError> for ApiError {
    fn from(err: LeaseError) -> Self {
        ApiError::Lease(err)
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let err = match self {
            ApiError::Lease(err) => err,
        };

        match err {
            LeaseError::NotFound(_) => (StatusCode::NOT_FOUND, err.to_string()).into_response(),
            LeaseError::OutOfScope { .. } => {
                (StatusCode::FORBIDDEN, err.to_string()).into_response()
            }
            LeaseError::Expired { .. } => (StatusCode::FORBIDDEN, err.to_string()).into_response(),
            LeaseError::Closed(_) => (StatusCode::CONFLICT, err.to_string()).into_response(),
            LeaseError::Revoked(_) => (StatusCode::FORBIDDEN, err.to_string()).into_response(),
            LeaseError::DatasetMismatch
            | LeaseError::PurposeMismatch
            | LeaseError::ScopeMismatch
            | LeaseError::ExpiryMismatch => {
                (StatusCode::UNPROCESSABLE_ENTITY, err.to_string()).into_response()
            }
            LeaseError::Store(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "persistent store error".to_string(),
            )
                .into_response(),
        }
    }
}
