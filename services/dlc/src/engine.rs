use std::collections::{BTreeSet, HashMap};
use std::path::{Path, PathBuf};
use std::sync::Arc;

use chrono::{DateTime, Utc};
use parking_lot::RwLock;
use thiserror::Error;
use uuid::Uuid;

use crate::events::{Event, EventEnvelope};
use crate::store::{EventStore, ReceiptStore, StoreError};
use crate::types::{
    AccessLogEntry, ComplianceReceipt, LeaseId, LeaseRecord, LeaseSnapshot, LeaseSpec,
};

#[derive(Debug, Error)]
pub enum LeaseError {
    #[error("store error: {0}")]
    Store(#[from] StoreError),
    #[error("lease {0} not found")]
    NotFound(LeaseId),
    #[error("lease {0} is revoked")]
    Revoked(LeaseId),
    #[error("lease {0} is closed")]
    Closed(LeaseId),
    #[error("lease {lease_id} expired at {expiry}")]
    Expired {
        lease_id: LeaseId,
        expiry: DateTime<Utc>,
    },
    #[error("row {row_id} is outside scope for lease {lease_id}")]
    OutOfScope { lease_id: LeaseId, row_id: String },
    #[error("dataset mismatch between parent and child lease")]
    DatasetMismatch,
    #[error("purposes for child lease must be subset of parent")]
    PurposeMismatch,
    #[error("row scope for child lease must be subset of parent")]
    ScopeMismatch,
    #[error("expiry for child lease must be no later than parent expiry")]
    ExpiryMismatch,
}

#[derive(Debug, Clone)]
pub struct LeaseEngineBuilder {
    event_path: PathBuf,
    receipt_dir: PathBuf,
}

impl Default for LeaseEngineBuilder {
    fn default() -> Self {
        Self {
            event_path: PathBuf::from("state/events.jsonl"),
            receipt_dir: PathBuf::from("state/receipts"),
        }
    }
}

impl LeaseEngineBuilder {
    pub fn with_event_path<P: AsRef<Path>>(mut self, path: P) -> Self {
        self.event_path = path.as_ref().to_path_buf();
        self
    }

    pub fn with_receipt_dir<P: AsRef<Path>>(mut self, dir: P) -> Self {
        self.receipt_dir = dir.as_ref().to_path_buf();
        self
    }

    pub fn build(self) -> Result<LeaseEngine, LeaseError> {
        let event_store = Arc::new(EventStore::open(&self.event_path)?);
        let receipt_store = Arc::new(ReceiptStore::new(&self.receipt_dir)?);
        let mut state = HashMap::new();
        let events = event_store.load()?;
        for envelope in events {
            apply_event(&mut state, &envelope.event);
        }
        Ok(LeaseEngine {
            event_store,
            receipt_store,
            state: Arc::new(RwLock::new(state)),
        })
    }
}

#[derive(Debug, Clone)]
pub struct LeaseEngine {
    event_store: Arc<EventStore>,
    receipt_store: Arc<ReceiptStore>,
    state: Arc<RwLock<HashMap<LeaseId, LeaseRecord>>>,
}

impl LeaseEngine {
    pub fn builder() -> LeaseEngineBuilder {
        LeaseEngineBuilder::default()
    }

    pub fn create_lease(
        &self,
        spec: LeaseSpec,
        parent: Option<LeaseId>,
    ) -> Result<LeaseRecord, LeaseError> {
        if let Some(parent_id) = parent {
            self.validate_attenuation(&spec, parent_id)?;
        }
        let lease_id = Uuid::new_v4();
        let issued_at = Utc::now();
        let record = LeaseRecord {
            id: lease_id,
            spec: spec.clone(),
            parent,
            issued_at,
            revoked_at: None,
            closed_at: None,
            accesses: Vec::new(),
            receipt: None,
        };
        let envelope = EventEnvelope::new(Event::LeaseCreated {
            lease_id,
            spec,
            parent,
            issued_at,
        });
        self.event_store.append(&envelope)?;
        self.state.write().insert(lease_id, record.clone());
        Ok(record)
    }

    pub fn attenuate(&self, parent: LeaseId, spec: LeaseSpec) -> Result<LeaseRecord, LeaseError> {
        self.create_lease(spec, Some(parent))
    }

    pub fn record_access(
        &self,
        lease_id: LeaseId,
        row_id: String,
    ) -> Result<AccessLogEntry, LeaseError> {
        let mut state = self.state.write();
        let record = state
            .get_mut(&lease_id)
            .ok_or(LeaseError::NotFound(lease_id))?;
        self.ensure_active(record)?;
        if !record.spec.row_scope.allows(&row_id) {
            let envelope = EventEnvelope::new(Event::AccessDenied {
                lease_id,
                dataset_id: record.spec.dataset_id.clone(),
                row_id: row_id.clone(),
                reason: format!("row {} denied", row_id),
                attempted_at: Utc::now(),
            });
            self.event_store.append(&envelope)?;
            return Err(LeaseError::OutOfScope { lease_id, row_id });
        }
        let accessed_at = Utc::now();
        let entry = AccessLogEntry {
            lease_id,
            dataset_id: record.spec.dataset_id.clone(),
            row_id: row_id.clone(),
            accessed_at,
        };
        let envelope = EventEnvelope::new(Event::AccessGranted {
            lease_id,
            dataset_id: record.spec.dataset_id.clone(),
            row_id,
            accessed_at,
        });
        self.event_store.append(&envelope)?;
        record.accesses.push(entry.clone());
        Ok(entry)
    }

