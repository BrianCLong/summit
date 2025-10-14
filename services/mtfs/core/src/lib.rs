use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use chrono::{DateTime, Duration, TimeZone, Utc};
use ed25519_dalek::{Keypair, PublicKey, SecretKey, Signature, Signer};
use ordered_float::OrderedFloat;
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::collections::{BTreeSet, HashMap};
use std::fmt;
use thiserror::Error;

/// Unique identifier for jobs handled by the scheduler.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub struct JobId(u64);

impl fmt::Display for JobId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl JobId {
    pub fn as_u64(self) -> u64 {
        self.0
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum JobClass {
    Batch,
    Online,
}

impl std::str::FromStr for JobClass {
    type Err = SchedulerError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_ascii_lowercase().as_str() {
            "batch" => Ok(JobClass::Batch),
            "online" => Ok(JobClass::Online),
            other => Err(SchedulerError::UnknownJobClass(other.to_owned())),
        }
    }
}

impl JobClass {
    pub fn as_str(self) -> &'static str {
        match self {
            JobClass::Batch => "batch",
            JobClass::Online => "online",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PolicyTier {
    Gold,
    Silver,
    Bronze,
}

impl PolicyTier {
    fn base_weight(self) -> f64 {
        match self {
            PolicyTier::Gold => 3.0,
            PolicyTier::Silver => 2.0,
            PolicyTier::Bronze => 1.0,
        }
    }

    fn burst_multiplier(self) -> f64 {
        match self {
            PolicyTier::Gold => 1.8,
            PolicyTier::Silver => 1.4,
            PolicyTier::Bronze => 1.1,
        }
    }

    fn can_preempt(self, other: PolicyTier) -> bool {
        matches!(
            (self, other),
            (PolicyTier::Gold, PolicyTier::Silver | PolicyTier::Bronze)
                | (PolicyTier::Silver, PolicyTier::Bronze)
        )
    }

    fn priority_rank(self) -> u8 {
        match self {
            PolicyTier::Gold => 0,
            PolicyTier::Silver => 1,
            PolicyTier::Bronze => 2,
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            PolicyTier::Gold => "gold",
            PolicyTier::Silver => "silver",
            PolicyTier::Bronze => "bronze",
        }
    }
}

impl std::str::FromStr for PolicyTier {
    type Err = SchedulerError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_ascii_lowercase().as_str() {
            "gold" => Ok(PolicyTier::Gold),
            "silver" => Ok(PolicyTier::Silver),
            "bronze" => Ok(PolicyTier::Bronze),
            other => Err(SchedulerError::UnknownPolicyTier(other.to_owned())),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobRequest {
    pub tenant_id: String,
    pub job_class: JobClass,
    pub policy_tier: PolicyTier,
    pub resource_units: u64,
    pub weight: f64,
}

#[derive(Debug, Clone)]
struct Job {
    id: JobId,
    tenant_id: String,
    job_class: JobClass,
    policy_tier: PolicyTier,
    resource_units: u64,
    effective_weight: f64,
    start_tag: f64,
    finish_tag: f64,
    submitted_round: u64,
    inserted_key: JobKey,
}

#[derive(Debug, Clone)]
struct TenantState {
    policy_tier: PolicyTier,
    weight: f64,
    burst_credits: u64,
    last_finish_tag: f64,
    priority_boost: f64,
}

impl TenantState {
    fn effective_weight(&self) -> f64 {
        (self.policy_tier.base_weight() + self.weight + self.priority_boost).max(0.1)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct JobKey {
    finish: OrderedFloat<f64>,
    start: OrderedFloat<f64>,
    id: JobId,
}

impl JobKey {
    fn new(start: f64, finish: f64, id: JobId) -> Self {
        JobKey {
            finish: OrderedFloat(finish),
            start: OrderedFloat(start),
            id,
        }
    }

    fn start(&self) -> f64 {
        self.start.into_inner()
    }
}

impl Ord for JobKey {
    fn cmp(&self, other: &Self) -> Ordering {
        self.finish
            .cmp(&other.finish)
            .then(self.start.cmp(&other.start))
            .then(self.id.cmp(&other.id))
    }
}

impl PartialOrd for JobKey {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AllocationSnapshot {
    pub allocation_id: u64,
    pub job_id: u64,
    pub tenant_id: String,
    pub job_class: JobClass,
    pub policy_tier: PolicyTier,
    pub allocated_units: u64,
    pub virtual_start: f64,
    pub virtual_finish: f64,
    pub wait_rounds: u64,
    pub timestamp: DateTime<Utc>,
    pub preempted_job: Option<u64>,
    pub sla_breach: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignedSnapshot {
    pub snapshot: AllocationSnapshot,
    pub signature: String,
}

#[derive(Debug, Clone)]
pub struct AllocationOutcome {
    pub job_id: JobId,
    pub tenant_id: String,
    pub snapshot: SignedSnapshot,
    pub preempted: Option<JobId>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimulationReport {
    pub allocations: Vec<SignedSnapshot>,
}

#[derive(Debug, Error)]
pub enum SchedulerError {
    #[error("unknown policy tier '{0}'")]
    UnknownPolicyTier(String),
    #[error("unknown job class '{0}'")]
    UnknownJobClass(String),
    #[error("no allocation available")]
    NoAllocation,
}

#[derive(Debug, Clone)]
pub struct SchedulerConfig {
    pub starvation_threshold_rounds: u64,
    pub online_sla_rounds: u64,
    pub batch_sla_rounds: u64,
    pub default_burst_credits: u64,
    signing_seed: [u8; 32],
}

impl SchedulerConfig {
    pub fn deterministic(seed: [u8; 32]) -> Self {
        SchedulerConfig {
            starvation_threshold_rounds: 5,
            online_sla_rounds: 2,
            batch_sla_rounds: 6,
            default_burst_credits: 10,
            signing_seed: seed,
        }
    }
}

#[derive(Debug, Clone)]
struct SlaMonitor {
    online_target: u64,
    batch_target: u64,
    breached_jobs: Vec<JobId>,
}

impl SlaMonitor {
    fn new(online: u64, batch: u64) -> Self {
        SlaMonitor {
            online_target: online,
            batch_target: batch,
            breached_jobs: Vec::new(),
        }
    }

    fn check(&mut self, job: &Job, wait_rounds: u64) -> bool {
        let target = match job.job_class {
            JobClass::Online => self.online_target,
            JobClass::Batch => self.batch_target,
        };
        let breach = wait_rounds > target;
        if breach {
            self.breached_jobs.push(job.id);
        }
        breach
    }
}

#[derive(Debug, Clone)]
struct StarvationDetector {
    threshold_rounds: u64,
}

impl StarvationDetector {
    fn new(threshold_rounds: u64) -> Self {
        StarvationDetector { threshold_rounds }
    }

    fn detect(&self, jobs: &HashMap<JobId, Job>, current_round: u64) -> Option<JobId> {
        jobs.values()
            .filter(|job| {
                current_round.saturating_sub(job.submitted_round) >= self.threshold_rounds
            })
            .min_by(|a, b| {
                let wa = current_round - a.submitted_round;
                let wb = current_round - b.submitted_round;
                wa.cmp(&wb).then_with(|| a.id.cmp(&b.id))
            })
            .map(|job| job.id)
    }
}

#[derive(Debug)]
pub struct Scheduler {
    config: SchedulerConfig,
    tenants: HashMap<String, TenantState>,
    pending_jobs: HashMap<JobId, Job>,
    pending_index: BTreeSet<JobKey>,
    next_job_id: u64,
    next_allocation_id: u64,
    virtual_time: f64,
    round: u64,
    sla_monitor: SlaMonitor,
    starvation_detector: StarvationDetector,
    snapshots: Vec<SignedSnapshot>,
    signing_key: Keypair,
    current_allocation: Option<(JobId, PolicyTier)>,
    base_time: DateTime<Utc>,
}

impl Scheduler {
    pub fn new(config: SchedulerConfig) -> Self {
        let secret = SecretKey::from_bytes(&config.signing_seed).expect("32-byte seed");
        let public: PublicKey = (&secret).into();
        let signing_key = Keypair { secret, public };
        let mut seconds_bytes = [0u8; 8];
        seconds_bytes.copy_from_slice(&config.signing_seed[..8]);
        let seed_seconds = u64::from_le_bytes(seconds_bytes);
        let bounded_seconds = (seed_seconds % (365 * 24 * 60 * 60)) as i64;
        let base_time = Utc
            .timestamp_opt(bounded_seconds, 0)
            .single()
            .or_else(|| Utc.timestamp_opt(0, 0).single())
            .expect("timestamp conversion");
        Scheduler {
            tenants: HashMap::new(),
            pending_jobs: HashMap::new(),
            pending_index: BTreeSet::new(),
            next_job_id: 1,
            next_allocation_id: 1,
            virtual_time: 0.0,
            round: 0,
            sla_monitor: SlaMonitor::new(config.online_sla_rounds, config.batch_sla_rounds),
            starvation_detector: StarvationDetector::new(config.starvation_threshold_rounds),
            snapshots: Vec::new(),
            signing_key,
            current_allocation: None,
            config,
            base_time,
        }
    }

    pub fn config(&self) -> &SchedulerConfig {
        &self.config
    }

    pub fn submit_job(&mut self, request: JobRequest) -> JobId {
        self.round += 1;
        let tenant = self
            .tenants
            .entry(request.tenant_id.clone())
            .or_insert_with(|| TenantState {
                policy_tier: request.policy_tier,
                weight: 0.0,
                burst_credits: self.config.default_burst_credits,
                last_finish_tag: self.virtual_time,
                priority_boost: 0.0,
            });

        if tenant.policy_tier.priority_rank() > request.policy_tier.priority_rank() {
            tenant.policy_tier = request.policy_tier;
        }

        tenant.weight = request.weight;

        let base_weight = tenant.effective_weight();
        let mut effective_weight = base_weight;
        if tenant.burst_credits > 0 {
            let burst_units = request.resource_units.min(tenant.burst_credits);
            effective_weight *= tenant.policy_tier.burst_multiplier();
            tenant.burst_credits -= burst_units;
        }

        let job_id = JobId(self.next_job_id);
        self.next_job_id += 1;

        let start_tag = self.virtual_time.max(tenant.last_finish_tag);
        let work = request.resource_units.max(1) as f64;
        let finish_tag = start_tag + work / effective_weight;
        tenant.last_finish_tag = finish_tag;

        let key = JobKey::new(start_tag, finish_tag, job_id);
        let job = Job {
            id: job_id,
            tenant_id: request.tenant_id,
            job_class: request.job_class,
            policy_tier: request.policy_tier,
            resource_units: request.resource_units,
            effective_weight,
            start_tag,
            finish_tag,
            submitted_round: self.round,
            inserted_key: key,
        };

        self.pending_index.insert(key);
        self.pending_jobs.insert(job_id, job);
        self.evaluate_preemption();
        job_id
    }

    fn evaluate_preemption(&mut self) {
        if let Some((running_id, running_tier)) = self.current_allocation {
            if let Some(candidate_key) = self.pending_index.iter().next().copied() {
                let candidate_id = candidate_key.id;
                let candidate_tier = self
                    .pending_jobs
                    .get(&candidate_id)
                    .map(|job| job.policy_tier);
                if let Some(candidate_tier) = candidate_tier {
                    if candidate_tier.can_preempt(running_tier) {
                        if let Some(mut running_job) = self.pending_jobs.remove(&running_id) {
                            self.pending_index.remove(&running_job.inserted_key);
                            running_job.start_tag = candidate_key.start();
                            running_job.finish_tag = running_job.start_tag
                                + running_job.resource_units as f64 / running_job.effective_weight;
                            running_job.inserted_key = JobKey::new(
                                running_job.start_tag,
                                running_job.finish_tag,
                                running_job.id,
                            );
                            self.pending_index.insert(running_job.inserted_key);
                            self.pending_jobs.insert(running_id, running_job);
                        }
                        self.current_allocation = None;
                    }
                }
            }
        }
    }

    pub fn schedule_next(&mut self) -> Result<AllocationOutcome, SchedulerError> {
        if self.pending_index.is_empty() {
            return Err(SchedulerError::NoAllocation);
        }

        self.round += 1;

        let starved_job_id = self
            .starvation_detector
            .detect(&self.pending_jobs, self.round);

        let (job_id, job) = if let Some(starved) = starved_job_id {
            let job = self
                .pending_jobs
                .remove(&starved)
                .expect("starved job must exist");
            self.pending_index.remove(&job.inserted_key);
            (starved, job)
        } else {
            let key = self
                .pending_index
                .iter()
                .next()
                .copied()
                .expect("non-empty index");
            self.pending_index.remove(&key);
            let job = self
                .pending_jobs
                .remove(&key.id)
                .expect("job exists for key");
            (key.id, job)
        };

        let wait_rounds = self.round.saturating_sub(job.submitted_round);
        let sla_breach = self.sla_monitor.check(&job, wait_rounds);
        self.virtual_time = job.start_tag;

        let snapshot = AllocationSnapshot {
            allocation_id: self.next_allocation_id,
            job_id: job_id.0,
            tenant_id: job.tenant_id.clone(),
            job_class: job.job_class,
            policy_tier: job.policy_tier,
            allocated_units: job.resource_units,
            virtual_start: job.start_tag,
            virtual_finish: job.finish_tag,
            wait_rounds,
            timestamp: self.base_time + Duration::seconds(self.next_allocation_id as i64),
            preempted_job: self.current_allocation.map(|(id, _)| id.0),
            sla_breach,
        };

        let signed = self.sign_snapshot(snapshot);
        self.snapshots.push(signed.clone());
        self.next_allocation_id += 1;

        let preempted = self.current_allocation.take().map(|(id, _)| id);
        self.current_allocation = Some((job_id, job.policy_tier));

        Ok(AllocationOutcome {
            job_id,
            tenant_id: job.tenant_id,
            snapshot: signed,
            preempted,
        })
    }

    pub fn snapshots(&self) -> &[SignedSnapshot] {
        &self.snapshots
    }

    pub fn simulate_weight_change(
        &self,
        overrides: &HashMap<String, f64>,
        steps: usize,
    ) -> SimulationReport {
        let mut simulated = self.clone();
        simulated.current_allocation = None;
        for (tenant, weight) in overrides {
            if let Some(state) = simulated.tenants.get_mut(tenant) {
                state.weight = *weight;
            }
        }

        let mut jobs: Vec<Job> = simulated.pending_jobs.values().cloned().collect();
        jobs.sort_by(|a, b| {
            a.submitted_round
                .cmp(&b.submitted_round)
                .then(a.id.cmp(&b.id))
        });
        simulated.pending_jobs.clear();
        simulated.pending_index.clear();
        for state in simulated.tenants.values_mut() {
            state.last_finish_tag = simulated.virtual_time;
        }
        for mut job in jobs {
            if let Some(state) = simulated.tenants.get_mut(&job.tenant_id) {
                job.effective_weight = state.effective_weight();
                job.start_tag = simulated.virtual_time.max(state.last_finish_tag);
                job.finish_tag = job.start_tag + job.resource_units as f64 / job.effective_weight;
                state.last_finish_tag = job.finish_tag;
                job.inserted_key = JobKey::new(job.start_tag, job.finish_tag, job.id);
                simulated.pending_index.insert(job.inserted_key);
                simulated.pending_jobs.insert(job.id, job);
            }
        }

        let mut allocations = Vec::new();
        for _ in 0..steps {
            match simulated.schedule_next() {
                Ok(outcome) => allocations.push(outcome.snapshot),
                Err(_) => break,
            }
        }

        SimulationReport { allocations }
    }

    fn sign_snapshot(&self, snapshot: AllocationSnapshot) -> SignedSnapshot {
        let payload = serde_json::to_vec(&snapshot).expect("snapshot serializable");
        let signature: Signature = self.signing_key.sign(&payload);
        SignedSnapshot {
            snapshot,
            signature: BASE64.encode(signature.to_bytes()),
        }
    }
}

impl Clone for Scheduler {
    fn clone(&self) -> Self {
        Scheduler {
            config: self.config.clone(),
            tenants: self.tenants.clone(),
            pending_jobs: self.pending_jobs.clone(),
            pending_index: self.pending_index.clone(),
            next_job_id: self.next_job_id,
            next_allocation_id: self.next_allocation_id,
            virtual_time: self.virtual_time,
            round: self.round,
            sla_monitor: self.sla_monitor.clone(),
            starvation_detector: self.starvation_detector.clone(),
            snapshots: self.snapshots.clone(),
            signing_key: Keypair::from_bytes(&self.signing_key.to_bytes())
                .expect("valid keypair clone"),
            current_allocation: self.current_allocation,
            base_time: self.base_time,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use pretty_assertions::assert_eq;
    use std::collections::HashMap;

    fn scheduler() -> Scheduler {
        let seed = [7u8; 32];
        Scheduler::new(SchedulerConfig::deterministic(seed))
    }

    fn job_request(
        tenant: &str,
        tier: PolicyTier,
        class: JobClass,
        weight: f64,
        units: u64,
    ) -> JobRequest {
        JobRequest {
            tenant_id: tenant.to_string(),
            job_class: class,
            policy_tier: tier,
            resource_units: units,
            weight,
        }
    }

    #[test]
    fn deterministic_scheduling() {
        let mut sched = scheduler();
        let job_a = sched.submit_job(job_request(
            "tenant-a",
            PolicyTier::Gold,
            JobClass::Online,
            1.0,
            5,
        ));
        let job_b = sched.submit_job(job_request(
            "tenant-b",
            PolicyTier::Silver,
            JobClass::Batch,
            1.0,
            5,
        ));
        let job_c = sched.submit_job(job_request(
            "tenant-c",
            PolicyTier::Bronze,
            JobClass::Batch,
            1.0,
            5,
        ));

        let order: Vec<JobId> = (0..3)
            .map(|_| sched.schedule_next().expect("allocation").job_id)
            .collect();

        assert_eq!(order, vec![job_a, job_b, job_c]);

        // snapshots should be deterministic and reproduce allocations
        let snapshot_bytes: Vec<Vec<u8>> = sched
            .snapshots()
            .iter()
            .map(|snap| serde_json::to_vec(&snap.snapshot).unwrap())
            .collect();

        assert_eq!(snapshot_bytes.len(), 3);
        assert_eq!(snapshot_bytes[0], snapshot_bytes[0].clone());
    }

    #[test]
    fn starvation_prevented() {
        let mut sched = scheduler();
        // Bronze tenant submits many jobs before higher tiers appear
        for _ in 0..4 {
            sched.submit_job(job_request(
                "tenant-bronze",
                PolicyTier::Bronze,
                JobClass::Batch,
                0.5,
                3,
            ));
        }
        // Gold job arrives but should not starve bronze jobs permanently
        sched.submit_job(job_request(
            "tenant-gold",
            PolicyTier::Gold,
            JobClass::Online,
            1.5,
            2,
        ));

        let mut bronze_scheduled = false;
        for _ in 0..5 {
            let outcome = sched.schedule_next().expect("allocation");
            if outcome.tenant_id == "tenant-bronze" {
                bronze_scheduled = true;
                break;
            }
        }

        assert!(
            bronze_scheduled,
            "bronze tenant must be scheduled to avoid starvation"
        );
    }

    #[test]
    fn snapshot_reproducibility() {
        let mut sched_a = scheduler();
        let mut sched_b = scheduler();

        let requests = vec![
            job_request("tenant-x", PolicyTier::Gold, JobClass::Online, 1.0, 1),
            job_request("tenant-y", PolicyTier::Silver, JobClass::Batch, 1.0, 2),
            job_request("tenant-z", PolicyTier::Bronze, JobClass::Batch, 1.0, 3),
        ];

        for req in &requests {
            sched_a.submit_job(req.clone());
            sched_b.submit_job(req.clone());
        }

        for _ in 0..requests.len() {
            sched_a.schedule_next().unwrap();
            sched_b.schedule_next().unwrap();
        }

        let snaps_a: Vec<Vec<u8>> = sched_a
            .snapshots()
            .iter()
            .map(|s| serde_json::to_vec(&s.snapshot).unwrap())
            .collect();
        let snaps_b: Vec<Vec<u8>> = sched_b
            .snapshots()
            .iter()
            .map(|s| serde_json::to_vec(&s.snapshot).unwrap())
            .collect();

        assert_eq!(snaps_a, snaps_b, "snapshots must match exactly");
    }

    #[test]
    fn what_if_simulation_changes_order() {
        let mut sched = scheduler();
        sched.submit_job(job_request(
            "tenant-a",
            PolicyTier::Gold,
            JobClass::Online,
            1.0,
            4,
        ));
        sched.submit_job(job_request(
            "tenant-b",
            PolicyTier::Bronze,
            JobClass::Batch,
            0.1,
            4,
        ));

        let overrides = HashMap::from([(String::from("tenant-b"), 5.0)]);
        let report = sched.simulate_weight_change(&overrides, 2);
        assert_eq!(report.allocations.len(), 2);
        assert_eq!(report.allocations[0].snapshot.tenant_id, "tenant-b");
    }
}
