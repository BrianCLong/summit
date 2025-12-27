use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Serialize, Deserialize, Validate, Clone, Debug)]
pub struct StorageConfig {
    pub backend: String,
    pub connection_string: String,
}

#[derive(Debug, Clone)]
pub enum HealthStatus {
    Healthy,
    Degraded,
    Unhealthy,
}

#[derive(Debug, Clone)]
pub struct StorageMetrics {
    pub available_space: u64,
    pub latency_ms: f64,
}

#[async_trait::async_trait]
pub trait StorageHealth {
    async fn health_check(&self) -> HealthStatus;
    async fn storage_metrics(&self) -> StorageMetrics;
}
