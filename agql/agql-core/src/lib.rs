use base64::{engine::general_purpose::STANDARD as BASE64_STANDARD, Engine as _};
use chrono::{DateTime, Utc};
use ed25519_dalek::{PublicKey, Signature, Verifier};
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use std::collections::{BTreeMap, HashMap};
use std::convert::TryInto;
use thiserror::Error;
use uuid::Uuid;

/// Represents an auditable attestation stored inside the signed DAG.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Attestation {
    pub id: Uuid,
    pub artifact_id: String,
    pub proof_type: String,
    pub timestamp: DateTime<Utc>,
    #[serde(default)]
    pub payload: Map<String, Value>,
    #[serde(default)]
    pub parents: Vec<Uuid>,
    pub signer_public_key: String,
    pub signature: String,
}

impl Attestation {
    /// Validates the signature associated with the attestation.
    pub fn verify_signature(&self) -> Result<(), DagError> {
        let pk_bytes = BASE64_STANDARD
            .decode(self.signer_public_key.as_bytes())
            .map_err(|e| DagError::InvalidEncoding(e.to_string()))?;
        let pk = PublicKey::from_bytes(
            pk_bytes
                .as_slice()
                .try_into()
                .map_err(|_| DagError::InvalidEncoding("public key length is invalid".into()))?,
        )
        .map_err(|e| DagError::InvalidEncoding(e.to_string()))?;

        let sig_bytes = BASE64_STANDARD
            .decode(self.signature.as_bytes())
            .map_err(|e| DagError::InvalidEncoding(e.to_string()))?;
        let sig = Signature::from_bytes(
            sig_bytes
                .as_slice()
                .try_into()
                .map_err(|_| DagError::InvalidEncoding("signature length is invalid".into()))?,
        )
        .map_err(|e| DagError::InvalidEncoding(e.to_string()))?;

        pk.verify(&self.signing_bytes()?, &sig)
            .map_err(|_| DagError::InvalidSignature(self.id))
    }

    fn signing_bytes(&self) -> Result<Vec<u8>, DagError> {
        let mut payload_sorted = BTreeMap::new();
        for (key, value) in &self.payload {
            payload_sorted.insert(key.clone(), value.clone());
        }

        let mut parents = self.parents.clone();
        parents.sort();

        let canonical = json!({
            "id": self.id,
            "artifact_id": self.artifact_id,
            "proof_type": self.proof_type,
            "timestamp": self.timestamp.to_rfc3339(),
            "payload": payload_sorted,
            "parents": parents.iter().map(Uuid::to_string).collect::<Vec<_>>(),
        });

        serde_json::to_vec(&canonical).map_err(|e| DagError::Serialization(e.to_string()))
    }
}

/// A deterministic path through the DAG from a target attestation back to a root.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ProofPath {
    pub artifact_id: String,
    pub attestation_ids: Vec<Uuid>,
}

impl ProofPath {
    fn canonical_string(&self) -> String {
        self.attestation_ids
            .iter()
            .map(|id| id.to_string())
            .collect::<Vec<_>>()
            .join("::")
    }
}

/// Consistency issues produced when multiple attestations disagree on shared claims.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ConsistencyIssue {
    pub artifact_id: String,
    pub claim_key: String,
    pub conflicting_values: Vec<String>,
    pub attestation_ids: Vec<Uuid>,
}

/// Errors emitted while operating on the attestation DAG.
#[derive(Debug, Error)]
pub enum DagError {
    #[error("attestation {0} already exists in the graph")]
    DuplicateAttestation(Uuid),
    #[error("parent attestation {0} not found in the graph")]
    MissingParent(Uuid),
    #[error("signature verification failed for attestation {0}")]
    InvalidSignature(Uuid),
    #[error("invalid encoding: {0}")]
    InvalidEncoding(String),
    #[error("serialization error: {0}")]
    Serialization(String),
}

/// In-memory, signed directed acyclic graph of attestations.
#[derive(Debug, Default)]
pub struct AttestationGraph {
    attestations: HashMap<Uuid, Attestation>,
}

impl AttestationGraph {
    pub fn new() -> Self {
        Self::default()
    }

    /// Number of attestations stored within the graph.
    pub fn len(&self) -> usize {
        self.attestations.len()
    }

