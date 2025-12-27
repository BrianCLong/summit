use std::time::Duration;

#[derive(Debug, Clone)]
pub struct PerformanceBaseline {
    pub throughput: f64,    // ops/sec
    pub latency_p99: f64,   // milliseconds
    pub memory_usage: f64,  // megabytes
    pub cpu_utilization: f64, // percentage
}

#[derive(Debug, Clone)]
pub struct OperationalMetrics {
    pub error_rate: f64,           // < 0.1%
    pub p99_latency: Duration,     // < defined SLO
    pub throughput: f64,           // > defined threshold
    pub resource_utilization: f64, // < 80%
}

impl OperationalMetrics {
    pub fn config_reload_time() -> Duration { Duration::from_millis(100) }
    pub fn trace_sampling_overhead() -> f64 { 0.01 } // 1%
    pub fn serialization_throughput() -> f64 { 10_000.0 } // ops/sec
    pub fn storage_operation_p99() -> Duration { Duration::from_millis(5) }
    pub fn health_check_timeout() -> Duration { Duration::from_secs(2) }
    pub fn load_balancer_decision_time() -> Duration { Duration::from_micros(100) }
    pub fn operator_reconciliation_interval() -> Duration { Duration::from_secs(30) }
}
