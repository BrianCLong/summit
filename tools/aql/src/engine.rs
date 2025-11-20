use std::collections::BTreeMap;
use std::path::Path;

use crate::connectors::registry::{ConnectorRegistry, ExecutionBuffers};
use crate::error::Result;
use crate::models::{
    ConnectorKind, EvidenceRecord, ExecutionResult, ProofBundle, QueryPlan, ResultRecord,
};

pub struct ExecutionEngine {
    registry: ConnectorRegistry,
}

impl ExecutionEngine {
    pub fn new() -> Self {
        Self {
            registry: ConnectorRegistry::new(),
        }
    }

    pub fn execute<P: AsRef<Path>>(
        &self,
        plan: QueryPlan,
        fixtures_dir: P,
    ) -> Result<ExecutionResult> {
        let buffers = self.registry.execute(&plan, fixtures_dir.as_ref())?;
        let ExecutionBuffers {
            mut records,
            mut proofs,
            trace,
        } = buffers;

        let mut order: Vec<ConnectorKind> = Vec::new();
        for connector in &plan.query.connectors {
            if records.contains_key(connector) && !order.contains(connector) {
                order.push(connector.clone());
            }
        }
        for join in &plan.query.provenance_joins {
            if records.contains_key(&join.connector) && !order.contains(&join.connector) {
                order.push(join.connector.clone());
            }
        }

        let unique_join_fields: Vec<String> = plan
            .query
            .provenance_joins
            .iter()
            .map(|join| join.field.clone())
            .collect();
        let mut join_field_map: BTreeMap<ConnectorKind, String> = BTreeMap::new();
        for join in &plan.query.provenance_joins {
            join_field_map.insert(join.connector.clone(), join.field.clone());
        }

        let mut result_map: BTreeMap<String, ResultRecord> = BTreeMap::new();
        let mut join_index: BTreeMap<String, String> = BTreeMap::new();

        for connector_kind in order {
            let connector_records = records.remove(&connector_kind).unwrap_or_default();
            for record in connector_records {
                let default_key = build_default_key(&plan, &record);
                let join_keys = collect_join_keys(&record, &unique_join_fields);
                let key_from_join = if let Some(field) = join_field_map.get(&connector_kind) {
                    find_join_key(&join_index, field, &record)
                } else {
                    join_keys
                        .iter()
                        .find_map(|(field, value)| join_index.get(&format_key(field, value)))
                        .cloned()
                };
                let key = key_from_join.unwrap_or_else(|| default_key.clone());

                let entry = result_map
                    .entry(key.clone())
                    .or_insert_with(|| ResultRecord {
                        key: key.clone(),
                        subject: record.subject.clone(),
                        action: record.action.clone(),
                        timestamp: record.timestamp,
                        evidence: Vec::new(),
                        proofs: Vec::new(),
                    });
                entry.evidence.push(record.clone());

                for (field, value) in join_keys {
                    join_index
                        .entry(format_key(&field, &value))
                        .or_insert_with(|| key.clone());
                }
            }

            if let Some(proofs_for_connector) = proofs.remove(&connector_kind) {
                attach_proofs(&mut result_map, &connector_kind, proofs_for_connector);
            }
        }

        let records: Vec<ResultRecord> = result_map.into_values().collect();
        let mut result = ExecutionResult {
            plan: plan.clone(),
            records,
            trace,
        };
        result.canonicalize();
        Ok(result)
    }
}

impl Default for ExecutionEngine {
    fn default() -> Self {
        Self::new()
    }
}

fn attach_proofs(
    result_map: &mut BTreeMap<String, ResultRecord>,
    connector: &ConnectorKind,
    proofs: Vec<ProofBundle>,
) {
    if proofs.is_empty() {
        return;
    }
    for record in result_map.values_mut() {
        if record
            .evidence
            .iter()
            .any(|evidence| &evidence.connector == connector)
        {
            for proof in &proofs {
                if !record.proofs.iter().any(|existing| {
                    existing.digest == proof.digest && existing.connector == proof.connector
                }) {
                    record.proofs.push(proof.clone());
                }
            }
        }
    }
}

fn collect_join_keys(record: &EvidenceRecord, fields: &[String]) -> Vec<(String, String)> {
    fields
        .iter()
        .filter_map(|field| {
            field_value(record, field).map(|value| (field.clone(), value.to_string()))
        })
        .collect()
}

fn find_join_key(
    join_index: &BTreeMap<String, String>,
    field: &str,
    record: &EvidenceRecord,
) -> Option<String> {
    field_value(record, field).and_then(|value| join_index.get(&format_key(field, value)).cloned())
}

fn field_value<'a>(record: &'a EvidenceRecord, field: &str) -> Option<&'a str> {
    match field {
        "subject" => Some(record.subject.as_str()),
        "action" => Some(record.action.as_str()),
        "resource" => record.resource.as_deref(),
        other => record.attributes.get(other).map(|value| value.as_str()),
    }
}

fn format_key(field: &str, value: &str) -> String {
    format!(
        "{}::{}",
        field.to_ascii_lowercase(),
        value.to_ascii_lowercase()
    )
}

fn build_default_key(plan: &QueryPlan, record: &EvidenceRecord) -> String {
    format!(
        "{}|{}|{}|{}",
        plan.query.target.to_ascii_lowercase(),
        record.subject.to_ascii_lowercase(),
        record.action.to_ascii_lowercase(),
        record.timestamp.to_rfc3339()
    )
}