    pub fn is_empty(&self) -> bool {
        self.attestations.is_empty()
    }

    pub fn get(&self, id: &Uuid) -> Option<&Attestation> {
        self.attestations.get(id)
    }

    pub fn attestations(&self) -> impl Iterator<Item = &Attestation> {
        self.attestations.values()
    }

    /// Adds a signed attestation into the DAG, validating parent links and signatures.
    pub fn add_attestation(&mut self, attestation: Attestation) -> Result<(), DagError> {
        if self.attestations.contains_key(&attestation.id) {
            return Err(DagError::DuplicateAttestation(attestation.id));
        }

        for parent in &attestation.parents {
            if !self.attestations.contains_key(parent) {
                return Err(DagError::MissingParent(*parent));
            }
        }

        attestation.verify_signature()?;

        self.attestations.insert(attestation.id, attestation);

        Ok(())
    }

    /// Adds a batch of attestations sequentially.
    pub fn ingest_many(
        &mut self,
        attestations: impl IntoIterator<Item = Attestation>,
    ) -> Result<(), DagError> {
        for attestation in attestations {
            self.add_attestation(attestation)?;
        }
        Ok(())
    }

    /// Returns all deterministic proof paths for a given artifact id.
    pub fn proof_paths(&self, artifact_id: &str, target: Option<Uuid>) -> Vec<ProofPath> {
        let mut start_nodes: Vec<Uuid> = self
            .attestations
            .values()
            .filter(|att| att.artifact_id == artifact_id)
            .map(|att| att.id)
            .collect();
        start_nodes.sort();

        let mut result = Vec::new();
        for start in start_nodes {
            if let Some(target_id) = target {
                if start != target_id {
                    continue;
                }
            }

            let mut paths = self.paths_from(start);
            paths.sort_by(|a, b| canonical_path(a).cmp(&canonical_path(b)));
            for path in paths {
                result.push(ProofPath {
                    artifact_id: artifact_id.to_string(),
                    attestation_ids: path,
                });
            }
        }

        result.sort_by(|a, b| a.canonical_string().cmp(&b.canonical_string()));
        result
    }

    fn paths_from(&self, start: Uuid) -> Vec<Vec<Uuid>> {
        fn dfs(
            graph: &AttestationGraph,
            current: Uuid,
            working: &mut Vec<Uuid>,
            acc: &mut Vec<Vec<Uuid>>,
        ) {
            working.push(current);
            let parents = graph
                .attestations
                .get(&current)
                .map(|att| {
                    let mut parents = att.parents.clone();
                    parents.sort();
                    parents
                })
                .unwrap_or_default();

            if parents.is_empty() {
                acc.push(working.clone());
            } else {
                for parent in parents {
                    dfs(graph, parent, working, acc);
                }
            }
            working.pop();
        }

        let mut acc = Vec::new();
        let mut working = Vec::new();
        dfs(self, start, &mut working, &mut acc);
        acc
    }

    /// Detects conflicting claims across attestations for the same artifact.
    pub fn detect_inconsistencies(&self, artifact_id: &str) -> Vec<ConsistencyIssue> {
        let mut claim_map: BTreeMap<String, BTreeMap<String, Vec<Uuid>>> = BTreeMap::new();

        for attestation in self
            .attestations
            .values()
            .filter(|att| att.artifact_id == artifact_id)
        {
            for (key, value) in &attestation.payload {
                let normalized =
                    serde_json::to_string(value).unwrap_or_else(|_| "null".to_string());
                claim_map
                    .entry(key.clone())
                    .or_default()
                    .entry(normalized)
                    .or_default()
                    .push(attestation.id);
            }
        }

        let mut issues = Vec::new();
        for (claim_key, values) in claim_map {
            if values.len() > 1 {
                let mut conflicting_values: Vec<String> = values.keys().cloned().collect();
                conflicting_values.sort();

                let mut attestation_ids: Vec<Uuid> = values.values().flatten().cloned().collect();
                attestation_ids.sort();
                attestation_ids.dedup();

                issues.push(ConsistencyIssue {
                    artifact_id: artifact_id.to_string(),
                    claim_key,
                    conflicting_values,
                    attestation_ids,
                });
            }
        }

        issues
    }
}

fn canonical_path(path: &[Uuid]) -> String {
    path.iter()
        .map(|id| id.to_string())
        .collect::<Vec<_>>()
        .join("::")
}

