pub struct MetricsClient;

pub struct ScalingPolicy {
    pub min_replicas: u32,
    pub max_replicas: u32,
    pub target_cpu_utilization: u32,
}

pub struct SummitAutoscaler {
    pub metrics_client: MetricsClient,
    pub scaling_policies: Vec<ScalingPolicy>,
}
