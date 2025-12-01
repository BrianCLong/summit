use std::fs;
use std::path::{Path, PathBuf};

use serde::Deserialize;

use crate::error::{AqlError, Result};
use crate::models::{ConnectorKind, EvidenceRecord, ProofBundle, QueryPlan};

use super::{parse_timestamp, Connector};

pub struct ConnectorRegistry {
    connectors: Vec<Box<dyn Connector + Send + Sync>>,
}

impl ConnectorRegistry {
    pub fn new() -> Self {
        Self {
            connectors: vec![
                Box::new(JsonConnector::new(
                    ConnectorKind::Logs,
                    "logs.json",
                    Some("logs-proofs.json"),
                )),
                Box::new(JsonConnector::new(
                    ConnectorKind::Ledger,
                    "ledger.json",
                    Some("ledger-proofs.json"),
                )),
                Box::new(JsonConnector::new(
                    ConnectorKind::Idtl,
                    "idtl.json",
                    Some("idtl-proofs.json"),
                )),
                Box::new(JsonConnector::new(
                    ConnectorKind::Mpc,
                    "mpc.json",
                    Some("mpc-proofs.json"),
                )),
            ],
        }
    }

    pub fn get(&self, kind: &ConnectorKind) -> Option<&(dyn Connector + Send + Sync)> {
        self.connectors
            .iter()
            .map(|boxed| boxed.as_ref())
            .find(|connector| connector.kind() == *kind)
    }

    pub fn execute(&self, plan: &QueryPlan, fixtures_dir: &Path) -> Result<ExecutionBuffers> {
        let mut requested: std::collections::BTreeSet<ConnectorKind> =
            std::collections::BTreeSet::new();
        requested.extend(plan.query.connectors.iter().cloned());
        requested.extend(
            plan.query
                .provenance_joins
                .iter()
                .map(|join| join.connector.clone()),
        );
        let base_connectors: std::collections::BTreeSet<ConnectorKind> =
            plan.query.connectors.iter().cloned().collect();

        let mut buffers = ExecutionBuffers::default();
        for connector_kind in requested {
            let connector = self
                .get(&connector_kind)
                .ok_or_else(|| AqlError::UnknownConnector(connector_kind.as_str().into()))?;
            let apply_filters = base_connectors.contains(&connector_kind);
            let (records, proofs) =
                connector.fetch(plan, fixtures_dir, &mut buffers.trace, apply_filters)?;
            buffers
                .records
                .entry(connector.kind())
                .or_default()
                .extend(records);
            if plan.query.proofs {
                buffers
                    .proofs
                    .entry(connector.kind())
                    .or_default()
                    .extend(proofs);
            }
        }

        Ok(buffers)
    }
}

#[derive(Default)]
pub struct ExecutionBuffers {
    pub records: std::collections::BTreeMap<ConnectorKind, Vec<EvidenceRecord>>,
    pub proofs: std::collections::BTreeMap<ConnectorKind, Vec<ProofBundle>>,
    pub trace: crate::models::ExecutionTrace,
}

struct JsonConnector {
    kind: ConnectorKind,
    evidence_file: &'static str,
    proofs_file: Option<&'static str>,
}

impl JsonConnector {
    fn new(
        kind: ConnectorKind,
        evidence_file: &'static str,
        proofs_file: Option<&'static str>,
    ) -> Self {
        Self {
            kind,
            evidence_file,
            proofs_file,
        }
    }

    fn evidence_path(&self, fixtures_dir: &Path) -> PathBuf {
        fixtures_dir.join(self.evidence_file)
    }

    fn proofs_path(&self, fixtures_dir: &Path) -> Option<PathBuf> {
        self.proofs_file.map(|file| fixtures_dir.join(file))
    }
}

impl Connector for JsonConnector {
    fn kind(&self) -> ConnectorKind {
        self.kind.clone()
    }

    fn load_records(&self, fixtures_dir: &Path) -> Result<Vec<EvidenceRecord>> {
        let path = self.evidence_path(fixtures_dir);
        let content = fs::read_to_string(&path)?;
        let raw: Vec<FixtureEvidence> = serde_json::from_str(&content)?;
        raw.into_iter()
            .map(|fixture| fixture.into_record(self.kind.clone()))
            .collect()
    }

    fn load_proofs(&self, fixtures_dir: &Path) -> Result<Vec<ProofBundle>> {
        if let Some(path) = self.proofs_path(fixtures_dir) {
            if path.exists() {
                let content = fs::read_to_string(&path)?;
                let raw: Vec<FixtureProof> = serde_json::from_str(&content)?;
                Ok(raw
                    .into_iter()
                    .map(|fixture| fixture.into_proof(self.kind.clone()))
                    .collect())
            } else {
                Ok(Vec::new())
            }
        } else {
            Ok(Vec::new())
        }
    }
}

#[derive(Deserialize)]
struct FixtureEvidence {
    id: String,
    timestamp: String,
    subject: String,
    action: String,
    #[serde(default)]
    resource: Option<String>,
    #[serde(default)]
    attributes: std::collections::BTreeMap<String, String>,
    #[serde(default)]
    provenance: Vec<FixtureProvenance>,
}

#[derive(Deserialize)]
struct FixtureProvenance {
    source_connector: String,
    relation: String,
    reference: String,
}

impl FixtureEvidence {
    fn into_record(self, connector: ConnectorKind) -> Result<EvidenceRecord> {
        Ok(EvidenceRecord {
            connector,
            id: self.id,
            timestamp: parse_timestamp(&self.timestamp)?,
            subject: self.subject,
            action: self.action,
            resource: self.resource,
            attributes: self.attributes,
            provenance: self
                .provenance
                .into_iter()
                .map(|edge| edge.into_edge())
                .collect(),
        })
    }
}

impl FixtureProvenance {
    fn into_edge(self) -> crate::models::ProvenanceEdge {
        crate::models::ProvenanceEdge {
            source_connector: self.source_connector,
            relation: self.relation,
            reference: self.reference,
        }
    }
}

#[derive(Deserialize)]
struct FixtureProof {
    artifact: String,
    digest: String,
}

impl FixtureProof {
    fn into_proof(self, connector: ConnectorKind) -> ProofBundle {
        ProofBundle {
            connector,
            artifact: self.artifact,
            digest: self.digest,
        }
    }
}

// Ensure the registry implements Default for ergonomic construction.
impl Default for ConnectorRegistry {
    fn default() -> Self {
        Self::new()
    }
}
