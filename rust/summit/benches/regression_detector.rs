pub struct BenchmarkHistory;
pub struct RegressionThresholds;
pub struct AlertRule;

pub struct RegressionDetector {
    pub historical_data: BenchmarkHistory,
    pub thresholds: RegressionThresholds,
    pub alert_rules: Vec<AlertRule>,
}
