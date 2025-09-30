use crate::capability::SiloId;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TraceEvent {
    pub policy_id: String,
    pub silo: Option<SiloId>,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ComplianceTrace {
    pub events: Vec<TraceEvent>,
}

impl ComplianceTrace {
    pub fn new() -> Self {
        Self { events: Vec::new() }
    }

    pub fn record(&mut self, policy_id: impl Into<String>, silo: Option<SiloId>, message: impl Into<String>) {
        self.events.push(TraceEvent {
            policy_id: policy_id.into(),
            silo,
            message: message.into(),
        });
    }

    pub fn extend(&mut self, other: ComplianceTrace) {
        self.events.extend(other.events);
    }
}
