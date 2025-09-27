use std::io::{self, Read};

use cmol::{analyze, AnalysisRequest};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input)?;

    if input.trim().is_empty() {
        return Err("expected JSON payload on stdin".into());
    }

    let request: AnalysisRequest = serde_json::from_str(&input)?;
    let response = analyze(&request)?;
    let json = serde_json::to_string_pretty(&response)?;
    println!("{json}");
    Ok(())
}
