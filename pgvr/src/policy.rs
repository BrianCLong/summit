use std::collections::{HashMap, HashSet};

use crate::types::VectorRecord;

#[derive(Debug, Clone)]
pub struct Policy {
    pub policy_hash: String,
    pub deny_fields: HashMap<String, HashSet<String>>,
    pub allowed_jurisdictions: HashSet<String>,
    pub allowed_purposes: HashSet<String>,
}

impl Policy {
    pub fn allows(
        &self,
        record: &VectorRecord,
        requested_fields: &HashSet<String>,
        jurisdiction: Option<&str>,
        purpose: Option<&str>,
    ) -> bool {
        if let Some(fields) = self.deny_fields.get(&record.id) {
            if requested_fields.iter().any(|field| fields.contains(field)) {
                return false;
            }
        }

        if let Some(j) = jurisdiction {
            if !self.allowed_jurisdictions.is_empty() && !self.allowed_jurisdictions.contains(j) {
                return false;
            }
        }

        if let Some(p) = purpose {
            if !self.allowed_purposes.is_empty() && !self.allowed_purposes.contains(p) {
                return false;
            }
        }

        true
    }
}
