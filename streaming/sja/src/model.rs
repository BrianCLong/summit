use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct JoinEvent {
    pub timestamp: DateTime<Utc>,
    pub join_id: String,
    pub left_stream: String,
    pub right_stream: String,
    pub left_tenant: String,
    pub right_tenant: String,
    pub left_count: u64,
    pub right_count: u64,
    pub output_count: u64,
    pub join_keys: Vec<String>,
    pub quasi_ids_left: Vec<String>,
    pub quasi_ids_right: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub enum AlertType {
    CardinalitySpike,
    QuasiIdOverlap,
    CrossTenantKey,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub enum AlertSeverity {
    Info,
    Warning,
    Critical,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct Alert {
    pub alert_type: AlertType,
    pub severity: AlertSeverity,
    pub message: String,
    pub join_id: String,
    pub timestamp: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct AlertEnvelope {
    pub alert: Alert,
    pub digest: crate::JoinProofDigest,
}
