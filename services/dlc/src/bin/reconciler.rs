use std::collections::{BTreeSet, HashMap};
use std::path::PathBuf;

use clap::Parser;
use dlc::{ComplianceReceipt, EventStore, LeaseEngine, LeaseRecord};
use tracing::{error, info};

#[derive(Debug, Parser)]
struct Cli {
    #[arg(long, default_value = "state/events.jsonl")]
    events: PathBuf,
    #[arg(long, default_value = "state/receipts")]
    receipts: PathBuf,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt::init();
    let cli = Cli::parse();
    let events = EventStore::read_from_path(&cli.events)?;
    let replay_snapshot = LeaseEngine::replay_snapshot(&events).sorted();
    let engine = LeaseEngine::builder()
        .with_event_path(&cli.events)
        .with_receipt_dir(&cli.receipts)
        .build()?;
    let engine_snapshot = engine.snapshot().sorted();

    let mut findings = Vec::new();
    if engine_snapshot != replay_snapshot {
        findings.push("event replay diverges from live snapshot".to_string());
    }

    let receipt_store = engine.receipt_store();
    let receipts = receipt_store.list()?;
    let receipt_index: HashMap<_, _> = receipts.into_iter().map(|r| (r.lease_id, r)).collect();

    for lease in &engine_snapshot.leases {
        validate_accesses(lease, &mut findings);
        validate_receipt(lease, receipt_index.get(&lease.id), &mut findings);
    }

    for receipt in receipt_index.values() {
        if engine_snapshot
            .leases
            .iter()
            .all(|lease| lease.id != receipt.lease_id)
        {
            findings.push(format!(
                "receipt {} has no matching lease in snapshot",
                receipt.lease_id
            ));
        }
    }

    if findings.is_empty() {
        info!(
            leases = engine_snapshot.leases.len(),
            "reconciliation complete"
        );
        println!("All leases and receipts are consistent.");
        Ok(())
    } else {
        for finding in &findings {
            error!("finding" = %finding);
            println!("ISSUE: {}", finding);
        }
        Err("reconciliation detected inconsistencies".into())
    }
}

fn validate_accesses(lease: &LeaseRecord, findings: &mut Vec<String>) {
    for access in &lease.accesses {
        if !lease.spec.row_scope.allows(&access.row_id) {
            findings.push(format!(
                "lease {} accessed row {} outside declared scope",
                lease.id, access.row_id
            ));
        }
        if access.accessed_at > lease.spec.expiry {
            findings.push(format!(
                "lease {} accessed row {} after expiry {}",
                lease.id, access.row_id, lease.spec.expiry
            ));
        }
    }
}

fn validate_receipt(
    lease: &LeaseRecord,
    receipt: Option<&ComplianceReceipt>,
    findings: &mut Vec<String>,
) {
    match (lease.closed_at, receipt) {
        (Some(_), None) => findings.push(format!(
            "lease {} was closed but no receipt is recorded",
            lease.id
        )),
        (_, Some(receipt)) => {
            if receipt.total_accesses != lease.accesses.len() {
                findings.push(format!(
                    "receipt {} total accesses mismatch: expected {}, got {}",
                    lease.id,
                    lease.accesses.len(),
                    receipt.total_accesses
                ));
            }
            let unique_rows: BTreeSet<_> = lease
                .accesses
                .iter()
                .map(|entry| entry.row_id.clone())
                .collect();
            if receipt
                .accessed_rows
                .iter()
                .cloned()
                .collect::<BTreeSet<_>>()
                != unique_rows
            {
                findings.push(format!("receipt {} row set mismatch", lease.id));
            }
            if receipt.opened_at != lease.issued_at {
                findings.push(format!(
                    "receipt {} opened_at {} does not match issued_at {}",
                    lease.id, receipt.opened_at, lease.issued_at
                ));
            }
            if let Some(closed_at) = lease.closed_at {
                if receipt.closed_at != closed_at {
                    findings.push(format!(
                        "receipt {} closed_at {} does not match lease closed_at {}",
                        lease.id, receipt.closed_at, closed_at
                    ));
                }
            }
        }
        _ => {}
    }
}
