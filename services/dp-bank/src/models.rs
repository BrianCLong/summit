use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use serde_with::serde_as;

pub type TenantId = String;
pub type ProjectId = String;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RegisterKeyRequest {
    pub key_id: String,
    /// Base64 encoded Ed25519 public key bytes.
    pub public_key: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct GrantPayload {
    pub tenant_id: TenantId,
    pub project_id: ProjectId,
    pub key_id: String,
    pub epsilon: f64,
    pub delta: f64,
    pub nonce: String,
    #[serde(with = "chrono::serde::ts_seconds")]
    pub issued_at: DateTime<Utc>,
}

#[serde_as]
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct SignedGrant {
    pub payload: GrantPayload,
    #[serde_as(as = "serde_with::base64::Base64")]
    pub signature: Vec<u8>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SpendRequest {
    pub epsilon: f64,
    pub delta: f64,
    #[serde(default)]
    pub query_id: Option<String>,
    #[serde(default)]
    pub note: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct BudgetAccountSummary {
    pub tenant_id: TenantId,
    pub project_id: ProjectId,
    pub allocated_epsilon: f64,
    pub allocated_delta: f64,
    pub spent_epsilon: f64,
    pub spent_delta: f64,
    pub remaining_epsilon: f64,
    pub remaining_delta: f64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DpStep {
    pub epsilon: f64,
    pub delta: f64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AdvancedCompositionRequest {
    pub steps: Vec<DpStep>,
    pub delta_prime: f64,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct AdvancedCompositionResponse {
    pub epsilon: f64,
    pub delta: f64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ZcdpCompositionRequest {
    pub rhos: Vec<f64>,
    pub delta: f64,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct ZcdpCompositionResponse {
    pub epsilon: f64,
    pub delta: f64,
    pub rho: f64,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct QuerySpec {
    pub name: String,
    pub sensitivity: f64,
    pub target_error: f64,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct PlannerRequest {
    #[serde(default)]
    pub total_budget: Option<f64>,
    pub queries: Vec<QuerySpec>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct QueryAllocation {
    pub name: String,
    pub epsilon: f64,
    pub achieved_error: f64,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct PlannerResponse {
    pub allocations: Vec<QueryAllocation>,
    pub total_epsilon: f64,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AuditAction {
    RegisterKey,
    GrantApplied,
    SpendRecorded,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct AuditEvent {
    #[serde(with = "chrono::serde::ts_seconds")]
    pub timestamp: DateTime<Utc>,
    pub tenant_id: TenantId,
    #[serde(default)]
    pub project_id: Option<ProjectId>,
    pub action: AuditAction,
    #[serde(default)]
    pub details: Value,
}

impl AuditEvent {
    pub fn new(
        tenant_id: TenantId,
        project_id: Option<ProjectId>,
        action: AuditAction,
        details: Value,
    ) -> Self {
        Self {
            timestamp: Utc::now(),
            tenant_id,
            project_id,
            action,
            details,
        }
    }
}
