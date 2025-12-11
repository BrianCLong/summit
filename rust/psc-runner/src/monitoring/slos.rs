use std::time::Duration;

#[allow(dead_code)]
pub struct ProductionSLOs {
    // Availability
    pub uptime: f64,                    // > 99.9%
    pub error_rate: f64,                // < 0.1%

    // Performance
    pub api_response_p99: Duration,     // < 100ms
    pub config_reload_time: Duration,   // < 500ms
    pub message_processing_p99: Duration, // < 50ms

    // Capacity
    pub max_connections: u32,           // < 10,000
    pub memory_utilization: f64,        // < 80%
    pub cpu_utilization: f64,           // < 70%
}
