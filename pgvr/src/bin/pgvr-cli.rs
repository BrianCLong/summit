use std::env;
use std::io::{self, Read};
use std::path::PathBuf;

use pgvr::{load_from_file, sample_router, PgvrRouter, SearchMode, SearchQuery};
use serde::Deserialize;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let fixture_path = parse_fixture_path()?;
    let router = load_router(fixture_path)?;
    let query_envelope = read_query()?;
    let mode = query_envelope.mode.unwrap_or(SearchMode::Live);
    let query = query_envelope.into_query();
    let response = match mode {
        SearchMode::Live => router.search(query)?,
        SearchMode::DryRun => router.dry_run(query)?,
    };

    println!("{}", serde_json::to_string_pretty(&response)?);
    Ok(())
}

fn parse_fixture_path() -> Result<Option<PathBuf>, pgvr::PgvrError> {
    let mut args = env::args().skip(1);
    let mut fixture_path: Option<PathBuf> = None;

    while let Some(arg) = args.next() {
        if arg == "--fixture" {
            let value = args.next().ok_or_else(|| {
                pgvr::PgvrError::Fixture("--fixture requires a value".to_string())
            })?;
            fixture_path = Some(PathBuf::from(value));
        } else {
            return Err(pgvr::PgvrError::Fixture(format!("unknown argument: {arg}")));
        }
    }

    Ok(fixture_path)
}

fn load_router(path: Option<PathBuf>) -> Result<PgvrRouter, pgvr::PgvrError> {
    if let Some(path) = path {
        load_from_file(path)
    } else {
        Ok(sample_router())
    }
}

fn read_query() -> Result<QueryEnvelope, Box<dyn std::error::Error>> {
    let mut buffer = String::new();
    io::stdin().read_to_string(&mut buffer)?;
    if buffer.trim().is_empty() {
        return Err("query payload required".into());
    }
    Ok(serde_json::from_str(&buffer)?)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct QueryEnvelope {
    tenant_id: String,
    vector: Vec<f32>,
    top_k: usize,
    #[serde(default)]
    requested_fields: Vec<String>,
    jurisdiction: Option<String>,
    purpose: Option<String>,
    mode: Option<SearchMode>,
}

impl QueryEnvelope {
    fn into_query(self) -> SearchQuery {
        SearchQuery::new(
            self.tenant_id,
            self.vector,
            self.top_k,
            self.requested_fields.into_iter(),
            self.jurisdiction,
            self.purpose,
        )
    }
}
