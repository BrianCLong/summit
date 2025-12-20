pub struct Workload {
    pub name: String,
    pub operations: usize,
    pub read_ratio: f64,
}

pub struct BenchmarkMetrics {
    pub ops_per_sec: f64,
    pub latency_p99: f64,
}

pub struct StorageBenchmark {
    pub workloads: Vec<Workload>,
    pub metrics: BenchmarkMetrics,
}