#[cfg(test)]
mod tests {
    use super::*;
    use ed25519_dalek::{Keypair, Signer};
    use rand::rngs::OsRng;

    fn keypair() -> Keypair {
        Keypair::generate(&mut OsRng)
    }

    fn base64(bytes: &[u8]) -> String {
        BASE64_STANDARD.encode(bytes)
    }

    fn build_attestation(
        keypair: &Keypair,
        artifact_id: &str,
        proof_type: &str,
        payload: Map<String, Value>,
        parents: Vec<Uuid>,
    ) -> Attestation {
        let id = Uuid::new_v4();
        let timestamp = Utc::now();
        let signer_public_key = base64(keypair.public.as_bytes());

        let mut attestation = Attestation {
            id,
            artifact_id: artifact_id.to_string(),
            proof_type: proof_type.to_string(),
            timestamp,
            payload,
            parents,
            signer_public_key,
            signature: String::new(),
        };

        let message = attestation.signing_bytes().expect("canonical bytes");
        let signature = keypair.sign(&message);
        attestation.signature = base64(signature.to_bytes().as_ref());
        attestation
    }

    #[test]
    fn accepts_valid_attestations() {
        let keypair = keypair();
        let mut graph = AttestationGraph::new();
        let payload = Map::from_iter(vec![(
            "status".to_string(),
            Value::String("trusted".into()),
        )]);
        let root = build_attestation(&keypair, "artifact-1", "pca", payload.clone(), vec![]);
        graph.add_attestation(root.clone()).unwrap();

        let child = build_attestation(&keypair, "artifact-1", "pnc", payload, vec![root.id]);
        graph.add_attestation(child).unwrap();
        assert_eq!(graph.len(), 2);
    }

    #[test]
    fn rejects_invalid_signature() {
        let keypair = keypair();
        let mut graph = AttestationGraph::new();
        let payload = Map::from_iter(vec![(
            "status".to_string(),
            Value::String("trusted".into()),
        )]);
        let mut attestation = build_attestation(&keypair, "artifact-1", "pca", payload, vec![]);
        attestation.signature = "invalid".into();
        let result = graph.add_attestation(attestation);
        assert!(matches!(result, Err(DagError::InvalidEncoding(_))));
    }

    #[test]
    fn detects_conflicting_claims() {
        let keypair = keypair();
        let mut graph = AttestationGraph::new();

        let payload_ok = Map::from_iter(vec![(
            "status".to_string(),
            Value::String("trusted".into()),
        )]);
        let payload_bad = Map::from_iter(vec![(
            "status".to_string(),
            Value::String("revoked".into()),
        )]);

        let a = build_attestation(&keypair, "artifact-42", "pca", payload_ok, vec![]);
        let b = build_attestation(&keypair, "artifact-42", "transparency", payload_bad, vec![]);

        graph.add_attestation(a).unwrap();
        graph.add_attestation(b).unwrap();

        let issues = graph.detect_inconsistencies("artifact-42");
        assert_eq!(issues.len(), 1);
        assert_eq!(issues[0].claim_key, "status");
        assert_eq!(issues[0].conflicting_values.len(), 2);
    }

    #[test]
    fn proof_paths_are_deterministic() {
        let keypair = keypair();
        let mut graph = AttestationGraph::new();

        let root_payload = Map::new();
        let root_a = build_attestation(&keypair, "artifact-a", "pca", root_payload.clone(), vec![]);
        let root_b = build_attestation(
            &keypair,
            "artifact-a",
            "transparency",
            root_payload.clone(),
            vec![],
        );
        graph.add_attestation(root_a.clone()).unwrap();
        graph.add_attestation(root_b.clone()).unwrap();

        let child_payload = Map::from_iter(vec![(
            "status".to_string(),
            Value::String("trusted".into()),
        )]);
        let child = build_attestation(
            &keypair,
            "artifact-a",
            "pnc",
            child_payload,
            vec![root_a.id, root_b.id],
        );
        graph.add_attestation(child.clone()).unwrap();

        let first = graph.proof_paths("artifact-a", Some(child.id));
        let second = graph.proof_paths("artifact-a", Some(child.id));
        assert_eq!(first, second);
        assert_eq!(first.len(), 2);
    }
}
