use agql_core::{Attestation, AttestationGraph};
use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use serde::Serialize;
use std::{collections::BTreeSet, fs::File, path::PathBuf};
use uuid::Uuid;

#[derive(Parser)]
#[command(author, version, about = "AGQL verifier and query CLI", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Validate attestation signatures and report cross-proof conflicts.
    Verify {
        /// Path to a JSON file containing an array of attestations.
        #[arg(value_name = "FILE")]
        input: PathBuf,
    },
    /// Evaluate reachability queries over attestations in a JSON file.
    Query {
        /// Path to a JSON file containing an array of attestations.
        #[arg(value_name = "FILE")]
        input: PathBuf,
        /// Artifact identifier to query.
        #[arg(long, value_name = "ARTIFACT")]
        artifact_id: String,
        /// Optional attestation identifier to start from.
        #[arg(long, value_name = "UUID")]
        attestation: Option<Uuid>,
    },
}

#[derive(Debug, Serialize)]
struct QueryResult {
    artifact_id: String,
    attestation_ids: Vec<Uuid>,
    attestations: Vec<Attestation>,
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    match cli.command {
        Commands::Verify { input } => verify(input),
        Commands::Query {
            input,
            artifact_id,
            attestation,
        } => query(input, artifact_id, attestation),
    }
}

fn verify(path: PathBuf) -> Result<()> {
    let attestations = load_attestations(&path)?;
    let mut graph = AttestationGraph::new();
    graph
        .ingest_many(attestations)
        .with_context(|| format!("failed to ingest attestations from {}", path.display()))?;

    println!(
        "All attestation signatures verified ({} total).",
        graph.len()
    );

    let mut artifacts = BTreeSet::new();
    for att in graph.attestations() {
        artifacts.insert(att.artifact_id.clone());
    }

    let mut total_issues = 0usize;
    for artifact in artifacts {
        let issues = graph.detect_inconsistencies(&artifact);
        if issues.is_empty() {
            continue;
        }
        total_issues += issues.len();
        println!("Cross-proof inconsistencies for artifact {artifact}:");
        for issue in issues {
            println!(
                "  claim '{}': values {:?} (attestations {:?})",
                issue.claim_key, issue.conflicting_values, issue.attestation_ids
            );
        }
    }

    if total_issues == 0 {
        println!("No cross-proof inconsistencies detected.");
    }

    Ok(())
}

fn query(path: PathBuf, artifact_id: String, attestation: Option<Uuid>) -> Result<()> {
    let attestations = load_attestations(&path)?;
    let mut graph = AttestationGraph::new();
    graph
        .ingest_many(attestations)
        .with_context(|| format!("failed to ingest attestations from {}", path.display()))?;

    let paths = graph.proof_paths(&artifact_id, attestation);
    let mut results = Vec::with_capacity(paths.len());

    for path in paths {
        let mut attestation_chain = Vec::with_capacity(path.attestation_ids.len());
        for id in &path.attestation_ids {
            let att = graph
                .get(id)
                .cloned()
                .with_context(|| format!("attestation {id} referenced in path but missing"))?;
            attestation_chain.push(att);
        }

        results.push(QueryResult {
            artifact_id: path.artifact_id,
            attestation_ids: path.attestation_ids,
            attestations: attestation_chain,
        });
    }

    println!("{}", serde_json::to_string_pretty(&results)?);
    Ok(())
}

fn load_attestations(path: &PathBuf) -> Result<Vec<Attestation>> {
    let file = File::open(path)
        .with_context(|| format!("unable to open attestation file {}", path.display()))?;
    Ok(serde_json::from_reader(file)
        .with_context(|| format!("failed to parse attestations from {}", path.display()))?)
}
