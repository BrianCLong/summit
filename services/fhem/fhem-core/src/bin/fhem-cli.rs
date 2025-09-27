use clap::{Parser, Subcommand};
use fhem_core::{
    decrypt_ciphertext_base64, encrypt_batch_base64, generate_keys, CiphertextStats, KeyConfig,
};
use serde::Serialize;

#[derive(Parser, Debug)]
#[command(
    author,
    version,
    about = "Deterministic FHE micro-analytics helper",
    propagate_version = true
)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand, Debug)]
enum Commands {
    /// Encrypt a list of unsigned integers and emit base64 ciphertexts
    Encrypt {
        #[arg(required = true)]
        values: Vec<u32>,
        /// Emit pretty printed JSON
        #[arg(long, default_value_t = false)]
        pretty: bool,
    },
    /// Decrypt a base64 ciphertext produced by the encrypt command or the service
    Decrypt {
        #[arg(long)]
        ciphertext: String,
    },
}

#[derive(Debug, Serialize)]
struct EncryptOutput {
    ciphertexts: Vec<String>,
    stats: CiphertextStats,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let cli = Cli::parse();
    let keys = generate_keys(&KeyConfig::default())?;

    match cli.command {
        Commands::Encrypt { values, pretty } => {
            let (ciphertexts, stats) = encrypt_batch_base64(&values, &keys)?;
            let output = EncryptOutput { ciphertexts, stats };
            if pretty {
                println!("{}", serde_json::to_string_pretty(&output)?);
            } else {
                println!("{}", serde_json::to_string(&output)?);
            }
        }
        Commands::Decrypt { ciphertext } => {
            let value = decrypt_ciphertext_base64(&ciphertext, &keys)?;
            println!("{}", value);
        }
    }

    Ok(())
}
