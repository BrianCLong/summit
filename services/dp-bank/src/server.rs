use std::net::SocketAddr;
use std::sync::Arc;

use axum::Json;
use axum::extract::{Path, State};
use axum::http::{StatusCode, header};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};

use crate::audit::AuditExportError;
use crate::composition::{CompositionError, advanced_composition, zcdp_composition};
use crate::models::{
    AdvancedCompositionRequest, AdvancedCompositionResponse, BudgetAccountSummary, PlannerRequest,
    PlannerResponse, RegisterKeyRequest, SignedGrant, SpendRequest, ZcdpCompositionRequest,
    ZcdpCompositionResponse,
};
use crate::planner::{PlannerError, plan_allocations};
use crate::state::{DpBank, DpBankError};

#[derive(Clone)]
pub struct AppState {
    pub bank: Arc<DpBank>,
}

impl AppState {
    pub fn new(bank: DpBank) -> Self {
        Self {
            bank: Arc::new(bank),
        }
    }
}

pub fn router(state: AppState) -> axum::Router {
    axum::Router::new()
        .route("/tenants/:tenant/keys", post(register_key))
        .route(
            "/tenants/:tenant/projects/:project/grants",
            post(apply_grant),
        )
        .route(
            "/tenants/:tenant/projects/:project/spend",
            post(record_spend),
        )
        .route("/tenants/:tenant/projects/:project", get(get_account))
        .route("/compose/advanced", post(compute_advanced))
        .route("/compose/zcdp", post(compute_zcdp))
        .route("/planner", post(run_planner))
        .route("/audit.csv", get(export_audit_csv))
        .route("/audit.json", get(export_audit_json))
        .with_state(state)
}

pub async fn run(addr: SocketAddr) -> Result<(), std::io::Error> {
    let state = AppState::new(DpBank::new());
    let app = router(state);
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app.into_make_service()).await
}

type ApiResult<T> = Result<T, ApiError>;

#[derive(Debug)]
pub enum ApiError {
    DpBank(DpBankError),
    Composition(CompositionError),
    Planner(PlannerError),
    Audit(AuditExportError),
    Validation(String),
    NotFound(String),
}

impl From<DpBankError> for ApiError {
    fn from(value: DpBankError) -> Self {
        ApiError::DpBank(value)
    }
}

impl From<CompositionError> for ApiError {
    fn from(value: CompositionError) -> Self {
        ApiError::Composition(value)
    }
}

impl From<PlannerError> for ApiError {
    fn from(value: PlannerError) -> Self {
        ApiError::Planner(value)
    }
}

impl From<AuditExportError> for ApiError {
    fn from(value: AuditExportError) -> Self {
        ApiError::Audit(value)
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            ApiError::DpBank(DpBankError::UnknownKey { tenant, key_id }) => (
                StatusCode::NOT_FOUND,
                format!("unknown key `{key_id}` for `{tenant}`"),
            ),
            ApiError::DpBank(DpBankError::NegativeGrant)
            | ApiError::DpBank(DpBankError::NegativeSpend)
            | ApiError::DpBank(DpBankError::InsufficientEpsilon { .. })
            | ApiError::DpBank(DpBankError::InsufficientDelta { .. }) => {
                (StatusCode::BAD_REQUEST, self.to_string())
            }
            ApiError::DpBank(DpBankError::Crypto(_)) => (
                StatusCode::UNAUTHORIZED,
                "signature verification failed".to_string(),
            ),
            ApiError::Composition(_) | ApiError::Planner(_) | ApiError::Validation(_) => {
                (StatusCode::BAD_REQUEST, self.to_string())
            }
            ApiError::Audit(_) => (StatusCode::INTERNAL_SERVER_ERROR, self.to_string()),
            ApiError::NotFound(message) => (StatusCode::NOT_FOUND, message.clone()),
        };
        let body = Json(serde_json::json!({ "error": message }));
        (status, body).into_response()
    }
}

impl std::fmt::Display for ApiError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ApiError::DpBank(err) => write!(f, "{err}"),
            ApiError::Composition(err) => write!(f, "{err}"),
            ApiError::Planner(err) => write!(f, "{err}"),
            ApiError::Audit(err) => write!(f, "{err}"),
            ApiError::Validation(message) | ApiError::NotFound(message) => write!(f, "{message}"),
        }
    }
}

impl std::error::Error for ApiError {}

async fn register_key(
    State(state): State<AppState>,
    Path(tenant): Path<String>,
    Json(request): Json<RegisterKeyRequest>,
) -> ApiResult<(StatusCode, Json<serde_json::Value>)> {
    state
        .bank
        .register_key(&tenant, request)
        .map_err(ApiError::from)?;
    Ok((
        StatusCode::CREATED,
        Json(serde_json::json!({ "status": "ok" })),
    ))
}

async fn apply_grant(
    State(state): State<AppState>,
    Path((tenant, project)): Path<(String, String)>,
    Json(grant): Json<SignedGrant>,
) -> ApiResult<Json<BudgetAccountSummary>> {
    if grant.payload.tenant_id != tenant || grant.payload.project_id != project {
        return Err(ApiError::Validation(
            "grant payload tenant/project mismatch".to_string(),
        ));
    }
    let summary = state.bank.apply_grant(grant).map_err(ApiError::from)?;
    Ok(Json(summary))
}

async fn record_spend(
    State(state): State<AppState>,
    Path((tenant, project)): Path<(String, String)>,
    Json(spend): Json<SpendRequest>,
) -> ApiResult<Json<BudgetAccountSummary>> {
    let summary = state
        .bank
        .record_spend(&tenant, &project, spend)
        .map_err(ApiError::from)?;
    Ok(Json(summary))
}

async fn get_account(
    State(state): State<AppState>,
    Path((tenant, project)): Path<(String, String)>,
) -> ApiResult<Json<BudgetAccountSummary>> {
    match state.bank.get_account_summary(&tenant, &project) {
        Some(summary) => Ok(Json(summary)),
        None => Err(ApiError::NotFound(format!(
            "no budget account for {tenant}/{project}"
        ))),
    }
}

async fn compute_advanced(
    Json(request): Json<AdvancedCompositionRequest>,
) -> ApiResult<Json<AdvancedCompositionResponse>> {
    let response = advanced_composition(&request).map_err(ApiError::from)?;
    Ok(Json(response))
}

async fn compute_zcdp(
    Json(request): Json<ZcdpCompositionRequest>,
) -> ApiResult<Json<ZcdpCompositionResponse>> {
    let response = zcdp_composition(&request).map_err(ApiError::from)?;
    Ok(Json(response))
}

async fn run_planner(Json(request): Json<PlannerRequest>) -> ApiResult<Json<PlannerResponse>> {
    let response = plan_allocations(&request).map_err(ApiError::from)?;
    Ok(Json(response))
}

async fn export_audit_csv(State(state): State<AppState>) -> ApiResult<Response> {
    let body = state.bank.export_audit_csv().map_err(ApiError::from)?;
    Ok((
        StatusCode::OK,
        [(header::CONTENT_TYPE, "text/csv; charset=utf-8")],
        body,
    )
        .into_response())
}

async fn export_audit_json(State(state): State<AppState>) -> ApiResult<Response> {
    let body = state.bank.export_audit_json().map_err(ApiError::from)?;
    Ok((
        StatusCode::OK,
        [(header::CONTENT_TYPE, "application/json; charset=utf-8")],
        body,
    )
        .into_response())
}
