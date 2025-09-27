use std::fs;
use std::path::PathBuf;

use anyhow::{Context, Result};
use clap::{Parser, Subcommand, ValueEnum};

use acdc::dsl;
use acdc::policy::{ConsentConfig, PolicyConfig, PolicyContext};
use acdc::{compile_plan, simulator};

#[derive(Parser)]
#[command(
    name = "acdc",
    about = "Adaptive Consent-Aware Dataflow Compiler",
    version
)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Compile a DSL file into a consent-aware execution plan
    Compile {
        #[arg(long)]
        dsl: PathBuf,
        #[arg(long)]
        policy: PathBuf,
        #[arg(long)]
        consent: Option<PathBuf>,
        #[arg(long)]
        output: Option<PathBuf>,
        #[arg(long, default_value = "pretty")]
        format: OutputFormat,
    },
    /// Simulate plan differences between policy or consent states
    Simulate {
        #[arg(long)]
        dsl: PathBuf,
        #[arg(long)]
        policy: PathBuf,
        #[arg(long)]
        consent: Option<PathBuf>,
        #[arg(long, alias = "updated-policy")]
        updated_policy: Option<PathBuf>,
        #[arg(long, alias = "updated-consent")]
        updated_consent: Option<PathBuf>,
        #[arg(long)]
        output: Option<PathBuf>,
        #[arg(long, default_value = "pretty")]
        format: OutputFormat,
    },
}

#[derive(Copy, Clone, ValueEnum)]
enum OutputFormat {
    Json,
    Pretty,
}

fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Compile {
            dsl,
            policy,
            consent,
            output,
            format,
        } => run_compile(dsl, policy, consent, output, format)?,
        Commands::Simulate {
            dsl,
            policy,
            consent,
            updated_policy,
            updated_consent,
            output,
            format,
        } => run_simulate(
            dsl,
            policy,
            consent,
            updated_policy,
            updated_consent,
            output,
            format,
        )?,
    }

    Ok(())
}

fn run_compile(
    dsl_path: PathBuf,
    policy_path: PathBuf,
    consent_path: Option<PathBuf>,
    output: Option<PathBuf>,
    format: OutputFormat,
) -> Result<()> {
    let flow = load_flow(&dsl_path)?;
    let ctx = build_context(&policy_path, consent_path.as_ref())?;
    let artifacts = compile_plan(&flow, &ctx)?;
    output_payload(&artifacts, output, format)
}

fn run_simulate(
    dsl_path: PathBuf,
    policy_path: PathBuf,
    consent_path: Option<PathBuf>,
    updated_policy: Option<PathBuf>,
    updated_consent: Option<PathBuf>,
    output: Option<PathBuf>,
    format: OutputFormat,
) -> Result<()> {
    let flow = load_flow(&dsl_path)?;
    let baseline_ctx = build_context(&policy_path, consent_path.as_ref())?;
    let updated_ctx = build_context(
        updated_policy.as_ref().unwrap_or(&policy_path),
        updated_consent.as_ref().or(consent_path.as_ref()),
    )?;

    let simulation = simulator::simulate(&flow, &baseline_ctx, &updated_ctx)?;
    output_payload(&simulation, output, format)
}

fn load_flow(path: &PathBuf) -> Result<dsl::Flow> {
    let raw = fs::read_to_string(path)
        .with_context(|| format!("unable to read DSL from {}", path.display()))?;
    dsl::parse(&raw).with_context(|| format!("failed to parse DSL file {}", path.display()))
}

fn build_context(policy: &PathBuf, consent: Option<&PathBuf>) -> Result<PolicyContext> {
    let policy_cfg = PolicyConfig::from_path(policy)
        .with_context(|| format!("failed to load policy file {}", policy.display()))?;
    let consent_cfg = match consent {
        Some(path) => ConsentConfig::from_path(path)
            .with_context(|| format!("failed to load consent file {}", path.display()))?,
        None => ConsentConfig::default(),
    };
    PolicyContext::new(policy_cfg, consent_cfg)
}

fn output_payload<T: serde::Serialize>(
    payload: &T,
    output: Option<PathBuf>,
    format: OutputFormat,
) -> Result<()> {
    let serialized = match format {
        OutputFormat::Json => serde_json::to_string(payload)?,
        OutputFormat::Pretty => serde_json::to_string_pretty(payload)?,
    };

    if let Some(path) = output {
        fs::write(&path, serialized)
            .with_context(|| format!("failed to write output to {}", path.display()))?;
    } else {
        println!("{}", serialized);
    }

    Ok(())
}
