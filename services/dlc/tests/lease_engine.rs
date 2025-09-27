use std::collections::BTreeSet;

use chrono::{Duration, Utc};
use dlc::{EventStore, LeaseEngine, LeaseError, LeaseSpec, RowScope};
use pretty_assertions::assert_eq;
use tempfile::tempdir;

fn spec_with_scope(rows: &[&str]) -> LeaseSpec {
    LeaseSpec {
        dataset_id: "dataset-alpha".to_string(),
        purposes: BTreeSet::from(["analytics".to_string()]),
        row_scope: RowScope::Explicit(rows.iter().map(|r| r.to_string()).collect::<BTreeSet<_>>()),
        expiry: Utc::now() + Duration::hours(1),
        revocation_hook: Some("https://example.com/hooks/revoke".to_string()),
    }
}

#[test]
fn access_outside_scope_is_denied() {
    let temp = tempdir().unwrap();
    let events = temp.path().join("events.jsonl");
    let receipts = temp.path().join("receipts");
    let engine = LeaseEngine::builder()
        .with_event_path(&events)
        .with_receipt_dir(&receipts)
        .build()
        .unwrap();

    let lease = engine
        .create_lease(spec_with_scope(&["row-1", "row-2"]), None)
        .unwrap();
    engine
        .record_access(lease.id, "row-1".to_string())
        .expect("in scope access succeeds");
    let err = engine
        .record_access(lease.id, "row-3".to_string())
        .expect_err("row outside scope should be denied");
    match err {
        LeaseError::OutOfScope { lease_id, row_id } => {
            assert_eq!(lease_id, lease.id);
            assert_eq!(row_id, "row-3");
        }
        _ => panic!("unexpected error: {err:?}"),
    }
}

#[test]
fn receipts_match_access_logs() {
    let temp = tempdir().unwrap();
    let events = temp.path().join("events.jsonl");
    let receipts = temp.path().join("receipts");
    let engine = LeaseEngine::builder()
        .with_event_path(&events)
        .with_receipt_dir(&receipts)
        .build()
        .unwrap();

    let lease = engine
        .create_lease(spec_with_scope(&["row-a", "row-b"]), None)
        .unwrap();
    engine
        .record_access(lease.id, "row-a".to_string())
        .expect("first access");
    engine
        .record_access(lease.id, "row-b".to_string())
        .expect("second access");
    let receipt = engine.close_lease(lease.id).expect("close to succeed");
    assert_eq!(receipt.total_accesses, 2);
    assert_eq!(receipt.accessed_rows.len(), 2);
    assert!(receipt.accessed_rows.contains(&"row-a".to_string()));
    assert!(receipt.accessed_rows.contains(&"row-b".to_string()));

    let snapshot = engine.snapshot();
    let lease_snapshot = snapshot
        .leases
        .into_iter()
        .find(|l| l.id == lease.id)
        .expect("lease present in snapshot");
    assert!(
        lease_snapshot.receipt.is_some(),
        "receipt stored in snapshot"
    );
    assert_eq!(lease_snapshot.accesses.len(), 2);
}

#[test]
fn replays_reproduce_state() {
    let temp = tempdir().unwrap();
    let events = temp.path().join("events.jsonl");
    let receipts = temp.path().join("receipts");
    let engine = LeaseEngine::builder()
        .with_event_path(&events)
        .with_receipt_dir(&receipts)
        .build()
        .unwrap();

    let root_lease = engine
        .create_lease(spec_with_scope(&["r1", "r2", "r3"]), None)
        .unwrap();
    let attenuated_spec = LeaseSpec {
        dataset_id: "dataset-alpha".to_string(),
        purposes: BTreeSet::from(["analytics".to_string()]),
        row_scope: RowScope::Explicit(BTreeSet::from(["r1".to_string()])),
        expiry: root_lease.spec.expiry,
        revocation_hook: None,
    };
    let sub_lease = engine
        .attenuate(root_lease.id, attenuated_spec)
        .expect("attenuation must succeed");
    engine
        .record_access(root_lease.id, "r2".to_string())
        .unwrap();
    engine
        .record_access(sub_lease.id, "r1".to_string())
        .unwrap();
    engine.close_lease(sub_lease.id).unwrap();

    let engine_snapshot = engine.snapshot().sorted();
    let events = EventStore::read_from_path(&events).unwrap();
    let replay_snapshot = LeaseEngine::replay_snapshot(&events).sorted();

    assert_eq!(engine_snapshot, replay_snapshot);
}
