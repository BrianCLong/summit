use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct EmbargoPolicy {
    pub dataset: String,
    #[serde(default)]
    pub dataset_version: Option<String>,
    #[serde(default)]
    pub regions: Vec<RegionPolicy>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RegionPolicy {
    pub region: String,
    #[serde(with = "humantime_serde")]
    pub embargo: Duration,
    #[serde(with = "humantime_serde")]
    pub cooling_off: Duration,
    #[serde(default)]
    pub exceptions: Vec<ExceptionRule>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ExceptionRule {
    pub principal: String,
    #[serde(with = "chrono::serde::ts_seconds")]
    pub allow_after: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DatasetIngest {
    pub dataset: String,
    #[serde(with = "chrono::serde::ts_seconds")]
    pub ingested_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AccessChannel {
    Storage,
    Api,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AccessEvent {
    pub dataset: String,
    pub region: String,
    pub principal: String,
    #[serde(with = "chrono::serde::ts_seconds")]
    pub occurred_at: DateTime<Utc>,
    pub channel: AccessChannel,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct BackfillRequest {
    pub dataset: String,
    pub region: String,
    #[serde(with = "chrono::serde::ts_seconds")]
    pub requested_at: DateTime<Utc>,
    pub channel: AccessChannel,
}
