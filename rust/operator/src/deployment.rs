pub struct TrafficSplit {
    pub primary_weight: u32,
    pub canary_weight: u32,
}

pub struct MetricsAnalyzer;

pub struct RollbackCondition {
    pub error_rate_threshold: f64,
}

pub struct CanaryDeployer {
    pub traffic_split: TrafficSplit,
    pub metrics_analysis: MetricsAnalyzer,
    pub rollback_trigger: RollbackCondition,
}
