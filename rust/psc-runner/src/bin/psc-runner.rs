use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

use clap::{Parser, Subcommand};
use psc_runner::attestation::AttestationProof;
use psc_runner::functional_encryption::FunctionalEncryptionEngine;
use psc_runner::policy::{CompiledPolicy, PolicyCompiler, PolicySpec, SigningKey};
use psc_runner::{Auditor, EnclaveShim};
use serde::de::DeserializeOwned;
use serde::Serialize;

#[derive(Parser)]
#[command(author, version, about = "Policy-Sealed Computation runner prototype")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Compile a policy specification using a signing key
    Compile {
        /// Path to the policy specification JSON
        #[arg(long)]
        policy: PathBuf,
        /// Key identifier for the signing key
        #[arg(long, default_value = "demo-key")]
        key_id: String,
        /// Hex-encoded signing secret
        #[arg(long)]
        secret_hex: String,
        /// Output path for the compiled policy JSON
        #[arg(long)]
        out: PathBuf,
    },
    /// Execute the analytic inside the enclave shim
    Run {
        /// Compiled policy JSON
        #[arg(long)]
        policy: PathBuf,
        /// Plaintext inputs JSON
        #[arg(long)]
        input: PathBuf,
        /// Output path for the sealed result JSON
        #[arg(long)]
        sealed_out: PathBuf,
        /// Output path for the attestation proof JSON
        #[arg(long)]
        proof_out: PathBuf,
    },
    /// Verify a sealed output and attestation using the offline auditor
    Verify {
        #[arg(long)]
        policy: PathBuf,
        #[arg(long)]
        sealed: PathBuf,
        #[arg(long)]
        proof: PathBuf,
    },
}

fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();
    match cli.command {
        Commands::Compile {
            policy,
            key_id,
            secret_hex,
            out,
        } => {
            let spec: PolicySpec = read_json(&policy)?;
            let secret = hex::decode(secret_hex)?;
            let signing_key = SigningKey::new(key_id, secret);
            let compiled = PolicyCompiler::compile(&spec, &signing_key)?;
            write_json(&out, &compiled)?;
            println!(
                "Compiled policy {} signed with key {}",
                compiled.policy_id, signing_key.key_id
            );
        }
        Commands::Run {
            policy,
            input,
            sealed_out,
            proof_out,
        } => {
            let policy: CompiledPolicy = read_json(&policy)?;
            let inputs: HashMap<String, f64> = read_json(&input)?;
            let ciphertext = FunctionalEncryptionEngine::bind_inputs(&policy, &inputs);
            let receipt = EnclaveShim::execute(&policy, &ciphertext)?;
            write_json(&sealed_out, &receipt.sealed_output)?;
            write_json(&proof_out, &receipt.proof)?;
            println!(
                "Executed analytic {} with clear result {:.4}",
                policy.analytic, receipt.clear_result
            );
        }
        Commands::Verify {
            policy,
            sealed,
            proof,
        } => {
            let policy: CompiledPolicy = read_json(&policy)?;
            let sealed_output = read_json(&sealed)?;
            let proof: AttestationProof = read_json(&proof)?;
            Auditor::verify(&policy, &sealed_output, &proof)?;
            println!("Verified attestation for policy {}", policy.policy_id);
        }
    }
    Ok(())
}

fn read_json<T: DeserializeOwned>(path: &PathBuf) -> anyhow::Result<T> {
    let data = fs::read_to_string(path)?;
    Ok(serde_json::from_str(&data)?)
}

fn write_json<T: Serialize>(path: &PathBuf, value: &T) -> anyhow::Result<()> {
    let data = serde_json::to_string_pretty(value)?;
    fs::write(path, data)?;
    Ok(())
}
