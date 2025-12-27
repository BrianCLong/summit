use crate::load_balancing::CircuitState;

#[derive(Debug, Clone)]
pub struct DegradedMode {
    pub reason: String,
}

#[derive(Debug, Clone)]
pub struct RetryPolicy {
    pub max_retries: u32,
    pub backoff_ms: u64,
}

#[async_trait::async_trait]
pub trait ResilientFeature {
    async fn graceful_degradation(&self) -> Result<(), DegradedMode>;
    async fn circuit_breaker_state(&self) -> CircuitState;
    async fn retry_with_backoff(&self) -> RetryPolicy;
}
