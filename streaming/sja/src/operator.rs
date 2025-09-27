use crate::{
    audit::AuditLog, Alert, AlertEnvelope, AlertSeverity, AlertType, JoinEvent, JoinProofDigest,
};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Clone, Debug)]
pub struct SjaConfig {
    pub cardinality_spike_ratio: f64,
    pub min_baseline_samples: usize,
    pub baseline_smoothing: f64,
    pub quasi_id_overlap_ratio: f64,
    pub cross_tenant_blocklist: Option<Vec<(String, String)>>,
    pub bloom_capacity: usize,
    pub bloom_false_positive_rate: f64,
    pub hll_precision: u8,
}

impl Default for SjaConfig {
    fn default() -> Self {
        Self {
            cardinality_spike_ratio: 2.5,
            min_baseline_samples: 3,
            baseline_smoothing: 0.6,
            quasi_id_overlap_ratio: 0.35,
            cross_tenant_blocklist: None,
            bloom_capacity: 1024,
            bloom_false_positive_rate: 0.01,
            hll_precision: 10,
        }
    }
}

#[derive(Default)]
struct Baseline {
    ema: f64,
    samples: usize,
}

pub struct SjaOperator {
    config: SjaConfig,
    baselines: HashMap<String, Baseline>,
    audit_log: Arc<Mutex<AuditLog>>,
}

impl SjaOperator {
    pub fn new(config: SjaConfig) -> Self {
        Self::with_audit(config, Arc::new(Mutex::new(AuditLog::default())))
    }

    pub fn with_audit(config: SjaConfig, audit_log: Arc<Mutex<AuditLog>>) -> Self {
        Self {
            config,
            baselines: HashMap::new(),
            audit_log,
        }
    }

    pub fn audit_log(&self) -> Arc<Mutex<AuditLog>> {
        self.audit_log.clone()
    }

    pub fn process_event(&mut self, event: JoinEvent) -> Vec<AlertEnvelope> {
        if let Ok(mut audit) = self.audit_log.try_lock() {
            audit.push_event(event.clone());
        }
        let mut alerts = Vec::new();
        let digest = self.build_digest(&event);

        if self.is_cardinality_spike(&event) {
            alerts.push(self.make_alert(
                AlertType::CardinalitySpike,
                AlertSeverity::Critical,
                format!(
                    "Join output {} exceeded baseline by ratio {:.2}",
                    event.output_count,
                    self.cardinality_ratio(&event)
                ),
                &event,
                &digest,
            ));
        }

        if self.is_quasi_id_overlap(&event) {
            alerts.push(self.make_alert(
                AlertType::QuasiIdOverlap,
                AlertSeverity::Warning,
                "Significant quasi-identifier overlap detected".to_string(),
                &event,
                &digest,
            ));
        }

        if self.is_cross_tenant_violation(&event) {
            alerts.push(self.make_alert(
                AlertType::CrossTenantKey,
                AlertSeverity::Critical,
                format!(
                    "Cross-tenant join between {} and {} rejected",
                    event.left_tenant, event.right_tenant
                ),
                &event,
                &digest,
            ));
        }

        self.update_baseline(&event);

        if let Ok(mut audit) = self.audit_log.try_lock() {
            for alert in &alerts {
                audit.push_alert(alert.clone());
            }
        }

        alerts
    }

    fn build_digest(&self, event: &JoinEvent) -> JoinProofDigest {
        let mut digest = JoinProofDigest::new(
            self.config.hll_precision,
            self.config.bloom_capacity,
            self.config.bloom_false_positive_rate,
        );
        digest.ingest(&event.join_keys);
        digest
    }

    fn make_alert(
        &self,
        alert_type: AlertType,
        severity: AlertSeverity,
        message: String,
        event: &JoinEvent,
        digest: &JoinProofDigest,
    ) -> AlertEnvelope {
        let alert = Alert {
            alert_type,
            severity,
            message,
            join_id: event.join_id.clone(),
            timestamp: event.timestamp,
        };
        AlertEnvelope {
            alert,
            digest: digest.clone(),
        }
    }

    fn is_cardinality_spike(&self, event: &JoinEvent) -> bool {
        if let Some(baseline) = self.baselines.get(&event.join_id) {
            if baseline.samples >= self.config.min_baseline_samples {
                return self.cardinality_ratio(event) >= self.config.cardinality_spike_ratio;
            }
        }
        false
    }

    fn cardinality_ratio(&self, event: &JoinEvent) -> f64 {
        let baseline = self
            .baselines
            .get(&event.join_id)
            .map(|b| b.ema)
            .unwrap_or(event.output_count as f64);
        if baseline == 0.0 {
            return f64::INFINITY;
        }
        event.output_count as f64 / baseline
    }

    fn is_quasi_id_overlap(&self, event: &JoinEvent) -> bool {
        if event.quasi_ids_left.is_empty() || event.quasi_ids_right.is_empty() {
            return false;
        }
        let left: std::collections::HashSet<_> = event.quasi_ids_left.iter().collect();
        let right: std::collections::HashSet<_> = event.quasi_ids_right.iter().collect();
        let intersection = left.intersection(&right).count() as f64;
        let denom = left.len().min(right.len()) as f64;
        if denom == 0.0 {
            return false;
        }
        (intersection / denom) >= self.config.quasi_id_overlap_ratio
    }

    fn is_cross_tenant_violation(&self, event: &JoinEvent) -> bool {
        if event.left_tenant == event.right_tenant {
            return false;
        }
        match &self.config.cross_tenant_blocklist {
            Some(blocked) => blocked.iter().any(|(l, r)| {
                (l == &event.left_tenant && r == &event.right_tenant)
                    || (l == &event.right_tenant && r == &event.left_tenant)
            }),
            None => true,
        }
    }

    fn update_baseline(&mut self, event: &JoinEvent) {
        let baseline = self
            .baselines
            .entry(event.join_id.clone())
            .or_insert_with(Baseline::default);
        if baseline.samples == 0 {
            baseline.ema = event.output_count as f64;
        } else {
            baseline.ema = self.config.baseline_smoothing * event.output_count as f64
                + (1.0 - self.config.baseline_smoothing) * baseline.ema;
        }
        baseline.samples += 1;
    }
}
