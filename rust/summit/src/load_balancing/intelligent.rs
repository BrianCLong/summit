use dashmap::DashMap;
use uuid::Uuid;
use std::sync::Arc;
use tokio::sync::RwLock;

pub type NodeId = Uuid;
pub type ServiceId = Uuid;

#[derive(Debug, Clone)]
pub struct NodeMetrics {
    pub cpu_load: f64, // 0.0 - 1.0
    pub memory_load: f64, // 0.0 - 1.0
    pub operational_cost: f64, // Normalized cost factor
    pub active_connections: u32,
}

impl NodeMetrics {
    pub fn can_host_service(&self, _service: &ServiceId) -> bool {
        self.cpu_load < 0.9 && self.memory_load < 0.9
    }

    pub fn composite_load_score(&self) -> f64 {
        (self.cpu_load * 0.4) + (self.memory_load * 0.4) + ((self.active_connections as f64 / 10000.0) * 0.2)
    }
}

pub struct ServiceMetrics {
    pub request_rate: f64,
    pub latency_p95: f64,
}

pub struct NetworkMetricsCollector {
    // Map (Node1, Node2) -> Latency
    latencies: Arc<DashMap<(NodeId, NodeId), f64>>,
}

impl NetworkMetricsCollector {
    pub fn new() -> Self {
        Self { latencies: Arc::new(DashMap::new()) }
    }

    pub fn latency_to_node(&self, node: &NodeId) -> f64 {
        // In reality we measure from "self" (where lb is running) or aggregate
        // For simulation, return a default or looked up value
        10.0 // ms
    }
}

// 1. Real-time metrics-based routing
pub struct RealTimeMetricsCollector {
    pub node_metrics: Arc<DashMap<NodeId, NodeMetrics>>,
    pub service_metrics: Arc<DashMap<ServiceId, ServiceMetrics>>,
    pub network_metrics: Arc<NetworkMetricsCollector>,
}

impl RealTimeMetricsCollector {
    pub fn new() -> Self {
        Self {
            node_metrics: Arc::new(DashMap::new()),
            service_metrics: Arc::new(DashMap::new()),
            network_metrics: Arc::new(NetworkMetricsCollector::new()),
        }
    }

    pub fn get_optimal_node_for_service(&self, service: ServiceId) -> Option<NodeId> {
        if !self.service_metrics.contains_key(&service) {
            // New service or unknown, pick any capable node
            // Fallthrough to selection logic with default service metrics
        }

        self.node_metrics.iter()
            .filter(|node| node.value().can_host_service(&service))
            .min_by(|a, b| {
                let score_a = self.calculate_score(a.key(), a.value());
                let score_b = self.calculate_score(b.key(), b.value());
                score_a.partial_cmp(&score_b).unwrap_or(std::cmp::Ordering::Equal)
            })
            .map(|node| *node.key())
    }

    fn calculate_score(&self, node_id: &NodeId, metrics: &NodeMetrics) -> f64 {
        let load = metrics.composite_load_score();
        let latency = self.network_metrics.latency_to_node(node_id) / 100.0; // Normalize 100ms = 1.0
        let cost = metrics.operational_cost;

        // Weights
        (load * 0.5) + (latency * 0.3) + (cost * 0.2)
    }
}

// Predictive Analytics
pub struct TimeSeriesAnalyzer {
    // Stores history of request rates
    history: Arc<RwLock<HashMap<ServiceId, Vec<f64>>>>,
}

use std::collections::HashMap;

impl TimeSeriesAnalyzer {
    pub fn new() -> Self {
        Self { history: Arc::new(RwLock::new(HashMap::new())) }
    }

    pub async fn analyze_patterns(&self, service: ServiceId) -> Option<Vec<f64>> {
        let history = self.history.read().await;
        history.get(&service).cloned()
    }

    pub async fn record_metric(&self, service: ServiceId, value: f64) {
        let mut history = self.history.write().await;
        let vec = history.entry(service).or_default();
        vec.push(value);
        if vec.len() > 100 {
            vec.remove(0);
        }
    }
}

pub struct CapacityPlanner {}

impl CapacityPlanner {
    pub fn predict_peak(&self, patterns: &[f64]) -> f64 {
        // Simple linear regression or moving average + padding
        if patterns.is_empty() { return 0.0; }
        let avg: f64 = patterns.iter().sum::<f64>() / patterns.len() as f64;
        let max = patterns.iter().cloned().fold(0.0, f64::max);

        // Conservative prediction: Max of recent history * 1.2
        max * 1.2
    }

    pub fn recommend_scaling_strategy(&self, predicted_peak: f64, current_capacity: f64) -> String {
        if predicted_peak > current_capacity * 0.8 {
            "scale_out".to_string()
        } else if predicted_peak < current_capacity * 0.4 {
            "scale_in".to_string()
        } else {
            "maintain".to_string()
        }
    }
}

pub struct TrafficPrediction {
    pub expected_peak: f64,
    pub recommended_scaling: String,
    pub confidence_interval: f64,
}

// 2. Predictive load distribution
pub struct PredictiveAnalyzer {
    pub time_series_analyzer: TimeSeriesAnalyzer,
    pub capacity_planner: CapacityPlanner,
}

impl PredictiveAnalyzer {
    pub fn new() -> Self {
        Self {
            time_series_analyzer: TimeSeriesAnalyzer::new(),
            capacity_planner: CapacityPlanner{},
        }
    }

    pub async fn predict_traffic_spike(&self, service: ServiceId, current_capacity: f64) -> Option<TrafficPrediction> {
        let history = self.time_series_analyzer.analyze_patterns(service).await?;

        let expected_peak = self.capacity_planner.predict_peak(&history);
        let scaling = self.capacity_planner.recommend_scaling_strategy(expected_peak, current_capacity);

        Some(TrafficPrediction {
            expected_peak,
            recommended_scaling: scaling,
            confidence_interval: 0.90, // Static confidence for this simple model
        })
    }
}

pub struct IntelligentLoadBalancer {
    pub real_time_metrics: RealTimeMetricsCollector,
    pub predictive_analyzer: PredictiveAnalyzer,
}
