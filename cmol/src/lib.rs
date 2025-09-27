use std::collections::{BTreeMap, BTreeSet};

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use blake3::Hasher;
use image::imageops::FilterType;
use serde::{Deserialize, Serialize};
use serde_json::json;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum CmolError {
    #[error("unsupported modality: {0}")]
    UnsupportedModality(String),
    #[error("invalid base64 payload: {0}")]
    InvalidBase64(String),
    #[error("image decode error: {0}")]
    ImageDecode(String),
    #[error("audio payload must be a multiple of 4 bytes of f32 PCM values")]
    InvalidAudioPayload,
    #[error("hex decode error: {0}")]
    HexDecode(String),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "lowercase")]
pub enum Modality {
    Text,
    Image,
    Audio,
    Video,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Fingerprint {
    pub asset_id: String,
    pub modality: Modality,
    pub hash: String,
    pub vector: Vec<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum AssetPayload {
    Text {
        text: String,
    },
    Image {
        data: String,
    },
    Audio {
        pcm_base64: String,
        sample_rate: u32,
    },
    Video {
        frames: Vec<String>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetInput {
    pub id: String,
    pub modality: Modality,
    pub payload: AssetPayload,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProvenanceClaim {
    pub asset_id: String,
    pub claim_type: String,
    pub value: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClaimEvidence {
    pub claim_type: String,
    pub value: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProvenanceConflict {
    pub asset_id: String,
    pub claims: Vec<ClaimEvidence>,
    pub summary: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProvenanceNode {
    pub id: String,
    pub kind: String,
    pub label: String,
    pub data: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProvenanceEdge {
    pub source: String,
    pub target: String,
    pub kind: String,
    pub weight: f64,
    pub evidence: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProvenanceGraph {
    pub nodes: Vec<ProvenanceNode>,
    pub edges: Vec<ProvenanceEdge>,
    pub conflicts: Vec<ProvenanceConflict>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LinkEvidence {
    pub from: String,
    pub to: String,
    pub similarity: f64,
    pub evidence: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisResult {
    pub fingerprints: Vec<Fingerprint>,
    pub links: Vec<LinkEvidence>,
    pub graph: ProvenanceGraph,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisRequest {
    pub assets: Vec<AssetInput>,
    #[serde(default)]
    pub claims: Vec<ProvenanceClaim>,
    #[serde(default = "default_threshold")]
    pub link_threshold: f64,
}

fn default_threshold() -> f64 {
    0.82
}

pub fn analyze(request: &AnalysisRequest) -> Result<AnalysisResult, CmolError> {
    let mut fingerprints = Vec::with_capacity(request.assets.len());

    for asset in &request.assets {
        let fp = match (&asset.modality, &asset.payload) {
            (Modality::Text, AssetPayload::Text { text }) => fingerprint_text(&asset.id, text),
            (Modality::Image, AssetPayload::Image { data }) => {
                let bytes = BASE64
                    .decode(data)
                    .map_err(|err| CmolError::InvalidBase64(err.to_string()))?;
                fingerprint_image(&asset.id, &bytes)?
            }
            (Modality::Audio, AssetPayload::Audio { pcm_base64, .. }) => {
                let bytes = BASE64
                    .decode(pcm_base64)
                    .map_err(|err| CmolError::InvalidBase64(err.to_string()))?;
                fingerprint_audio(&asset.id, &bytes)?
            }
            (Modality::Video, AssetPayload::Video { frames }) => {
                let mut decoded_frames = Vec::with_capacity(frames.len());
                for frame in frames {
                    let bytes = BASE64
                        .decode(frame)
                        .map_err(|err| CmolError::InvalidBase64(err.to_string()))?;
                    decoded_frames.push(bytes);
                }
                fingerprint_video(&asset.id, &decoded_frames)?
            }
            (other_modality, _) => {
                return Err(CmolError::UnsupportedModality(format!(
                    "{other_modality:?} payload mismatch"
                )))
            }
        };
        fingerprints.push(fp);
    }

    let links = compute_links(&fingerprints, request.link_threshold)?;
    let conflicts = detect_conflicts(&request.claims);
    let graph = build_graph(&fingerprints, &links, &request.claims, &conflicts);

    Ok(AnalysisResult {
        fingerprints,
        links,
        graph,
    })
}

fn fingerprint_text(asset_id: &str, text: &str) -> Fingerprint {
    let normalized = normalize_text(text);
    let vector = text_to_vector(&normalized);
    let hash = hash_bytes(normalized.as_bytes());

    Fingerprint {
        asset_id: asset_id.to_string(),
        modality: Modality::Text,
        hash,
        vector,
    }
}

fn fingerprint_image(asset_id: &str, bytes: &[u8]) -> Result<Fingerprint, CmolError> {
    let image = image::load_from_memory(bytes)
        .map_err(|err| CmolError::ImageDecode(err.to_string()))?
        .grayscale();

    let resized = image.resize_exact(8, 8, FilterType::Lanczos3).to_luma8();
    let mut values = Vec::with_capacity(64);
    for value in resized.as_raw() {
        values.push(*value as f64 / 255.0);
    }
    let average = values.iter().copied().sum::<f64>() / values.len() as f64;
    let mut bit_bytes = [0u8; 8];
    for (idx, value) in values.iter().enumerate() {
        if *value >= average {
            let byte_idx = idx / 8;
            let bit_idx = 7 - (idx % 8);
            bit_bytes[byte_idx] |= 1 << bit_idx;
        }
    }
    let hash = bit_bytes
        .iter()
        .map(|byte| format!("{:02x}", byte))
        .collect::<String>();
    let vector = normalize_vector(values);

    Ok(Fingerprint {
        asset_id: asset_id.to_string(),
        modality: Modality::Image,
        hash,
        vector,
    })
}

fn fingerprint_audio(asset_id: &str, bytes: &[u8]) -> Result<Fingerprint, CmolError> {
    if bytes.len() % 4 != 0 {
        return Err(CmolError::InvalidAudioPayload);
    }

    let samples: Vec<f32> = bytes
        .chunks_exact(4)
        .map(|chunk| f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]))
        .collect();

    let mut windowed = vec![0.0f64; 32];
    if samples.is_empty() {
        return Ok(Fingerprint {
            asset_id: asset_id.to_string(),
            modality: Modality::Audio,
            hash: hash_bytes(&[]),
            vector: windowed,
        });
    }

    let window_size = (samples.len() / 32).max(1);
    for (idx, chunk) in samples.chunks(window_size).take(32).enumerate() {
        let energy = chunk
            .iter()
            .map(|sample| (*sample as f64) * (*sample as f64))
            .sum::<f64>();
        windowed[idx] = (energy / chunk.len() as f64).sqrt();
    }

    let mut hasher = Hasher::new();
    let stride = (samples.len() / 256).max(1);
    for sample in samples.iter().step_by(stride) {
        hasher.update(&sample.to_le_bytes());
    }

    let vector = normalize_vector(windowed);
    let hash = hasher.finalize().to_hex().to_string();

    Ok(Fingerprint {
        asset_id: asset_id.to_string(),
        modality: Modality::Audio,
        hash,
        vector,
    })
}

fn fingerprint_video(asset_id: &str, frames: &[Vec<u8>]) -> Result<Fingerprint, CmolError> {
    if frames.is_empty() {
        return Ok(Fingerprint {
            asset_id: asset_id.to_string(),
            modality: Modality::Video,
            hash: hash_bytes(&[]),
            vector: vec![0.0; 64],
        });
    }

    let mut accum = vec![0.0f64; 64];
    let mut frame_hashes = Vec::with_capacity(frames.len());

    for frame in frames {
        let fp = fingerprint_image(asset_id, frame)?;
        for (idx, value) in fp.vector.iter().enumerate() {
            accum[idx] += *value;
        }
        frame_hashes.push(fp.hash);
    }

    let frame_count = frames.len() as f64;
    for value in &mut accum {
        *value /= frame_count;
    }

    let mut hasher = Hasher::new();
    for frame_hash in &frame_hashes {
        hasher.update(frame_hash.as_bytes());
    }
    hasher.update(&(frames.len() as u32).to_le_bytes());

    Ok(Fingerprint {
        asset_id: asset_id.to_string(),
        modality: Modality::Video,
        hash: hasher.finalize().to_hex().to_string(),
        vector: normalize_vector(accum),
    })
}

fn hash_bytes(bytes: &[u8]) -> String {
    blake3::hash(bytes).to_hex().to_string()
}

fn normalize_text(input: &str) -> String {
    input
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || ch.is_whitespace() {
                ch.to_ascii_lowercase()
            } else {
                ' '
            }
        })
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn text_to_vector(text: &str) -> Vec<f64> {
    let mut bins = vec![0.0f64; 64];
    if text.is_empty() {
        return bins;
    }

    for token in text.split_whitespace() {
        let hash = blake3::hash(token.as_bytes());
        let bytes = hash.as_bytes();
        let idx = (bytes[0] as usize) % bins.len();
        bins[idx] += 1.0;
        let idx2 = (bytes[1] as usize) % bins.len();
        bins[idx2] += 0.5;
    }

    normalize_vector(bins)
}

fn normalize_vector(mut values: Vec<f64>) -> Vec<f64> {
    let norm = values.iter().map(|v| v * v).sum::<f64>().sqrt();
    if norm > 0.0 {
        for value in &mut values {
            *value /= norm;
        }
    }
    values
}

fn compute_links(
    fingerprints: &[Fingerprint],
    threshold: f64,
) -> Result<Vec<LinkEvidence>, CmolError> {
    let mut links = Vec::new();

    for (idx_a, a) in fingerprints.iter().enumerate() {
        for b in fingerprints.iter().skip(idx_a + 1) {
            let similarity = cosine_similarity(&a.vector, &b.vector);
            if similarity >= threshold {
                let hamming = hamming_distance(&a.hash, &b.hash)?;
                links.push(LinkEvidence {
                    from: a.asset_id.clone(),
                    to: b.asset_id.clone(),
                    similarity,
                    evidence: vec![
                        format!("cosine={similarity:.4}"),
                        format!("hamming={hamming}"),
                        format!(
                            "modalities={}↔{}",
                            format_modality(&a.modality),
                            format_modality(&b.modality)
                        ),
                    ],
                });
            }
        }
    }

    links.sort_by(|left, right| {
        left.from
            .cmp(&right.from)
            .then(left.to.cmp(&right.to))
            .then(left.similarity.partial_cmp(&right.similarity).unwrap())
    });

    Ok(links)
}

fn format_modality(modality: &Modality) -> &'static str {
    match modality {
        Modality::Text => "text",
        Modality::Image => "image",
        Modality::Audio => "audio",
        Modality::Video => "video",
    }
}

fn cosine_similarity(a: &[f64], b: &[f64]) -> f64 {
    if a.is_empty() || b.is_empty() || a.len() != b.len() {
        return 0.0;
    }

    let mut dot = 0.0;
    let mut norm_a = 0.0;
    let mut norm_b = 0.0;

    for (va, vb) in a.iter().zip(b.iter()) {
        dot += va * vb;
        norm_a += va * va;
        norm_b += vb * vb;
    }

    if norm_a == 0.0 || norm_b == 0.0 {
        0.0
    } else {
        let result = dot / (norm_a.sqrt() * norm_b.sqrt());
        result.clamp(-1.0, 1.0)
    }
}

fn hamming_distance(hash_a: &str, hash_b: &str) -> Result<u32, CmolError> {
    let bytes_a = hex::decode(hash_a).map_err(|err| CmolError::HexDecode(err.to_string()))?;
    let bytes_b = hex::decode(hash_b).map_err(|err| CmolError::HexDecode(err.to_string()))?;

    let mut distance = 0;
    for (a, b) in bytes_a.iter().zip(bytes_b.iter()) {
        distance += (a ^ b).count_ones();
    }

    Ok(distance)
}

fn detect_conflicts(claims: &[ProvenanceClaim]) -> Vec<ProvenanceConflict> {
    let mut by_asset: BTreeMap<&str, Vec<&ProvenanceClaim>> = BTreeMap::new();

    for claim in claims {
        by_asset.entry(&claim.asset_id).or_default().push(claim);
    }

    let mut conflicts = Vec::new();

    for (asset_id, claims) in by_asset {
        let mut values: BTreeMap<&str, BTreeSet<&str>> = BTreeMap::new();
        for claim in &claims {
            values
                .entry(&claim.value)
                .or_default()
                .insert(&claim.claim_type);
        }

        if values.len() <= 1 {
            continue;
        }

        let mut claim_evidence = claims
            .iter()
            .map(|claim| ClaimEvidence {
                claim_type: claim.claim_type.clone(),
                value: claim.value.clone(),
                source: claim.source.clone(),
            })
            .collect::<Vec<_>>();
        claim_evidence.sort_by(|a, b| a.claim_type.cmp(&b.claim_type).then(a.value.cmp(&b.value)));

        let summary = values
            .iter()
            .map(|(value, claim_types)| {
                let mut types = claim_types.iter().copied().collect::<Vec<_>>();
                types.sort();
                format!("{value} asserted by {}", types.join(", "))
            })
            .collect::<Vec<_>>()
            .join("; ");

        conflicts.push(ProvenanceConflict {
            asset_id: asset_id.to_string(),
            claims: claim_evidence,
            summary: format!("Conflicting provenance for {asset_id}: {summary}"),
        });
    }

    conflicts.sort_by(|a, b| a.asset_id.cmp(&b.asset_id));
    conflicts
}

fn build_graph(
    fingerprints: &[Fingerprint],
    links: &[LinkEvidence],
    claims: &[ProvenanceClaim],
    conflicts: &[ProvenanceConflict],
) -> ProvenanceGraph {
    let mut nodes = Vec::new();
    let mut edges = Vec::new();

    for fp in fingerprints {
        nodes.push(ProvenanceNode {
            id: fp.asset_id.clone(),
            kind: "asset".to_string(),
            label: format!("{} ({})", fp.asset_id, format_modality(&fp.modality)),
            data: json!({
                "hash": fp.hash,
                "vector_length": fp.vector.len(),
            }),
        });
    }

    let mut claim_nodes = Vec::new();
    let mut claim_edges = Vec::new();

    let mut sorted_claims = claims.to_vec();
    sorted_claims.sort_by(|a, b| {
        a.asset_id
            .cmp(&b.asset_id)
            .then(a.claim_type.cmp(&b.claim_type))
            .then(a.value.cmp(&b.value))
    });

    for (idx, claim) in sorted_claims.iter().enumerate() {
        let node_id = format!(
            "claim/{}/{}/{}",
            claim.asset_id,
            claim.claim_type.to_lowercase(),
            idx
        );
        claim_nodes.push(ProvenanceNode {
            id: node_id.clone(),
            kind: "claim".to_string(),
            label: format!("{} => {}", claim.claim_type, claim.value),
            data: json!({
                "asset_id": claim.asset_id,
                "source": claim.source,
            }),
        });
        claim_edges.push(ProvenanceEdge {
            source: claim.asset_id.clone(),
            target: node_id,
            kind: "claim".to_string(),
            weight: 1.0,
            evidence: vec![format!("{}", claim.value)],
        });
    }

    nodes.extend(claim_nodes);
    edges.extend(claim_edges);

    for link in links {
        edges.push(ProvenanceEdge {
            source: link.from.clone(),
            target: link.to.clone(),
            kind: "fingerprint".to_string(),
            weight: link.similarity,
            evidence: link.evidence.clone(),
        });
    }

    edges.sort_by(|a, b| {
        a.source
            .cmp(&b.source)
            .then(a.target.cmp(&b.target))
            .then(a.kind.cmp(&b.kind))
            .then(a.weight.partial_cmp(&b.weight).unwrap())
    });

    nodes.sort_by(|a, b| a.id.cmp(&b.id));

    let mut graph_conflicts = conflicts.to_vec();
    graph_conflicts.sort_by(|a, b| a.asset_id.cmp(&b.asset_id));

    ProvenanceGraph {
        nodes,
        edges,
        conflicts: graph_conflicts,
    }
}

impl Default for AnalysisRequest {
    fn default() -> Self {
        Self {
            assets: Vec::new(),
            claims: Vec::new(),
            link_threshold: default_threshold(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    fn sample_text_assets() -> Vec<AssetInput> {
        vec![
            AssetInput {
                id: "caption".into(),
                modality: Modality::Text,
                payload: AssetPayload::Text {
                    text: "A red car parked beside a tree".into(),
                },
            },
            AssetInput {
                id: "transcript".into(),
                modality: Modality::Text,
                payload: AssetPayload::Text {
                    text: "A crimson automobile is next to a tall tree".into(),
                },
            },
        ]
    }

    #[test]
    fn text_similarity_is_high_for_related_content() {
        let request = AnalysisRequest {
            assets: sample_text_assets(),
            claims: vec![],
            link_threshold: 0.5,
        };

        let result = analyze(&request).expect("analysis should succeed");
        assert_eq!(result.links.len(), 1);
        assert!(result.links[0].similarity > 0.5);
    }

    #[test]
    fn unrelated_assets_stay_below_threshold() {
        let assets = vec![
            AssetInput {
                id: "caption".into(),
                modality: Modality::Text,
                payload: AssetPayload::Text {
                    text: "A red car parked beside a tree".into(),
                },
            },
            AssetInput {
                id: "sensor".into(),
                modality: Modality::Text,
                payload: AssetPayload::Text {
                    text: "Quarterly earnings beat expectations".into(),
                },
            },
        ];
        let request = AnalysisRequest {
            assets,
            claims: vec![],
            link_threshold: 0.8,
        };
        let result = analyze(&request).expect("analysis should succeed");
        assert!(result.links.is_empty());
    }

    #[test]
    fn conflicts_are_detected() {
        let assets = sample_text_assets();
        let claims = vec![
            ProvenanceClaim {
                asset_id: "caption".into(),
                claim_type: "C2PA".into(),
                value: "creator:Alice".into(),
                source: Some("c2pa.manifest".into()),
            },
            ProvenanceClaim {
                asset_id: "caption".into(),
                claim_type: "Watermark".into(),
                value: "creator:Bob".into(),
                source: Some("watermark".into()),
            },
        ];

        let request = AnalysisRequest {
            assets,
            claims,
            link_threshold: 0.5,
        };

        let result = analyze(&request).expect("analysis should succeed");
        assert_eq!(result.graph.conflicts.len(), 1);
        assert!(result.graph.conflicts[0]
            .summary
            .contains("Conflicting provenance"));
    }

    #[test]
    fn cosine_similarity_is_symmetric() {
        let request = AnalysisRequest {
            assets: sample_text_assets(),
            claims: vec![],
            link_threshold: 0.3,
        };
        let result = analyze(&request).expect("analysis should succeed");
        assert_relative_eq!(
            result.links[0].similarity,
            cosine_similarity(
                &result.fingerprints[0].vector,
                &result.fingerprints[1].vector
            ),
            epsilon = 1e-10
        );
    }
}
