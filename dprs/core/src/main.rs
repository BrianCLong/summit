use chrono::{Datelike, Duration, NaiveDate};
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::collections::BinaryHeap;
use std::io::{self, Read};
use thiserror::Error;

#[derive(Debug, Error)]
enum SchedulerError {
    #[error("failed to read stdin: {0}")]
    Io(#[from] io::Error),
    #[error("invalid input: {0}")]
    InvalidInput(String),
    #[error("failed to parse json: {0}")]
    Json(#[from] serde_json::Error),
}

#[derive(Debug, Deserialize, Serialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
enum Frequency {
    Daily,
    Weekly,
    Monthly,
}

#[derive(Debug, Deserialize, Serialize, Clone, PartialEq, Eq, Copy)]
#[serde(rename_all = "kebab-case")]
enum Priority {
    Critical,
    NiceToHave,
}

impl Priority {
    fn weight(&self) -> i32 {
        match self {
            Priority::Critical => 0,
            Priority::NiceToHave => 1,
        }
    }
}

#[derive(Debug, Deserialize, Serialize, Clone)]
struct MetricConfig {
    id: String,
    name: String,
    frequency: Frequency,
    epsilon: f64,
    #[serde(default = "MetricConfig::default_delta")]
    delta: f64,
    #[serde(default = "MetricConfig::default_group_size")]
    group_size: u32,
    priority: Priority,
}

impl MetricConfig {
    fn default_delta() -> f64 {
        1e-6
    }

    fn default_group_size() -> u32 {
        1
    }
}

#[derive(Debug, Deserialize, Serialize)]
struct SchedulerInput {
    start_date: String,
    end_date: String,
    epsilon_cap: f64,
    delta_cap: f64,
    metrics: Vec<MetricConfig>,
}

#[derive(Debug, Serialize)]
struct ReleaseProof {
    cumulative_epsilon: f64,
    epsilon_remaining: f64,
    advanced_epsilon: f64,
    advanced_epsilon_remaining: f64,
    delta_spent: f64,
    delta_remaining: f64,
}

#[derive(Debug, Serialize)]
struct ScheduledRelease {
    metric_id: String,
    metric_name: String,
    date: String,
    frequency: Frequency,
    priority: Priority,
    epsilon_cost: f64,
    delta_cost: f64,
    group_size: u32,
    proof: ReleaseProof,
}

#[derive(Debug, Serialize)]
struct SkippedRelease {
    metric_id: String,
    metric_name: String,
    date: String,
    reason: String,
}

#[derive(Debug, Serialize)]
struct SchedulerSummary {
    total_releases: usize,
    epsilon_cap: f64,
    epsilon_used: f64,
    epsilon_remaining: f64,
    advanced_epsilon: f64,
    advanced_remaining: f64,
    delta_cap: f64,
    delta_used: f64,
    delta_remaining: f64,
    skipped: Vec<SkippedRelease>,
}

#[derive(Debug, Serialize)]
struct SchedulerOutput {
    schedule: Vec<ScheduledRelease>,
    summary: SchedulerSummary,
}

#[derive(Clone)]
struct ReleaseCandidate {
    metric: MetricConfig,
    date: NaiveDate,
    epsilon_cost: f64,
    delta_cost: f64,
}

impl PartialEq for ReleaseCandidate {
    fn eq(&self, other: &Self) -> bool {
        self.metric.priority == other.metric.priority && self.date == other.date
    }
}

impl Eq for ReleaseCandidate {}

impl PartialOrd for ReleaseCandidate {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for ReleaseCandidate {
    fn cmp(&self, other: &Self) -> Ordering {
        // BinaryHeap is max-heap. We want earliest date with highest priority first.
        match other
            .metric
            .priority
            .weight()
            .cmp(&self.metric.priority.weight())
        {
            Ordering::Equal => self.date.cmp(&other.date).reverse(),
            other => other,
        }
    }
}

fn parse_date(value: &str) -> Result<NaiveDate, SchedulerError> {
    NaiveDate::parse_from_str(value, "%Y-%m-%d")
        .map_err(|e| SchedulerError::InvalidInput(format!("invalid date '{value}': {e}")))
}

fn last_day_of_month(year: i32, month: u32) -> u32 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 => {
            if chrono::NaiveDate::from_ymd_opt(year, 2, 29).is_some() {
                29
            } else {
                28
            }
        }
        _ => 30,
    }
}

fn increment_date(date: NaiveDate, frequency: &Frequency) -> NaiveDate {
    match frequency {
        Frequency::Daily => date + Duration::days(1),
        Frequency::Weekly => date + Duration::weeks(1),
        Frequency::Monthly => {
            let mut year = date.year();
            let mut month = date.month();
            let day = date.day();
            if month == 12 {
                month = 1;
                year += 1;
            } else {
                month += 1;
            }
            let last_day = last_day_of_month(year, month);
            let new_day = day.min(last_day);
            NaiveDate::from_ymd_opt(year, month, new_day).unwrap()
        }
    }
}

fn effective_epsilon(metric: &MetricConfig) -> Result<f64, SchedulerError> {
    if metric.epsilon <= 0.0 {
        return Err(SchedulerError::InvalidInput(format!(
            "metric {} must have epsilon > 0",
            metric.id
        )));
    }
    let value = metric.epsilon * metric.group_size as f64;
    Ok(value)
}

fn effective_delta(metric: &MetricConfig) -> Result<f64, SchedulerError> {
    if metric.delta < 0.0 {
        return Err(SchedulerError::InvalidInput(format!(
            "metric {} must have delta >= 0",
            metric.id
        )));
    }
    Ok(metric.delta * metric.group_size as f64)
}

fn generate_candidates(
    input: &SchedulerInput,
    start: NaiveDate,
    end: NaiveDate,
) -> Result<Vec<ReleaseCandidate>, SchedulerError> {
    let mut candidates = Vec::new();
    for metric in &input.metrics {
        let mut current = start;
        while current <= end {
            let epsilon_cost = effective_epsilon(metric)?;
            let delta_cost = effective_delta(metric)?;
            candidates.push(ReleaseCandidate {
                metric: metric.clone(),
                date: current,
                epsilon_cost,
                delta_cost,
            });
            current = increment_date(current, &metric.frequency);
        }
    }
    Ok(candidates)
}

fn advanced_composition(
    epsilons: &[f64],
    delta_cap: f64,
    delta_used: f64,
) -> Result<f64, SchedulerError> {
    if epsilons.is_empty() {
        return Ok(0.0);
    }
    let sum_eps: f64 = epsilons.iter().sum();
    let sum_sq: f64 = epsilons.iter().map(|e| e * e).sum();
    if delta_cap <= delta_used {
        return Err(SchedulerError::InvalidInput(
            "delta cap exhausted before advanced composition".to_string(),
        ));
    }
    let delta_slack = (delta_cap - delta_used).max(1e-12);
    let log_term = (1.0 / delta_slack).ln();
    let sqrt_term = (2.0 * log_term * sum_sq).sqrt();
    let exp_term: f64 = epsilons.iter().map(|e| e * (e.exp() - 1.0)).sum();
    Ok(sum_eps.min(sqrt_term + exp_term))
}

fn schedule(input: SchedulerInput) -> Result<SchedulerOutput, SchedulerError> {
    if input.epsilon_cap <= 0.0 {
        return Err(SchedulerError::InvalidInput(
            "epsilon_cap must be positive".into(),
        ));
    }
    if input.delta_cap <= 0.0 {
        return Err(SchedulerError::InvalidInput(
            "delta_cap must be positive".into(),
        ));
    }
    if input.metrics.is_empty() {
        return Err(SchedulerError::InvalidInput("no metrics provided".into()));
    }
    let start = parse_date(&input.start_date)?;
    let end = parse_date(&input.end_date)?;
    if end < start {
        return Err(SchedulerError::InvalidInput(
            "end_date must not be before start_date".into(),
        ));
    }

    let mut heap: BinaryHeap<ReleaseCandidate> = BinaryHeap::new();
    for candidate in generate_candidates(&input, start, end)? {
        heap.push(candidate);
    }

    let mut schedule = Vec::new();
    let mut skipped = Vec::new();
    let mut epsilons: Vec<f64> = Vec::new();
    let mut delta_used = 0.0;

    while let Some(candidate) = heap.pop() {
        let tentative_delta = delta_used + candidate.delta_cost;
        if tentative_delta > input.delta_cap {
            skipped.push(SkippedRelease {
                metric_id: candidate.metric.id.clone(),
                metric_name: candidate.metric.name.clone(),
                date: candidate.date.to_string(),
                reason: "delta budget exhausted".into(),
            });
            continue;
        }

        let tentative_epsilons = {
            let mut updated = epsilons.clone();
            updated.push(candidate.epsilon_cost);
            updated
        };
        let direct_total: f64 = tentative_epsilons.iter().sum();
        if direct_total > input.epsilon_cap {
            skipped.push(SkippedRelease {
                metric_id: candidate.metric.id.clone(),
                metric_name: candidate.metric.name.clone(),
                date: candidate.date.to_string(),
                reason: "epsilon cap exceeded".into(),
            });
            continue;
        }

        let advanced_total =
            match advanced_composition(&tentative_epsilons, input.delta_cap, tentative_delta) {
                Ok(val) => val,
                Err(err) => {
                    skipped.push(SkippedRelease {
                        metric_id: candidate.metric.id.clone(),
                        metric_name: candidate.metric.name.clone(),
                        date: candidate.date.to_string(),
                        reason: err.to_string(),
                    });
                    continue;
                }
            };

        if advanced_total > input.epsilon_cap {
            skipped.push(SkippedRelease {
                metric_id: candidate.metric.id.clone(),
                metric_name: candidate.metric.name.clone(),
                date: candidate.date.to_string(),
                reason: "advanced composition cap exceeded".into(),
            });
            continue;
        }

        epsilons = tentative_epsilons;
        delta_used = tentative_delta;

        let proof = ReleaseProof {
            cumulative_epsilon: direct_total,
            epsilon_remaining: (input.epsilon_cap - direct_total).max(0.0),
            advanced_epsilon: advanced_total,
            advanced_epsilon_remaining: (input.epsilon_cap - advanced_total).max(0.0),
            delta_spent: delta_used,
            delta_remaining: (input.delta_cap - delta_used).max(0.0),
        };

        schedule.push(ScheduledRelease {
            metric_id: candidate.metric.id.clone(),
            metric_name: candidate.metric.name.clone(),
            date: candidate.date.to_string(),
            frequency: candidate.metric.frequency.clone(),
            priority: candidate.metric.priority,
            epsilon_cost: candidate.epsilon_cost,
            delta_cost: candidate.delta_cost,
            group_size: candidate.metric.group_size,
            proof,
        });
    }

    let direct_total: f64 = epsilons.iter().sum();
    let advanced_total = advanced_composition(&epsilons, input.delta_cap, delta_used)?;

    let summary = SchedulerSummary {
        total_releases: schedule.len(),
        epsilon_cap: input.epsilon_cap,
        epsilon_used: direct_total,
        epsilon_remaining: (input.epsilon_cap - direct_total).max(0.0),
        advanced_epsilon: advanced_total,
        advanced_remaining: (input.epsilon_cap - advanced_total).max(0.0),
        delta_cap: input.delta_cap,
        delta_used,
        delta_remaining: (input.delta_cap - delta_used).max(0.0),
        skipped,
    };

    Ok(SchedulerOutput { schedule, summary })
}

fn main() -> Result<(), SchedulerError> {
    let mut buffer = String::new();
    io::stdin().read_to_string(&mut buffer)?;
    if buffer.trim().is_empty() {
        return Err(SchedulerError::InvalidInput(
            "expected scheduler input on stdin".into(),
        ));
    }
    let input: SchedulerInput = serde_json::from_str(&buffer)?;
    let output = schedule(input)?;
    let json = serde_json::to_string_pretty(&output)?;
    println!("{json}");
    Ok(())
}
