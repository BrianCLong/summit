use std::collections::HashMap;

#[derive(Debug, Clone)]
pub enum HealthStatus {
    Healthy,
    Degraded,
    Unhealthy,
}

pub struct HealthCheck {
    pub name: String,
    pub status: HealthStatus,
}

pub struct DependencyGraph {
    pub nodes: HashMap<String, HealthCheck>,
    pub edges: HashMap<String, Vec<String>>, // dependencies
}
