use crate::{JoinEvent, SjaConfig, SjaOperator};
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Clone, Debug, PartialEq)]
pub enum AuditEntry {
    Event(JoinEvent),
    Alert(crate::AlertEnvelope),
}

#[derive(Debug, Default)]
pub struct AuditLog {
    entries: Vec<AuditEntry>,
}

impl AuditLog {
    pub fn new() -> Self {
        Self {
            entries: Vec::new(),
        }
    }

    pub fn push_event(&mut self, event: JoinEvent) {
        self.entries.push(AuditEntry::Event(event));
    }

    pub fn push_alert(&mut self, alert: crate::AlertEnvelope) {
        self.entries.push(AuditEntry::Alert(alert));
    }

    pub fn entries(&self) -> &[AuditEntry] {
        &self.entries
    }

    pub fn recorded_alerts(&self) -> Vec<crate::AlertEnvelope> {
        self.entries
            .iter()
            .filter_map(|entry| match entry {
                AuditEntry::Alert(alert) => Some(alert.clone()),
                _ => None,
            })
            .collect()
    }

    pub fn replay(&self, config: SjaConfig) -> Vec<crate::AlertEnvelope> {
        let audit = Arc::new(Mutex::new(AuditLog::default()));
        let mut operator = SjaOperator::with_audit(config, audit);
        let mut replayed = Vec::new();
        for entry in &self.entries {
            if let AuditEntry::Event(event) = entry {
                let alerts = operator.process_event(event.clone());
                replayed.extend(alerts);
            }
        }
        replayed
    }
}

impl Clone for AuditLog {
    fn clone(&self) -> Self {
        Self {
            entries: self.entries.clone(),
        }
    }
}
