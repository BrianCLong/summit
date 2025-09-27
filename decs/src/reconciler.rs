use crate::model::AccessEvent;
use crate::scheduler::{ScheduleEntry, SignedSchedule, detect_breaches};
use chrono::{DateTime, Utc};
use itertools::Itertools;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct BreachFinding {
    pub event: AccessEvent,
    #[serde(with = "chrono::serde::ts_seconds")]
    pub gate_open_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ReconciliationReport {
    pub schedule_signature: String,
    pub evaluated_events: usize,
    pub breaches: Vec<BreachFinding>,
    pub zero_breach_proof: bool,
    pub proof_token: String,
}

pub struct Reconciler {
    schedule: SignedSchedule,
}

impl Reconciler {
    pub fn new(schedule: SignedSchedule) -> Self {
        Self { schedule }
    }

    pub fn schedule(&self) -> &SignedSchedule {
        &self.schedule
    }

    pub fn reconcile(&self, events: &[AccessEvent]) -> ReconciliationReport {
        let breaches = detect_breaches(&self.schedule, events)
            .into_iter()
            .filter_map(|event| match self.find_entry(&event) {
                Some(entry) => Some(BreachFinding {
                    gate_open_at: gate_for_event(entry, &event),
                    event,
                }),
                None => None,
            })
            .sorted_by(|a, b| {
                (
                    a.event.dataset.as_str(),
                    a.event.region.as_str(),
                    a.event.occurred_at,
                )
                    .cmp(&(
                        b.event.dataset.as_str(),
                        b.event.region.as_str(),
                        b.event.occurred_at,
                    ))
            })
            .collect::<Vec<_>>();

        let zero_breach_proof = breaches.is_empty();
        let proof_token = proof_token(&self.schedule.signature, events.len(), zero_breach_proof);

        ReconciliationReport {
            schedule_signature: self.schedule.signature.clone(),
            evaluated_events: events.len(),
            breaches,
            zero_breach_proof,
            proof_token,
        }
    }

    fn find_entry(&self, event: &AccessEvent) -> Option<&ScheduleEntry> {
        self.schedule
            .entries
            .iter()
            .find(|entry| entry.dataset == event.dataset && entry.region == event.region)
    }
}

fn gate_for_event(entry: &ScheduleEntry, event: &AccessEvent) -> DateTime<Utc> {
    match event.channel {
        crate::model::AccessChannel::Storage => entry.storage_gate.open_at,
        crate::model::AccessChannel::Api => entry.api_gate.open_at,
    }
}

fn proof_token(signature: &str, event_count: usize, zero_breach: bool) -> String {
    let mut hasher = Sha256::new();
    hasher.update(signature.as_bytes());
    hasher.update(event_count.to_le_bytes());
    hasher.update([zero_breach as u8]);
    format!("{:x}", hasher.finalize())
}
