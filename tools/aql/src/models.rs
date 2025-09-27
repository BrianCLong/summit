use std::collections::BTreeMap;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct Condition {
    pub field: String,
    pub value: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct TimeBounds {
    pub start: DateTime<Utc>,
    pub end: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct ProvenanceJoin {
    pub connector: ConnectorKind,
    pub field: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "lowercase")]
pub enum ConnectorKind {
    Logs,
    Ledger,
    Idtl,
    Mpc,
}

impl ConnectorKind {
    pub fn from_str(input: &str) -> Option<Self> {
        match input.to_ascii_lowercase().as_str() {
            "logs" => Some(Self::Logs),
            "ledger" => Some(Self::Ledger),
            "idtl" | "identity" => Some(Self::Idtl),
            "mpc" | "mpc_proofs" | "mpcproofs" => Some(Self::Mpc),
            _ => None,
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            ConnectorKind::Logs => "logs",
            ConnectorKind::Ledger => "ledger",
            ConnectorKind::Idtl => "idtl",
            ConnectorKind::Mpc => "mpc",
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct Query {
    pub target: String,
    pub conditions: Vec<Condition>,
    pub connectors: Vec<ConnectorKind>,
    pub time_bounds: Option<TimeBounds>,
    pub provenance_joins: Vec<ProvenanceJoin>,
    pub proofs: bool,
    pub explain: bool,
}

impl Query {
    pub fn requires_connector(&self, connector: &ConnectorKind) -> bool {
        self.connectors.contains(connector)
            || self
                .provenance_joins
                .iter()
                .any(|join| &join.connector == connector)
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct QueryPlan {
    pub query: Query,
}

impl QueryPlan {
    pub fn new(query: Query) -> Self {
        Self { query }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct EvidenceRecord {
    pub connector: ConnectorKind,
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub subject: String,
    pub action: String,
    pub resource: Option<String>,
    pub attributes: BTreeMap<String, String>,
    pub provenance: Vec<ProvenanceEdge>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct ProvenanceEdge {
    pub source_connector: String,
    pub relation: String,
    pub reference: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct ProofBundle {
    pub connector: ConnectorKind,
    pub artifact: String,
    pub digest: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct ResultRecord {
    pub key: String,
    pub subject: String,
    pub action: String,
    pub timestamp: DateTime<Utc>,
    pub evidence: Vec<EvidenceRecord>,
    pub proofs: Vec<ProofBundle>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct ExecutionTraceStep {
    pub step: String,
    pub detail: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct ExecutionTrace {
    pub steps: Vec<ExecutionTraceStep>,
}

impl ExecutionTrace {
    pub fn new() -> Self {
        Self { steps: Vec::new() }
    }

    pub fn record(&mut self, step: impl Into<String>, detail: impl Into<String>) {
        self.steps.push(ExecutionTraceStep {
            step: step.into(),
            detail: detail.into(),
        });
    }
}

impl Default for ExecutionTrace {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct ExecutionResult {
    pub plan: QueryPlan,
    pub records: Vec<ResultRecord>,
    pub trace: ExecutionTrace,
}

impl ExecutionResult {
    pub fn canonicalize(&mut self) {
        self.records.sort_by(|a, b| a.key.cmp(&b.key));
        for record in &mut self.records {
            record.evidence.sort_by(|a, b| a.id.cmp(&b.id));
            record.proofs.sort_by(|a, b| a.digest.cmp(&b.digest));
        }
        self.trace
            .steps
            .sort_by(|a, b| a.step.cmp(&b.step).then_with(|| a.detail.cmp(&b.detail)));
    }
}