    pub fn close_lease(&self, lease_id: LeaseId) -> Result<ComplianceReceipt, LeaseError> {
        let mut state = self.state.write();
        let record = state
            .get_mut(&lease_id)
            .ok_or(LeaseError::NotFound(lease_id))?;
        self.ensure_not_closed(record, lease_id)?;
        let closed_at = Utc::now();
        record.closed_at = Some(closed_at);
        let accessed_rows: BTreeSet<String> = record
            .accesses
            .iter()
            .map(|entry| entry.row_id.clone())
            .collect();
        let receipt = ComplianceReceipt {
            lease_id,
            dataset_id: record.spec.dataset_id.clone(),
            purposes: record.spec.purposes.clone(),
            accessed_rows: accessed_rows.into_iter().collect(),
            total_accesses: record.accesses.len(),
            opened_at: record.issued_at,
            closed_at,
        };
        record.receipt = Some(receipt.clone());
        let envelope = EventEnvelope::new(Event::LeaseClosed {
            lease_id,
            receipt: receipt.clone(),
        });
        self.event_store.append(&envelope)?;
        self.receipt_store.write(&receipt)?;
        Ok(receipt)
    }

    pub fn revoke(&self, lease_id: LeaseId, reason: impl Into<String>) -> Result<(), LeaseError> {
        let mut state = self.state.write();
        let record = state
            .get_mut(&lease_id)
            .ok_or(LeaseError::NotFound(lease_id))?;
        if record.revoked_at.is_some() {
            return Ok(());
        }
        let revoked_at = Utc::now();
        record.revoked_at = Some(revoked_at);
        let envelope = EventEnvelope::new(Event::LeaseRevoked {
            lease_id,
            reason: reason.into(),
            revoked_at,
        });
        self.event_store.append(&envelope)?;
        Ok(())
    }

    pub fn snapshot(&self) -> LeaseSnapshot {
        let state = self.state.read();
        let mut leases: Vec<LeaseRecord> = state.values().cloned().collect();
        leases.sort_by_key(|lease| lease.id);
        LeaseSnapshot { leases }
    }

    pub fn event_store(&self) -> Arc<EventStore> {
        Arc::clone(&self.event_store)
    }

    pub fn receipt_store(&self) -> Arc<ReceiptStore> {
        Arc::clone(&self.receipt_store)
    }

    pub fn replay_snapshot(events: &[EventEnvelope]) -> LeaseSnapshot {
        let mut state = HashMap::new();
        for envelope in events {
            apply_event(&mut state, &envelope.event);
        }
        let mut leases: Vec<LeaseRecord> = state.values().cloned().collect();
        leases.sort_by_key(|lease| lease.id);
        LeaseSnapshot { leases }
    }

    fn ensure_active(&self, record: &LeaseRecord) -> Result<(), LeaseError> {
        if let Some(_) = record.revoked_at {
            return Err(LeaseError::Revoked(record.id));
        }
        if let Some(_) = record.closed_at {
            return Err(LeaseError::Closed(record.id));
        }
        if Utc::now() > record.spec.expiry {
            return Err(LeaseError::Expired {
                lease_id: record.id,
                expiry: record.spec.expiry,
            });
        }
        Ok(())
    }

    fn ensure_not_closed(&self, record: &LeaseRecord, lease_id: LeaseId) -> Result<(), LeaseError> {
        if let Some(_) = record.closed_at {
            return Err(LeaseError::Closed(lease_id));
        }
        if let Some(_) = record.revoked_at {
            return Err(LeaseError::Revoked(lease_id));
        }
        Ok(())
    }

    fn validate_attenuation(&self, spec: &LeaseSpec, parent_id: LeaseId) -> Result<(), LeaseError> {
        let state = self.state.read();
        let parent = state
            .get(&parent_id)
            .ok_or(LeaseError::NotFound(parent_id))?;
        if parent.spec.dataset_id != spec.dataset_id {
            return Err(LeaseError::DatasetMismatch);
        }
        if !spec.purposes.is_subset(&parent.spec.purposes) {
            return Err(LeaseError::PurposeMismatch);
        }
        if !spec.row_scope.is_subset_of(&parent.spec.row_scope) {
            return Err(LeaseError::ScopeMismatch);
        }
        if spec.expiry > parent.spec.expiry {
            return Err(LeaseError::ExpiryMismatch);
        }
        Ok(())
    }
}

fn apply_event(state: &mut HashMap<LeaseId, LeaseRecord>, event: &Event) {
    match event {
        Event::LeaseCreated {
            lease_id,
            spec,
            parent,
            issued_at,
        } => {
            state.insert(
                *lease_id,
                LeaseRecord {
                    id: *lease_id,
                    spec: spec.clone(),
                    parent: *parent,
                    issued_at: *issued_at,
                    revoked_at: None,
                    closed_at: None,
                    accesses: Vec::new(),
                    receipt: None,
                },
            );
        }
        Event::AccessGranted {
            lease_id,
            dataset_id,
            row_id,
            accessed_at,
        } => {
            if let Some(record) = state.get_mut(lease_id) {
                record.accesses.push(AccessLogEntry {
                    lease_id: *lease_id,
                    dataset_id: dataset_id.clone(),
                    row_id: row_id.clone(),
                    accessed_at: *accessed_at,
                });
            }
        }
        Event::AccessDenied { .. } => {}
        Event::LeaseClosed { lease_id, receipt } => {
            if let Some(record) = state.get_mut(lease_id) {
                record.closed_at = Some(receipt.closed_at);
                record.receipt = Some(receipt.clone());
            }
        }
        Event::LeaseRevoked {
            lease_id,
            revoked_at,
            ..
        } => {
            if let Some(record) = state.get_mut(lease_id) {
                record.revoked_at = Some(*revoked_at);
            }
        }
    }
}
