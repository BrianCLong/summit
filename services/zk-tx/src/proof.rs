use base64::engine::general_purpose::STANDARD;
use base64::Engine as _;
use blake3::Hasher;
use chrono::Utc;
use serde_json::json;
use thiserror::Error;

use crate::models::{
    HashedSelector, OverlapProofRequest, ProofEnvelope, ProofResponse, ProofTranscript, ProofType,
    SelectorKind, TenantCommitment, TenantSubmission, TranscriptEntry, VerifyRequest, VerifyResponse,
};

const CIRCUIT_NAME: &str = "zk-tx-salted-blake3";

#[derive(Debug, Error)]
pub enum ProofError {
    #[error("overlap expected but not found")]
    MissingOverlap,
    #[error("disjointness expected but overlap detected")]
    DisjointnessViolated,
    #[error("invalid proof format: {0}")]
    InvalidFormat(String),
}

pub fn generate_overlap_proof(request: &OverlapProofRequest) -> Result<ProofResponse, ProofError> {
    build_proof(request, ProofType::Overlap)
}

pub fn generate_nonoverlap_proof(
    request: &OverlapProofRequest,
) -> Result<ProofResponse, ProofError> {
    build_proof(request, ProofType::NonOverlap)
}

pub fn verify_overlap(request: &VerifyRequest) -> Result<VerifyResponse, ProofError> {
    verify_proof(request, ProofType::Overlap)
}

pub fn verify_nonoverlap(request: &VerifyRequest) -> Result<VerifyResponse, ProofError> {
    verify_proof(request, ProofType::NonOverlap)
}

fn build_proof(request: &OverlapProofRequest, proof_type: ProofType) -> Result<ProofResponse, ProofError> {
    let (commit_a, hashed_a) = commit_tenant(&request.tenant_a);
    let (commit_b, hashed_b) = commit_tenant(&request.tenant_b);

    let overlap_set: Vec<HashedSelector> = hashed_a
        .iter()
        .filter(|lhs| hashed_b.iter().any(|rhs| rhs == *lhs))
        .cloned()
        .collect();

    let overlap_commitment = hash_commitment(&overlap_set);
    let overlap = !overlap_set.is_empty();

    match proof_type {
        ProofType::Overlap if !overlap => return Err(ProofError::MissingOverlap),
        ProofType::NonOverlap if overlap => return Err(ProofError::DisjointnessViolated),
        _ => {}
    }

    let transcript = ProofTranscript {
        entries: vec![
            TranscriptEntry {
                step: "tenant_commitment".to_string(),
                detail: json!({
                    "tenant_ids": [commit_a.tenant_id, commit_b.tenant_id],
                    "selector_counts": {
                        "a": request.tenant_a.selectors.count(),
                        "b": request.tenant_b.selectors.count()
                    }
                })
                .to_string(),
            },
            TranscriptEntry {
                step: "overlap_commitment".to_string(),
                detail: json!({
                    "overlap_found": overlap,
                    "commitment": overlap_commitment,
                    "cardinality": overlap_set.len()
                })
                .to_string(),
            },
        ],
        leakage: 0,
    };

    let envelope = ProofEnvelope {
        proof_type: proof_type.clone(),
        circuit: CIRCUIT_NAME.to_string(),
        created_at: Utc::now(),
        overlap,
        commitments: vec![commit_a, commit_b],
        overlap_commitment,
        transcript: transcript.clone(),
    };

    let proof_bytes = serde_json::to_vec(&envelope).map_err(|err| ProofError::InvalidFormat(err.to_string()))?;
    let proof_b64 = STANDARD.encode(proof_bytes);

    Ok(ProofResponse {
        overlap,
        proof: proof_b64,
        circuit: CIRCUIT_NAME.to_string(),
        transcript,
    })
}

fn verify_proof(request: &VerifyRequest, expected: ProofType) -> Result<VerifyResponse, ProofError> {
    let envelope: ProofEnvelope = STANDARD
        .decode(&request.proof)
        .map_err(|err| ProofError::InvalidFormat(err.to_string()))
        .and_then(|bytes| serde_json::from_slice(&bytes).map_err(|err| ProofError::InvalidFormat(err.to_string())))?;

    if envelope.proof_type != expected {
        return Err(ProofError::InvalidFormat("proof type mismatch".to_string()));
    }

    for commitment in &envelope.commitments {
        let set_commitment = hash_commitment(&commitment.hashed_selectors);
        if set_commitment != commitment.set_commitment {
            return Err(ProofError::InvalidFormat("set commitment mismatch".to_string()));
        }
    }

    let overlap_set: Vec<HashedSelector> = envelope
        .commitments
        .get(0)
        .into_iter()
        .flat_map(|first| first.hashed_selectors.iter())
        .filter(|lhs| {
            envelope
                .commitments
                .get(1)
                .into_iter()
                .flat_map(|second| second.hashed_selectors.iter())
                .any(|rhs| rhs == *lhs)
        })
        .cloned()
        .collect();

    let computed_overlap_commitment = hash_commitment(&overlap_set);
    if computed_overlap_commitment != envelope.overlap_commitment {
        return Err(ProofError::InvalidFormat("overlap commitment mismatch".to_string()));
    }

    let overlap = !overlap_set.is_empty();

    match expected {
        ProofType::Overlap if !overlap => return Err(ProofError::MissingOverlap),
        ProofType::NonOverlap if overlap => return Err(ProofError::DisjointnessViolated),
        _ => {}
    }

    Ok(VerifyResponse {
        valid: true,
        overlap,
        leakage: envelope.transcript.leakage,
    })
}

fn commit_tenant(tenant: &TenantSubmission) -> (TenantCommitment, Vec<HashedSelector>) {
    let hashed: Vec<HashedSelector> = tenant
        .selectors
        .iter()
        .map(|(kind, value)| HashedSelector {
            kind,
            digest: salted_hash(&tenant.salt, value, kind),
        })
        .collect();

    let set_commitment = hash_commitment(&hashed);

    (
        TenantCommitment {
            tenant_id: tenant.tenant_id.clone(),
            scope: tenant.scope.clone(),
            set_commitment,
            hashed_selectors: hashed.clone(),
        },
        hashed,
    )
}

fn salted_hash(salt: &str, value: &str, kind: SelectorKind) -> String {
    let mut hasher = Hasher::new();
    hasher.update(kind_prefix(kind).as_bytes());
    hasher.update(salt.as_bytes());
    hasher.update(value.as_bytes());
    hasher.finalize().to_hex().to_string()
}

fn hash_commitment(values: &[HashedSelector]) -> String {
    let mut hasher = Hasher::new();
    for item in values {
        hasher.update(item.digest.as_bytes());
        hasher.update(match item.kind {
            SelectorKind::Email => b"email",
            SelectorKind::Phone => b"phone",
            SelectorKind::Iban => b"iban",
        });
    }
    hasher.finalize().to_hex().to_string()
}

fn kind_prefix(kind: SelectorKind) -> &'static str {
    match kind {
        SelectorKind::Email => "email|",
        SelectorKind::Phone => "phone|",
        SelectorKind::Iban => "iban|",
    }
}
