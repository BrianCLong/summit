use std::fs;
use std::path::PathBuf;

use clap::Parser;
use efs::verifier::{verify_payload_hash, verify_quote};
use efs::{AttestationQuote, SealedFeatureBlob};

#[derive(Parser, Debug)]
#[command(author, version, about = "Offline verifier for EFS attestation quotes", long_about = None)]
struct Cli {
    /// Path to a JSON encoded attestation quote
    #[arg(long)]
    quote: PathBuf,
    /// Path to a JSON encoded sealed feature blob
    #[arg(long)]
    sealed_blob: PathBuf,
    /// Hex encoded attestation key shared with the enclave
    #[arg(long)]
    attestation_key: String,
}

fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();
    let quote_json = fs::read_to_string(&cli.quote)?;
    let quote: AttestationQuote = serde_json::from_str(&quote_json)?;
    let blob_json = fs::read_to_string(&cli.sealed_blob)?;
    let sealed_blob: SealedFeatureBlob = serde_json::from_str(&blob_json)?;
    let attestation_key = hex::decode(cli.attestation_key.trim())?;

    verify_quote(&quote, &attestation_key, &sealed_blob)?;
    if !verify_payload_hash(&quote, &sealed_blob) {
        anyhow::bail!("payload hash mismatch");
    }
    println!("attestation verified");
    Ok(())
}
