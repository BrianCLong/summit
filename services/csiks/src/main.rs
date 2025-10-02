use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Duration, Utc};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{collections::HashMap, sync::Arc};
use thiserror::Error;
use tracing::{info, warn};
use tracing_subscriber::{fmt, EnvFilter};
use uuid::Uuid;

#[derive(Clone)]
struct AppState {
    store: Arc<RwLock<HashMap<Uuid, IdempotencyRecord>>>,
}

impl AppState {
    fn new() -> Self {
        Self {
            store: Arc::new(RwLock::new(HashMap::new())),
        }
    }
}

#[derive(Debug, Error)]
enum AppError {
    #[error("record not found")]
    NotFound,
    #[error("validation error: {0}")]
    Validation(String),
    #[error("conflict: {0}")]
    Conflict(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            AppError::NotFound => (StatusCode::NOT_FOUND, self.to_string()),
            AppError::Validation(_) => (StatusCode::BAD_REQUEST, self.to_string()),
            AppError::Conflict(_) => (StatusCode::CONFLICT, self.to_string()),
        };

        let body = Json(serde_json::json!({ "error": message }));
        (status, body).into_response()
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
enum RecordStatus {
    Pending,
    Completed,
    Failed,
    Expired,
}

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
enum VerificationStatus {
    Accepted,
    Duplicate,
    Conflict,
    Expired,
    Completed,
    Failed,
}

impl From<RecordStatus> for VerificationStatus {
    fn from(value: RecordStatus) -> Self {
        match value {
            RecordStatus::Pending => VerificationStatus::Accepted,
            RecordStatus::Completed => VerificationStatus::Completed,
            RecordStatus::Failed => VerificationStatus::Failed,
            RecordStatus::Expired => VerificationStatus::Expired,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
enum JournalEvent {
    Issued,
    Verified,
    Completed,
    Failed,
    Conflict,
    Expired,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct JournalEntry {
    timestamp: DateTime<Utc>,
    participant: Option<String>,
    event: JournalEvent,
    note: Option<String>,
    fingerprint: Option<String>,
    dedupe_count: u64,
    details: Option<Value>,
}

impl JournalEntry {
    fn new(
        event: JournalEvent,
        participant: Option<String>,
        note: Option<String>,
        fingerprint: Option<String>,
        dedupe_count: u64,
        details: Option<Value>,
    ) -> Self {
        Self {
            timestamp: Utc::now(),
            participant,
            event,
            note,
            fingerprint,
            dedupe_count,
            details,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct IdempotencyRecord {
    key: Uuid,
    tenant: String,
    action: String,
    resource: String,
    fingerprint: Option<String>,
    ttl_seconds: i64,
    status: RecordStatus,
    dedupe_count: u64,
    created_at: DateTime<Utc>,
    last_seen: DateTime<Utc>,
    expires_at: DateTime<Utc>,
    conflict_reason: Option<String>,
    result: Option<Value>,
    journal: Vec<JournalEntry>,
}

impl IdempotencyRecord {
    fn new(
        tenant: String,
        action: String,
        resource: String,
        ttl_seconds: i64,
        issued_by: Option<String>,
        metadata: Option<Value>,
    ) -> Self {
        let now = Utc::now();
        let expires_at = now + Duration::seconds(ttl_seconds);
        let mut journal = Vec::with_capacity(4);
        journal.push(JournalEntry::new(
            JournalEvent::Issued,
            issued_by,
            Some("Key issued".to_string()),
            None,
            0,
            metadata,
        ));
        Self {
            key: Uuid::new_v4(),
            tenant,
            action,
            resource,
            fingerprint: None,
            ttl_seconds,
            status: RecordStatus::Pending,
            dedupe_count: 0,
            created_at: now,
            last_seen: now,
            expires_at,
            conflict_reason: None,
            result: None,
            journal,
        }
    }
}

#[derive(Debug, Deserialize)]
struct IssueRequest {
    tenant: String,
    action: String,
    resource: String,
    #[serde(default = "default_ttl")]
    ttl_seconds: i64,
    issued_by: Option<String>,
    metadata: Option<Value>,
}

#[derive(Debug, Serialize)]
struct IssueResponse {
    idempotency_key: Uuid,
    expires_at: DateTime<Utc>,
    status: RecordStatus,
}

#[derive(Debug, Deserialize)]
struct VerifyRequest {
    tenant: String,
    action: String,
    resource: String,
    idempotency_key: Uuid,
    fingerprint: Option<String>,
    participant: Option<String>,
    dedupe_token: Option<String>,
}

#[derive(Debug, Serialize)]
struct VerifyResponse {
    status: VerificationStatus,
    dedupe_count: u64,
    expires_at: DateTime<Utc>,
    last_seen: DateTime<Utc>,
    conflict_reason: Option<String>,
    replay_hint: Option<String>,
    result: Option<Value>,
    journal: Vec<JournalEntry>,
}

#[derive(Debug, Deserialize)]
struct CompleteRequest {
    tenant: String,
    action: String,
    resource: String,
    idempotency_key: Uuid,
    participant: Option<String>,
    success: bool,
    result: Option<Value>,
    note: Option<String>,
}

#[derive(Debug, Serialize)]
struct CompleteResponse {
    status: RecordStatus,
    result: Option<Value>,
    journal: Vec<JournalEntry>,
}

#[derive(Debug, Serialize)]
struct RecordView {
    status: RecordStatus,
    tenant: String,
    action: String,
    resource: String,
    fingerprint: Option<String>,
    dedupe_count: u64,
    created_at: DateTime<Utc>,
    last_seen: DateTime<Utc>,
    expires_at: DateTime<Utc>,
    conflict_reason: Option<String>,
    result: Option<Value>,
    journal: Vec<JournalEntry>,
}

const DEFAULT_TTL_SECONDS: i64 = 3600;

fn default_ttl() -> i64 {
    DEFAULT_TTL_SECONDS
}

#[tokio::main]
async fn main() {
    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("csiks=info"));
    fmt().with_env_filter(filter).with_target(false).init();

    let state = AppState::new();
    let app = Router::new()
        .route("/keys/issue", post(issue_key))
        .route("/keys/verify", post(verify_key))
        .route("/keys/complete", post(complete_key))
        .route("/keys/:id", get(get_key))
        .route("/healthz", get(health_check))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080")
        .await
        .expect("failed to bind port 8080");
    info!("listening on {}", listener.local_addr().unwrap());

    if let Err(err) = axum::serve(listener, app).await {
        warn!(error = %err, "server stopped unexpectedly");
    }
}

async fn health_check() -> Json<Value> {
    Json(json!({ "status": "ok" }))
}

async fn issue_key(
    State(state): State<AppState>,
    Json(payload): Json<IssueRequest>,
) -> Result<Json<IssueResponse>, AppError> {
    if payload.ttl_seconds <= 0 {
        return Err(AppError::Validation("ttl_seconds must be positive".into()));
    }

    let record = IdempotencyRecord::new(
        payload.tenant,
        payload.action,
        payload.resource,
        payload.ttl_seconds,
        payload.issued_by,
        payload.metadata,
    );
    let key = record.key;
    let expires_at = record.expires_at;

    let mut store = state.store.write();
    store.insert(key, record.clone());

    Ok(Json(IssueResponse {
        idempotency_key: key,
        expires_at,
        status: record.status,
    }))
}

async fn verify_key(
    State(state): State<AppState>,
    Json(payload): Json<VerifyRequest>,
) -> Result<Json<VerifyResponse>, AppError> {
    let mut store = state.store.write();
    let record = store
        .get_mut(&payload.idempotency_key)
        .ok_or(AppError::NotFound)?;

    if record.tenant != payload.tenant
        || record.action != payload.action
        || record.resource != payload.resource
    {
        return Err(AppError::Conflict("scope does not match issued key".into()));
    }

    let now = Utc::now();
    let mut status = VerificationStatus::from(record.status.clone());
    let mut conflict_reason = None;
    let mut replay_hint = None;

    if now > record.expires_at {
        if record.status != RecordStatus::Expired {
            record.status = RecordStatus::Expired;
            record.conflict_reason = Some("key expired".to_string());
            record.journal.push(JournalEntry::new(
                JournalEvent::Expired,
                payload.participant.clone(),
                Some("Key expired during verification".to_string()),
                payload.fingerprint.clone(),
                record.dedupe_count,
                None,
            ));
        }
        status = VerificationStatus::Expired;
    } else {
        if let Some(existing) = &record.fingerprint {
            if let Some(fp) = &payload.fingerprint {
                if existing != fp {
                    let reason = format!("fingerprint mismatch: expected {}, got {}", existing, fp);
                    record.conflict_reason = Some(reason.clone());
                    conflict_reason = Some(reason.clone());
                    status = VerificationStatus::Conflict;
                    record.journal.push(JournalEntry::new(
                        JournalEvent::Conflict,
                        payload.participant.clone(),
                        Some("Fingerprint mismatch".to_string()),
                        payload.fingerprint.clone(),
                        record.dedupe_count,
                        Some(serde_json::json!({ "expected": existing, "provided": fp })),
                    ));
                    return Ok(Json(VerifyResponse {
                        status,
                        dedupe_count: record.dedupe_count,
                        expires_at: record.expires_at,
                        last_seen: record.last_seen,
                        conflict_reason,
                        replay_hint: None,
                        result: record.result.clone(),
                        journal: record.journal.clone(),
                    }));
                }
            } else {
                replay_hint = Some("fingerprint missing; replay allowed".to_string());
            }
        } else if let Some(fp) = &payload.fingerprint {
            record.fingerprint = Some(fp.clone());
        }

        if record.status == RecordStatus::Pending {
            status = if record.dedupe_count == 0 {
                VerificationStatus::Accepted
            } else {
                VerificationStatus::Duplicate
            };
        }

        record.dedupe_count += 1;
        record.last_seen = now;
        record.journal.push(JournalEntry::new(
            JournalEvent::Verified,
            payload.participant.clone(),
            payload.dedupe_token.clone(),
            payload.fingerprint.clone(),
            record.dedupe_count,
            None,
        ));
    }

    Ok(Json(VerifyResponse {
        status,
        dedupe_count: record.dedupe_count,
        expires_at: record.expires_at,
        last_seen: record.last_seen,
        conflict_reason: conflict_reason.or_else(|| record.conflict_reason.clone()),
        replay_hint,
        result: record.result.clone(),
        journal: record.journal.clone(),
    }))
}

async fn complete_key(
    State(state): State<AppState>,
    Json(payload): Json<CompleteRequest>,
) -> Result<Json<CompleteResponse>, AppError> {
    let mut store = state.store.write();
    let record = store
        .get_mut(&payload.idempotency_key)
        .ok_or(AppError::NotFound)?;

    if record.tenant != payload.tenant
        || record.action != payload.action
        || record.resource != payload.resource
    {
        return Err(AppError::Conflict("scope does not match issued key".into()));
    }

    if Utc::now() > record.expires_at {
        record.status = RecordStatus::Expired;
        record.conflict_reason = Some("key expired before completion".into());
        record.journal.push(JournalEntry::new(
            JournalEvent::Expired,
            payload.participant.clone(),
            payload
                .note
                .clone()
                .or_else(|| Some("Completion attempted after expiration".into())),
            None,
            record.dedupe_count,
            None,
        ));
        return Err(AppError::Conflict("key expired before completion".into()));
    }

    record.last_seen = Utc::now();
    record.status = if payload.success {
        RecordStatus::Completed
    } else {
        RecordStatus::Failed
    };
    record.result = payload.result.clone();
    let event = if payload.success {
        JournalEvent::Completed
    } else {
        JournalEvent::Failed
    };
    record.journal.push(JournalEntry::new(
        event,
        payload.participant.clone(),
        payload.note.clone(),
        None,
        record.dedupe_count,
        payload.result.clone(),
    ));

    Ok(Json(CompleteResponse {
        status: record.status.clone(),
        result: record.result.clone(),
        journal: record.journal.clone(),
    }))
}

async fn get_key(
    Path(id): Path<String>,
    State(state): State<AppState>,
) -> Result<Json<RecordView>, AppError> {
    let key = Uuid::parse_str(&id).map_err(|err| AppError::Validation(err.to_string()))?;
    let store = state.store.read();
    let record = store.get(&key).ok_or(AppError::NotFound)?;

    Ok(Json(RecordView {
        status: record.status.clone(),
        tenant: record.tenant.clone(),
        action: record.action.clone(),
        resource: record.resource.clone(),
        fingerprint: record.fingerprint.clone(),
        dedupe_count: record.dedupe_count,
        created_at: record.created_at,
        last_seen: record.last_seen,
        expires_at: record.expires_at,
        conflict_reason: record.conflict_reason.clone(),
        result: record.result.clone(),
        journal: record.journal.clone(),
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use once_cell::sync::Lazy;
    use rand::{seq::SliceRandom, SeedableRng};
    use rand_chacha::ChaCha20Rng;

    static PARTICIPANTS: Lazy<Vec<&'static str>> =
        Lazy::new(|| vec!["api", "worker", "billing", "audit"]);

    fn test_state() -> AppState {
        AppState::new()
    }

    #[tokio::test]
    async fn deterministic_chaos_simulation() {
        let state = test_state();
        let tenant = "acme".to_string();
        let action = "charge".to_string();
        let resource = "invoice-42".to_string();
        let issue_body = IssueRequest {
            tenant: tenant.clone(),
            action: action.clone(),
            resource: resource.clone(),
            ttl_seconds: 60,
            issued_by: Some("tests".into()),
            metadata: None,
        };

        let response = issue_key(State(state.clone()), Json(issue_body))
            .await
            .unwrap();
        let key = response.idempotency_key;
        let mut rng = ChaCha20Rng::seed_from_u64(42);
        let mut fingerprints = vec![
            "req-A".to_string(),
            "req-A".to_string(),
            "req-A".to_string(),
            "req-B".to_string(),
        ];
        fingerprints.shuffle(&mut rng);

        for fingerprint in fingerprints {
            let participant = PARTICIPANTS.choose(&mut rng).unwrap().to_string();
            let verify = VerifyRequest {
                tenant: tenant.clone(),
                action: action.clone(),
                resource: resource.clone(),
                idempotency_key: key,
                fingerprint: Some(fingerprint.clone()),
                participant: Some(participant.clone()),
                dedupe_token: Some(format!("attempt from {}", participant)),
            };

            let response = verify_key(State(state.clone()), Json(verify))
                .await
                .unwrap();
            if response.status == VerificationStatus::Conflict {
                assert!(response
                    .conflict_reason
                    .as_ref()
                    .unwrap()
                    .contains("fingerprint mismatch"));
            }
        }

        let complete_req = CompleteRequest {
            tenant,
            action,
            resource,
            idempotency_key: key,
            participant: Some("worker".into()),
            success: true,
            result: Some(serde_json::json!({ "status": "ok" })),
            note: Some("completed during chaos".into()),
        };

        let completed = complete_key(State(state.clone()), Json(complete_req))
            .await
            .unwrap();
        assert_eq!(completed.status, RecordStatus::Completed);
        assert_eq!(completed.result.as_ref().unwrap()["status"], "ok");

        let view = get_key(Path(key.to_string()), State(state.clone()))
            .await
            .unwrap();
        assert!(view.dedupe_count >= 1);
        assert!(!view.journal.is_empty());
    }
}
