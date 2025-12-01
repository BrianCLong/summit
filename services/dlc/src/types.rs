use std::collections::BTreeSet;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub type LeaseId = Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "kind", content = "rows", rename_all = "snake_case")]
pub enum RowScope {
    All,
    Explicit(BTreeSet<String>),
}

impl RowScope {
    pub fn allows(&self, row: &str) -> bool {
        match self {
            RowScope::All => true,
            RowScope::Explicit(rows) => rows.contains(row),
        }
    }

    pub fn is_subset_of(&self, other: &RowScope) -> bool {
        match (self, other) {
            (RowScope::All, RowScope::All) => true,
            (RowScope::All, RowScope::Explicit(_)) => false,
            (RowScope::Explicit(_), RowScope::All) => true,
            (RowScope::Explicit(child), RowScope::Explicit(parent)) => child.is_subset(parent),
        }
    }

    pub fn rows(&self) -> Vec<String> {
        match self {
            RowScope::All => vec![],
            RowScope::Explicit(rows) => rows.iter().cloned().collect(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct LeaseSpec {
    pub dataset_id: String,
    pub purposes: BTreeSet<String>,
    pub row_scope: RowScope,
    pub expiry: DateTime<Utc>,
    pub revocation_hook: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AccessLogEntry {
    pub lease_id: LeaseId,
    pub dataset_id: String,
    pub row_id: String,
    pub accessed_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ComplianceReceipt {
    pub lease_id: LeaseId,
    pub dataset_id: String,
    pub purposes: BTreeSet<String>,
    pub accessed_rows: Vec<String>,
    pub total_accesses: usize,
    pub opened_at: DateTime<Utc>,
    pub closed_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct LeaseRecord {
    pub id: LeaseId,
    pub spec: LeaseSpec,
    pub parent: Option<LeaseId>,
    pub issued_at: DateTime<Utc>,
    pub revoked_at: Option<DateTime<Utc>>,
    pub closed_at: Option<DateTime<Utc>>,
    pub accesses: Vec<AccessLogEntry>,
    pub receipt: Option<ComplianceReceipt>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct LeaseSnapshot {
    pub leases: Vec<LeaseRecord>,
}

impl LeaseSnapshot {
    pub fn sorted(mut self) -> Self {
        self.leases.sort_by_key(|lease| lease.id);
        for lease in &mut self.leases {
            lease.accesses.sort_by(|a, b| {
                a.accessed_at
                    .cmp(&b.accessed_at)
                    .then(a.row_id.cmp(&b.row_id))
            });
        }
        self
    }
}
