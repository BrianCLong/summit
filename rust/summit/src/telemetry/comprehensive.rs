use std::time::{Duration, Instant};
use prometheus::{Counter, Gauge, Histogram};
use sysinfo::{System, Networks};
use std::sync::{Arc, Mutex};

#[derive(Default, Clone)]
pub struct MessageProcessingCounters {
    pub total_messages: u64,
    pub bytes_processed: u64,
}

#[derive(Default)]
pub struct DetailedCounters {
    pub message_stats: Arc<Mutex<MessageProcessingCounters>>,
}

impl DetailedCounters {
    pub fn record_message_processing(&self, size: usize, _duration: Duration) {
        let mut stats = self.message_stats.lock().unwrap();
        stats.total_messages += 1;
        stats.bytes_processed += size as u64;
    }
}

#[derive(Debug, Clone)]
pub struct SystemState {
    pub cpu_usage: f32,
    pub memory_used: u64,
    pub memory_total: u64,
    pub process_count: usize,
}

pub struct StateCaptureEngine {
    sys: Arc<Mutex<System>>,
}

impl StateCaptureEngine {
    pub fn new() -> Self {
        Self {
            sys: Arc::new(Mutex::new(System::new_all())),
        }
    }

    pub fn capture_system_state(&self) -> SystemState {
        let mut sys = self.sys.lock().unwrap();
        sys.refresh_all();

        SystemState {
            cpu_usage: sys.global_cpu_info().cpu_usage(),
            memory_used: sys.used_memory(),
            memory_total: sys.total_memory(),
            process_count: sys.processes().len(),
        }
    }
}

pub struct DiagnosticSnapshot {
    pub timestamp: Instant,
    pub system_state: SystemState,
    pub performance_counters: MessageProcessingCounters, // Snapshot of counters
}

pub struct AnomalyDetectionEngine {
    // Simple Z-score based detection for CPU
    cpu_history: Vec<f32>,
}

impl AnomalyDetectionEngine {
    pub fn new() -> Self {
        Self { cpu_history: Vec::new() }
    }

    pub fn detect_anomalies(&mut self, state: &SystemState) -> Vec<String> {
        let mut anomalies = Vec::new();
        self.cpu_history.push(state.cpu_usage);
        if self.cpu_history.len() > 20 {
            self.cpu_history.remove(0);
        }

        if self.cpu_history.len() >= 10 {
            let sum: f32 = self.cpu_history.iter().sum();
            let mean = sum / self.cpu_history.len() as f32;
            let variance: f32 = self.cpu_history.iter().map(|v| (v - mean).powi(2)).sum();
            let std_dev = (variance / self.cpu_history.len() as f32).sqrt();

            if (state.cpu_usage - mean).abs() > std_dev * 3.0 {
                anomalies.push(format!("CPU Anomaly: {:.2}% (mean {:.2}%)", state.cpu_usage, mean));
            }
        }

        anomalies
    }
}

// 2. Automated diagnostic snapshots
pub struct DiagnosticSnapshotter {
    pub state_capture: StateCaptureEngine,
    pub counters: Arc<DetailedCounters>,
    pub anomaly_detector: Arc<Mutex<AnomalyDetectionEngine>>,
}

impl DiagnosticSnapshotter {
    pub fn new(counters: Arc<DetailedCounters>) -> Self {
        Self {
            state_capture: StateCaptureEngine::new(),
            counters,
            anomaly_detector: Arc::new(Mutex::new(AnomalyDetectionEngine::new())),
        }
    }

    pub async fn capture_diagnostic_snapshot(&self) -> DiagnosticSnapshot {
        let system_state = self.state_capture.capture_system_state();
        let counter_snapshot = self.counters.message_stats.lock().unwrap().clone();

        let snapshot = DiagnosticSnapshot {
            timestamp: Instant::now(),
            system_state: system_state.clone(),
            performance_counters: counter_snapshot,
        };

        // Analyze
        let mut detector = self.anomaly_detector.lock().unwrap();
        let issues = detector.detect_anomalies(&system_state);
        if !issues.is_empty() {
            println!("Diagnostic Issues Found: {:?}", issues);
        }

        snapshot
    }
}

pub struct ComprehensiveTelemetry {
    pub counters: Arc<DetailedCounters>,
    pub snapshotter: DiagnosticSnapshotter,
}

impl ComprehensiveTelemetry {
    pub fn new() -> Self {
        let counters = Arc::new(DetailedCounters::default());
        Self {
            counters: counters.clone(),
            snapshotter: DiagnosticSnapshotter::new(counters),
        }
    }
}
