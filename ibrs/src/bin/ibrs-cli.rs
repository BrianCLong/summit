use std::fs;
use std::path::PathBuf;

use clap::{Parser, Subcommand};
use ibrs::{Engine, EngineError, EvaluationResult, Proof};
use serde_json::Value;

#[derive(Parser)]
#[command(
    name = "ibrs-cli",
    version,
    about = "Immutable Business Rules Sandbox CLI"
)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Evaluate rules against a fact snapshot and emit a proof
    Evaluate {
        /// Path to the rules DSL file
        #[arg(long)]
        rules: PathBuf,
        /// Path to the facts JSON file
        #[arg(long)]
        facts: PathBuf,
        /// Optional path to write the resulting decision and proof as JSON
        #[arg(long)]
        output: Option<PathBuf>,
    },
    /// Verify a proof offline by replaying it deterministically
    Verify {
        #[arg(long)]
        rules: PathBuf,
        #[arg(long)]
        facts: PathBuf,
        #[arg(long)]
        proof: PathBuf,
        /// Optional path to write the reconstructed decision result
        #[arg(long)]
        output: Option<PathBuf>,
    },
}

fn main() -> Result<(), EngineError> {
    let cli = Cli::parse();
    match cli.command {
        Commands::Evaluate {
            rules,
            facts,
            output,
        } => {
            let rules =
                fs::read_to_string(rules).map_err(|err| EngineError::Io(err.to_string()))?;
            let facts: Value = serde_json::from_str(
                &fs::read_to_string(facts).map_err(|err| EngineError::Io(err.to_string()))?,
            )
            .map_err(|err| EngineError::InvalidProof(err.to_string()))?;
            let engine = Engine::new(&rules)?;
            let result = engine.evaluate(&facts)?;
            emit_result(&result, output)?;
        }
        Commands::Verify {
            rules,
            facts,
            proof,
            output,
        } => {
            let rules =
                fs::read_to_string(rules).map_err(|err| EngineError::Io(err.to_string()))?;
            let facts: Value = serde_json::from_str(
                &fs::read_to_string(facts).map_err(|err| EngineError::Io(err.to_string()))?,
            )
            .map_err(|err| EngineError::InvalidProof(err.to_string()))?;
            let proof: Proof = serde_json::from_str(
                &fs::read_to_string(proof).map_err(|err| EngineError::Io(err.to_string()))?,
            )
            .map_err(|err| EngineError::InvalidProof(err.to_string()))?;
            let engine = Engine::new(&rules)?;
            let result = engine.verify_proof(&facts, &proof)?;
            emit_result(&result, output)?;
        }
    }
    Ok(())
}

fn emit_result(result: &EvaluationResult, output: Option<PathBuf>) -> Result<(), EngineError> {
    let json = serde_json::to_string_pretty(result)
        .map_err(|err| EngineError::InvalidProof(err.to_string()))?;
    if let Some(path) = output {
        fs::write(path, json).map_err(|err| EngineError::Io(err.to_string()))?;
    } else {
        println!("{}", json);
    }
    Ok(())
}
