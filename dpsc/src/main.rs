use std::env;
use std::fs;
use std::io::{self, Read};

use dpsc::{DPSCError, compile_query};

fn main() {
    if let Err(err) = run() {
        eprintln!("error: {err}");
        std::process::exit(1);
    }
}

fn run() -> Result<(), DPSCError> {
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        eprintln!("Usage: dpsc <sql-file|-> or dpsc \"SELECT ...\"");
        std::process::exit(64);
    }
    let query = if args[1] == "-" {
        let mut buffer = String::new();
        io::stdin()
            .read_to_string(&mut buffer)
            .map_err(|e| DPSCError::Sql(e.to_string()))?;
        buffer
    } else if let Ok(contents) = fs::read_to_string(&args[1]) {
        contents
    } else {
        args[1..].join(" ")
    };

    let artifacts = compile_query(&query)?;
    let json = serde_json::to_string_pretty(&artifacts)
        .map_err(|e| DPSCError::Serialization(e.to_string()))?;
    println!("{json}");
    Ok(())
}
