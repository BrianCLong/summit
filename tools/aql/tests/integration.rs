use std::path::Path;

use aql_engine::{parse_query, ExecutionEngine, QueryPlan, Verifier};

const FIXTURES: &str = "fixtures";

fn load_query() -> &'static str {
    "FIND events\n\
     WHERE subject = \"Alice\" AND action = \"LOGIN\"\n\
     FROM logs, ledger\n\
     BETWEEN 2024-01-01T00:00:00Z AND 2024-01-31T23:59:59Z\n\
     PROVENANCE JOIN ledger ON event_id\n\
     PROVENANCE JOIN idtl ON event_id\n\
     PROVENANCE JOIN mpc ON event_id\n\
     WITH PROOFS\n\
     EXPLAIN TRACE"
}

#[test]
fn parses_full_query() {
    let query = parse_query(load_query()).expect("query parses");
    assert_eq!(query.target, "events");
    assert_eq!(query.conditions.len(), 2);
    assert!(query.proofs);
    assert!(query.explain);
    assert_eq!(query.connectors.len(), 2);
    assert_eq!(query.provenance_joins.len(), 3);
}

#[test]
fn engine_executes_with_deterministic_output() {
    let query = parse_query(load_query()).expect("query parses");
    let plan = QueryPlan::new(query);
    let engine = ExecutionEngine::new();

    let mut first = engine
        .execute(plan.clone(), Path::new(FIXTURES))
        .expect("first execution");
    let mut second = engine
        .execute(plan, Path::new(FIXTURES))
        .expect("second execution");

    first.canonicalize();
    second.canonicalize();
    assert_eq!(first.records, second.records);
    assert_eq!(first.trace.steps, second.trace.steps);

    let record = first.records.first().expect("a result is returned");
    let connectors: Vec<_> = record
        .evidence
        .iter()
        .map(|item| item.connector.as_str())
        .collect();
    assert!(connectors.contains(&"logs"));
    assert!(connectors.contains(&"ledger"));
    assert!(connectors.contains(&"idtl"));
    assert!(connectors.contains(&"mpc"));
    assert!(!record.proofs.is_empty(), "proof bundles are present");
}

#[test]
fn verifier_rejects_mutated_results() {
    let query = parse_query(load_query()).expect("query parses");
    let plan = QueryPlan::new(query.clone());
    let engine = ExecutionEngine::new();
    let mut result = engine
        .execute(plan.clone(), Path::new(FIXTURES))
        .expect("execution succeeds");
    result.canonicalize();

    let verifier = Verifier::new();
    verifier
        .verify(plan.clone(), Path::new(FIXTURES), &result)
        .expect("baseline verification succeeds");

    let mut tampered = result.clone();
    tampered.records[0].proofs.clear();
    let err = verifier
        .verify(plan, Path::new(FIXTURES), &tampered)
        .expect_err("tampering detected");
    assert!(err.to_string().contains("execution results diverged"));
}
