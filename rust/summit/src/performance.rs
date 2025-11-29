pub struct BenchmarkScenario {
    pub name: String,
    pub duration_ms: u64,
}

pub struct PerformanceMetric {
    pub name: String,
    pub value: f64,
    pub unit: String,
}

pub trait Benchmarkable {
    fn benchmark_scenarios() -> Vec<BenchmarkScenario>;
    fn performance_metrics() -> Vec<PerformanceMetric>;
}
