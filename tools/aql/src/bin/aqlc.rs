use std::fs;
use std::path::PathBuf;

use anyhow::Result;
use aql_engine::{parse_query, ExecutionEngine, ExecutionResult, QueryPlan, Verifier};
use clap::{ArgGroup, Parser};

#[derive(Parser, Debug)]
#[command(name = "aqlc", about = "Audit Query Language compiler and executor")]
#[command(group(ArgGroup::new("source").args(["query", "file"]).required(true)))]
struct Cli {
    /// Inline query to execute
    #[arg(long)]
    query: Option<String>,

    /// Path to a file containing the query
    #[arg(long)]
    file: Option<PathBuf>,

    /// Directory that contains fixture evidence
    #[arg(long, default_value = "fixtures")]
    fixtures: PathBuf,

    /// When provided, writes execution output to the specified file
    #[arg(long)]
    output: Option<PathBuf>,

    /// Replays provenance against a previously captured execution result
    #[arg(long)]
    verify: Option<PathBuf>,
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    let query_source = if let Some(query) = cli.query {
        query
    } else if let Some(file) = cli.file {
        fs::read_to_string(file)?
    } else {
        unreachable!("clap enforced either --query or --file")
    };

    let query = parse_query(&query_source)?;
    let plan = QueryPlan::new(query.clone());

    let engine = ExecutionEngine::new();
    let mut result = engine.execute(plan.clone(), &cli.fixtures)?;
    result.canonicalize();

    if let Some(verify_path) = cli.verify {
        let expected_content = fs::read_to_string(&verify_path)?;
        let expected: ExecutionResult = serde_json::from_str(&expected_content)?;
        let verifier = Verifier::new();
        verifier.verify(plan, &cli.fixtures, &expected)?;
    }

    let serialized = serde_json::to_string_pretty(&result)?;
    if let Some(output) = cli.output {
        fs::write(output, serialized)?;
    } else {
        println!("{}", serialized);
    }

    Ok(())
}
