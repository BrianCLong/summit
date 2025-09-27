use chrono::{DateTime, Utc};
use decs::{
    AccessChannel, AccessEvent, BackfillRequest, DatasetIngest, EmbargoPolicy, ExceptionRule,
    Reconciler, RegionPolicy, ScheduleEntry, Scheduler, SimulationResult, detect_breaches,
};
use once_cell::sync::Lazy;
use std::time::Duration;

static INGEST_INSTANT: Lazy<DateTime<Utc>> = Lazy::new(|| dt("2025-01-01T00:00:00Z"));

fn dt(value: &str) -> DateTime<Utc> {
    DateTime::parse_from_rfc3339(value)
        .expect("valid rfc3339")
        .with_timezone(&Utc)
}

fn policy_fixture() -> EmbargoPolicy {
    EmbargoPolicy {
        dataset: "alpha-dataset".into(),
        dataset_version: Some("v1".into()),
        regions: vec![
            RegionPolicy {
                region: "us-east".into(),
                embargo: Duration::from_secs(24 * 3600),
                cooling_off: Duration::from_secs(12 * 3600),
                exceptions: vec![ExceptionRule {
                    principal: "audit-bot".into(),
                    allow_after: dt("2025-01-01T06:00:00Z"),
                }],
            },
            RegionPolicy {
                region: "eu-central".into(),
                embargo: Duration::from_secs(48 * 3600),
                cooling_off: Duration::from_secs(24 * 3600),
                exceptions: vec![],
            },
        ],
    }
}

#[test]
fn generates_signed_schedule_with_gates() {
    let scheduler = Scheduler::new(
        vec![policy_fixture()],
        vec![DatasetIngest {
            dataset: "alpha-dataset".into(),
            ingested_at: *INGEST_INSTANT,
        }],
    );

    let schedule = scheduler.generate().expect("schedule generation");
    assert!(!schedule.signature.is_empty());
    assert_eq!(schedule.entries.len(), 2);

    let us_entry = find_entry(&schedule.entries, "us-east");
    assert_eq!(us_entry.storage_gate.open_at, dt("2025-01-02T00:00:00Z"));
    assert_eq!(us_entry.api_gate.open_at, dt("2025-01-02T12:00:00Z"));
    assert_eq!(us_entry.exceptions.len(), 1);

    let eu_entry = find_entry(&schedule.entries, "eu-central");
    assert_eq!(eu_entry.storage_gate.open_at, dt("2025-01-03T00:00:00Z"));
    assert_eq!(eu_entry.api_gate.open_at, dt("2025-01-04T00:00:00Z"));
}

#[test]
fn detect_breaches_flags_early_access() {
    let scheduler = Scheduler::new(
        vec![policy_fixture()],
        vec![DatasetIngest {
            dataset: "alpha-dataset".into(),
            ingested_at: *INGEST_INSTANT,
        }],
    );
    let schedule = scheduler.generate().expect("schedule generation");

    let events = vec![AccessEvent {
        dataset: "alpha-dataset".into(),
        region: "us-east".into(),
        principal: "field-agent".into(),
        occurred_at: dt("2025-01-01T12:00:00Z"),
        channel: AccessChannel::Api,
    }];

    let breaches = detect_breaches(&schedule, &events);
    assert_eq!(breaches.len(), 1);
    assert_eq!(breaches[0].principal, "field-agent");
}

#[test]
fn reconciler_proves_zero_breach_for_clean_logs() {
    let scheduler = Scheduler::new(
        vec![policy_fixture()],
        vec![DatasetIngest {
            dataset: "alpha-dataset".into(),
            ingested_at: *INGEST_INSTANT,
        }],
    );
    let schedule = scheduler.generate().expect("schedule generation");

    let events = vec![AccessEvent {
        dataset: "alpha-dataset".into(),
        region: "us-east".into(),
        principal: "audit-bot".into(),
        occurred_at: dt("2025-01-01T06:05:00Z"),
        channel: AccessChannel::Storage,
    }];

    let reconciler = Reconciler::new(schedule);
    let report = reconciler.reconcile(&events);
    assert!(report.zero_breach_proof);
    assert_eq!(report.breaches.len(), 0);
    assert!(!report.proof_token.is_empty());
}

#[test]
fn backfill_simulation_blocks_early_requests() {
    let scheduler = Scheduler::new(
        vec![policy_fixture()],
        vec![DatasetIngest {
            dataset: "alpha-dataset".into(),
            ingested_at: *INGEST_INSTANT,
        }],
    );
    let schedule = scheduler.generate().expect("schedule generation");

    let report = Scheduler::simulate_backfill(
        &schedule,
        &[BackfillRequest {
            dataset: "alpha-dataset".into(),
            region: "eu-central".into(),
            requested_at: dt("2025-01-02T00:00:00Z"),
            channel: AccessChannel::Storage,
        }],
    );

    assert!(!report.all_safe);
    assert_eq!(report.results.len(), 1);
    let SimulationResult { allowed, .. } = &report.results[0];
    assert!(!allowed);
}

fn find_entry<'a>(entries: &'a [ScheduleEntry], region: &str) -> &'a ScheduleEntry {
    entries
        .iter()
        .find(|entry| entry.region == region)
        .expect("entry present")
}
