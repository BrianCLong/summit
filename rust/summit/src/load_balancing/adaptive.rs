pub trait LoadBalancingStrategy: Send + Sync {
    fn select_endpoint(&self) -> String;
}

pub struct MetricsCollector;

pub enum StrategyType {
    RoundRobin,
    LeastConnections,
    Random,
}

pub struct AdaptiveLoadBalancer {
    pub strategies: Vec<Box<dyn LoadBalancingStrategy>>,
    pub metrics_collector: MetricsCollector,
    pub current_strategy: StrategyType,
}
