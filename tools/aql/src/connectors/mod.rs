use std::path::Path;

use chrono::Utc;

use crate::error::{AqlError, Result};
use crate::models::{
    Condition, ConnectorKind, EvidenceRecord, ExecutionTrace, ProofBundle, QueryPlan, TimeBounds,
};

pub mod registry;

pub trait Connector {
    fn kind(&self) -> ConnectorKind;
    fn name(&self) -> &'static str {
        self.kind().as_str()
    }
    fn load_records(&self, fixtures_dir: &Path) -> Result<Vec<EvidenceRecord>>;
    fn load_proofs(&self, fixtures_dir: &Path) -> Result<Vec<ProofBundle>> {
        let _ = fixtures_dir;
        Ok(Vec::new())
    }

    fn fetch(
        &self,
        plan: &QueryPlan,
        fixtures_dir: &Path,
        trace: &mut ExecutionTrace,
        apply_filters: bool,
    ) -> Result<(Vec<EvidenceRecord>, Vec<ProofBundle>)> {
        let mut records = self.load_records(fixtures_dir)?;
        let mut proofs = if plan.query.proofs {
            self.load_proofs(fixtures_dir)?
        } else {
            Vec::new()
        };

        if apply_filters {
            records.retain(|record| matches_conditions(record, &plan.query.conditions));
            if let Some(bounds) = &plan.query.time_bounds {
                records.retain(|record| within_bounds(record, bounds));
            }
        }
        records.sort_by(|a, b| a.id.cmp(&b.id));
        proofs.sort_by(|a, b| a.digest.cmp(&b.digest));

        trace.record(
            format!("connector:{}", self.name()),
            format!("returned {} records", records.len()),
        );

        Ok((records, proofs))
    }
}

fn matches_conditions(record: &EvidenceRecord, conditions: &[Condition]) -> bool {
    conditions.iter().all(|condition| {
        let value = match condition.field.as_str() {
            "subject" => Some(record.subject.as_str()),
            "action" => Some(record.action.as_str()),
            "resource" => record.resource.as_deref(),
            field => record.attributes.get(field).map(|s| s.as_str()),
        };
        value
            .map(|v| v.eq_ignore_ascii_case(&condition.value))
            .unwrap_or(false)
    })
}

fn within_bounds(record: &EvidenceRecord, bounds: &TimeBounds) -> bool {
    record.timestamp >= bounds.start && record.timestamp <= bounds.end
}

pub fn parse_timestamp(input: &str) -> Result<chrono::DateTime<Utc>> {
    input
        .parse::<chrono::DateTime<Utc>>()
        .map_err(|_| AqlError::InvalidTimestamp(input.to_string()))
}
