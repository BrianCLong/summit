use crate::models::{AuditAction, AuditEvent};
use csv::Writer;
use serde_json::Value;
use std::fmt::Display;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AuditExportError {
    #[error("failed to render CSV: {0}")]
    Csv(#[from] csv::Error),
    #[error("failed to render UTF-8: {0}")]
    Utf8(#[from] std::string::FromUtf8Error),
    #[error("failed to serialize JSON: {0}")]
    Json(#[from] serde_json::Error),
}

impl Display for AuditAction {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let value = match self {
            AuditAction::RegisterKey => "register_key",
            AuditAction::GrantApplied => "grant_applied",
            AuditAction::SpendRecorded => "spend_recorded",
        };
        f.write_str(value)
    }
}

pub fn export_audit_csv(events: &[AuditEvent]) -> Result<String, AuditExportError> {
    let mut writer = Writer::from_writer(vec![]);
    writer.write_record(["timestamp", "tenant_id", "project_id", "action", "details"])?;
    for event in events {
        let details = serde_json::to_string(&event.details)?;
        writer.write_record([
            event.timestamp.to_rfc3339(),
            event.tenant_id.clone(),
            event.project_id.clone().unwrap_or_default(),
            event.action.to_string(),
            details,
        ])?;
    }
    let bytes = writer
        .into_inner()
        .map_err(|err| AuditExportError::Csv(csv::Error::from(err.into_error())))?;
    Ok(String::from_utf8(bytes)?)
}

pub fn export_audit_json(events: &[AuditEvent]) -> Result<String, AuditExportError> {
    let json = serde_json::to_string_pretty(events)?;
    Ok(json)
}

pub fn export_audit_json_value(events: &[AuditEvent]) -> Value {
    serde_json::to_value(events).unwrap_or(Value::Null)
}
