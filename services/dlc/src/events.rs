use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::types::{ComplianceReceipt, LeaseSpec};

pub type EventId = Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Event {
    LeaseCreated {
        lease_id: Uuid,
        spec: LeaseSpec,
        parent: Option<Uuid>,
        issued_at: DateTime<Utc>,
    },
    AccessGranted {
        lease_id: Uuid,
        dataset_id: String,
        row_id: String,
        accessed_at: DateTime<Utc>,
    },
    AccessDenied {
        lease_id: Uuid,
        dataset_id: String,
        row_id: String,
        reason: String,
        attempted_at: DateTime<Utc>,
    },
    LeaseClosed {
        lease_id: Uuid,
        receipt: ComplianceReceipt,
    },
    LeaseRevoked {
        lease_id: Uuid,
        reason: String,
        revoked_at: DateTime<Utc>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct EventEnvelope {
    pub id: EventId,
    pub occurred_at: DateTime<Utc>,
    pub event: Event,
}

impl EventEnvelope {
    pub fn new(event: Event) -> Self {
        Self {
            id: Uuid::new_v4(),
            occurred_at: Utc::now(),
            event,
        }
    }
}
