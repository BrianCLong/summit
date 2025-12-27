use serde::{Deserialize, Serialize};
use validator::Validate;
use std::time::Duration;

#[derive(Serialize, Deserialize, Validate, Clone, Debug)]
pub struct LoadBalancingConfig {
    pub strategy: String,
}

#[derive(Debug, Clone)]
pub enum LoadBalancingStrategy {
    RoundRobin,
    Random,
    LeastLoaded,
}

#[derive(Debug, Clone)]
pub struct Endpoint {
    pub url: String,
}

#[derive(Debug, Clone)]
pub enum CircuitState {
    Closed,
    Open,
    HalfOpen,
}

#[derive(Debug, Clone)]
pub struct LoadBalancerTrace {
    pub strategy_used: LoadBalancingStrategy,
    pub endpoint_selected: Endpoint,
    pub decision_latency: Duration,
    pub circuit_breaker_state: CircuitState,
}
