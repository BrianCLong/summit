use crate::model::{
    AccessChannel, BackfillRequest, DatasetIngest, EmbargoPolicy, ExceptionRule, RegionPolicy,
};
use chrono::{DateTime, Duration as ChronoDuration, Utc};
use itertools::Itertools;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum SchedulerError {
    #[error("missing ingest timestamp for dataset `{0}`")]
    MissingIngest(String),
    #[error("duration overflow when building schedule: {0}")]
    DurationOverflow(String),
    #[error("serialization failure: {0}")]
    Serialization(String),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Gate {
    #[serde(with = "chrono::serde::ts_seconds")]
    pub open_at: DateTime<Utc>,
    pub channel: AccessChannel,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ScheduleEntry {
    pub dataset: String,
    #[serde(default)]
    pub dataset_version: Option<String>,
    pub region: String,
    #[serde(with = "chrono::serde::ts_seconds")]
    pub embargo_until: DateTime<Utc>,
    #[serde(with = "chrono::serde::ts_seconds")]
    pub cooling_off_until: DateTime<Utc>,
    pub storage_gate: Gate,
    pub api_gate: Gate,
    #[serde(default)]
    pub exceptions: Vec<ExceptionRule>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SignedSchedule {
    #[serde(with = "chrono::serde::ts_seconds")]
    pub generated_at: DateTime<Utc>,
    pub entries: Vec<ScheduleEntry>,
    pub signature: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ScheduleDiff {
    pub dataset: String,
    pub region: String,
    pub field: String,
    pub previous: String,
    pub current: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SimulationResult {
    pub request: BackfillRequest,
    pub allowed: bool,
    #[serde(with = "chrono::serde::ts_seconds")]
    pub gate_open_at: DateTime<Utc>,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SimulationReport {
    pub results: Vec<SimulationResult>,
    pub all_safe: bool,
}

pub struct Scheduler {
    policies: Vec<EmbargoPolicy>,
    ingests: HashMap<String, DateTime<Utc>>,
}

impl Scheduler {
    pub fn new(policies: Vec<EmbargoPolicy>, ingests: Vec<DatasetIngest>) -> Self {
        let ingests = ingests
            .into_iter()
            .map(|ingest| (ingest.dataset, ingest.ingested_at))
            .collect();
        Self { policies, ingests }
    }

    pub fn generate(&self) -> Result<SignedSchedule, SchedulerError> {
        let mut entries = Vec::new();
        for policy in &self.policies {
            let ingest_at = self
                .ingests
                .get(&policy.dataset)
                .ok_or_else(|| SchedulerError::MissingIngest(policy.dataset.clone()))?;
            for region in &policy.regions {
                entries.push(self.build_entry(policy, region, *ingest_at)?);
            }
        }

        entries.sort_by(|a, b| {
            (
                a.dataset.as_str(),
                a.dataset_version.as_deref().unwrap_or(""),
                a.region.as_str(),
            )
                .cmp(&(
                    b.dataset.as_str(),
                    b.dataset_version.as_deref().unwrap_or(""),
                    b.region.as_str(),
                ))
        });

        let mut schedule = SignedSchedule {
            generated_at: Utc::now(),
            entries,
            signature: String::new(),
        };
        schedule.signature = Self::compute_signature(&schedule)?;
        Ok(schedule)
    }

    fn build_entry(
        &self,
        policy: &EmbargoPolicy,
        region: &RegionPolicy,
        ingest_at: DateTime<Utc>,
    ) -> Result<ScheduleEntry, SchedulerError> {
        let embargo_delta = chrono_duration(region.embargo)?;
        let cooling_delta = chrono_duration(region.cooling_off)?;
        let embargo_until = ingest_at.checked_add_signed(embargo_delta).ok_or_else(|| {
            SchedulerError::DurationOverflow(format!(
                "embargo window overflow for dataset {} region {}",
                policy.dataset, region.region
            ))
        })?;
        let cooling_off_until =
            embargo_until
                .checked_add_signed(cooling_delta)
                .ok_or_else(|| {
                    SchedulerError::DurationOverflow(format!(
                        "cooling-off window overflow for dataset {} region {}",
                        policy.dataset, region.region
                    ))
                })?;

        Ok(ScheduleEntry {
            dataset: policy.dataset.clone(),
            dataset_version: policy.dataset_version.clone(),
            region: region.region.clone(),
            embargo_until,
            cooling_off_until,
            storage_gate: Gate {
                open_at: embargo_until,
                channel: AccessChannel::Storage,
            },
            api_gate: Gate {
                open_at: cooling_off_until,
                channel: AccessChannel::Api,
            },
            exceptions: region.exceptions.clone(),
        })
    }

    fn compute_signature(schedule: &SignedSchedule) -> Result<String, SchedulerError> {
        #[derive(Serialize)]
        struct CanonicalSchedule<'a> {
            #[serde(with = "chrono::serde::ts_seconds")]
            generated_at: DateTime<Utc>,
            entries: &'a [ScheduleEntry],
        }

        let canonical = CanonicalSchedule {
            generated_at: schedule.generated_at,
            entries: &schedule.entries,
        };
        let serialized = serde_json::to_vec(&canonical)
            .map_err(|err| SchedulerError::Serialization(err.to_string()))?;
        let mut hasher = Sha256::new();
        hasher.update(serialized);
        Ok(format!("{:x}", hasher.finalize()))
    }

    pub fn diff(previous: &SignedSchedule, current: &SignedSchedule) -> Vec<ScheduleDiff> {
        let mut diffs = Vec::new();
        let previous_map: HashMap<_, _> = previous
            .entries
            .iter()
            .map(|entry| ((entry.dataset.as_str(), entry.region.as_str()), entry))
            .collect();
        let current_map: HashMap<_, _> = current
            .entries
            .iter()
            .map(|entry| ((entry.dataset.as_str(), entry.region.as_str()), entry))
            .collect();

        for ((dataset, region), current_entry) in current_map
            .iter()
            .sorted_by(|a, b| (a.0.0, a.0.1).cmp(&(b.0.0, b.0.1)))
        {
            if let Some(previous_entry) = previous_map.get(&(dataset, region)) {
                if previous_entry.embargo_until != current_entry.embargo_until {
                    diffs.push(ScheduleDiff {
                        dataset: (**dataset).to_string(),
                        region: (**region).to_string(),
                        field: "embargo_until".into(),
                        previous: previous_entry.embargo_until.to_rfc3339(),
                        current: current_entry.embargo_until.to_rfc3339(),
                    });
                }
                if previous_entry.cooling_off_until != current_entry.cooling_off_until {
                    diffs.push(ScheduleDiff {
                        dataset: (**dataset).to_string(),
                        region: (**region).to_string(),
                        field: "cooling_off_until".into(),
                        previous: previous_entry.cooling_off_until.to_rfc3339(),
                        current: current_entry.cooling_off_until.to_rfc3339(),
                    });
                }
                if previous_entry.exceptions != current_entry.exceptions {
                    diffs.push(ScheduleDiff {
                        dataset: (**dataset).to_string(),
                        region: (**region).to_string(),
                        field: "exceptions".into(),
                        previous: serde_json::to_string(&previous_entry.exceptions)
                            .unwrap_or_default(),
                        current: serde_json::to_string(&current_entry.exceptions)
                            .unwrap_or_default(),
                    });
                }
            } else {
                diffs.push(ScheduleDiff {
                    dataset: (**dataset).to_string(),
                    region: (**region).to_string(),
                    field: "added".into(),
                    previous: "<none>".into(),
                    current: serde_json::to_string(current_entry).unwrap_or_default(),
                });
            }
        }

        for ((dataset, region), previous_entry) in previous_map
            .iter()
            .sorted_by(|a, b| (a.0.0, a.0.1).cmp(&(b.0.0, b.0.1)))
        {
            if !current_map.contains_key(&(dataset, region)) {
                diffs.push(ScheduleDiff {
                    dataset: (*dataset).to_string(),
                    region: (*region).to_string(),
                    field: "removed".into(),
                    previous: serde_json::to_string(previous_entry).unwrap_or_default(),
                    current: "<none>".into(),
                });
            }
        }

        diffs
    }

    pub fn simulate_backfill(
        schedule: &SignedSchedule,
        requests: &[BackfillRequest],
    ) -> SimulationReport {
        let mut results = requests
            .iter()
            .filter_map(|request| {
                schedule
                    .entries
                    .iter()
                    .find(|entry| {
                        entry.dataset == request.dataset && entry.region == request.region
                    })
                    .map(|entry| (request, entry))
            })
            .map(|(request, entry)| {
                let gate = match request.channel {
                    AccessChannel::Storage => entry.storage_gate.open_at,
                    AccessChannel::Api => entry.api_gate.open_at,
                };
                let allowed = request.requested_at >= gate;
                let reason = if allowed {
                    "request at or after gate; safe to backfill".to_string()
                } else {
                    format!(
                        "request precedes gate by {} seconds",
                        (gate - request.requested_at).num_seconds()
                    )
                };
                SimulationResult {
                    request: request.clone(),
                    allowed,
                    gate_open_at: gate,
                    reason,
                }
            })
            .collect_vec();

        results.sort_by(|a, b| {
            (
                a.request.dataset.as_str(),
                a.request.region.as_str(),
                a.request.requested_at,
            )
                .cmp(&(
                    b.request.dataset.as_str(),
                    b.request.region.as_str(),
                    b.request.requested_at,
                ))
        });

        let all_safe = results.iter().all(|result| result.allowed);
        SimulationReport { results, all_safe }
    }
}

fn chrono_duration(duration: std::time::Duration) -> Result<ChronoDuration, SchedulerError> {
    ChronoDuration::from_std(duration)
        .map_err(|err| SchedulerError::DurationOverflow(err.to_string()))
}

pub fn detect_breaches(
    schedule: &SignedSchedule,
    events: &[crate::model::AccessEvent],
) -> Vec<crate::model::AccessEvent> {
    events
        .iter()
        .filter(|event| {
            schedule
                .entries
                .iter()
                .find(|entry| entry.dataset == event.dataset && entry.region == event.region)
                .map(|entry| {
                    let gate = match event.channel {
                        AccessChannel::Storage => entry.storage_gate.open_at,
                        AccessChannel::Api => entry.api_gate.open_at,
                    };
                    let exception_allows = entry
                        .exceptions
                        .iter()
                        .find(|exception| exception.principal == event.principal)
                        .map(|exception| event.occurred_at >= exception.allow_after)
                        .unwrap_or(false);
                    event.occurred_at < gate && !exception_allows
                })
                .unwrap_or(false)
        })
        .cloned()
        .collect()
}
