use pgvr::{sample_router, SearchMode, SearchQuery};

#[test]
fn deterministic_top_k() {
    let router = sample_router();
    let query = SearchQuery::new(
        "tenant_alpha",
        vec![0.15, 0.21, 0.29],
        3,
        vec!["name".to_string()],
        Some("US".to_string()),
        Some("fraud".to_string()),
    );

    let first = router.search(query.clone()).expect("live search succeeds");
    let second = router.search(query).expect("second live search succeeds");

    assert_eq!(first.results, second.results);
    assert_eq!(first.mode, SearchMode::Live);
}

#[test]
fn deny_maps_block_sensitive_vectors() {
    let router = sample_router();
    let query = SearchQuery::new(
        "tenant_alpha",
        vec![0.18, 0.14, 0.33],
        5,
        vec!["email".to_string()],
        Some("US".to_string()),
        Some("support".to_string()),
    );

    let response = router.search(query).expect("search succeeds");
    for result in response.results {
        assert_ne!(
            result.vector_id, "vec-alpha-2",
            "deny map must hide vec-alpha-2"
        );
    }
}

#[test]
fn dry_run_matches_live_results() {
    let router = sample_router();
    let query = SearchQuery::new(
        "tenant_alpha",
        vec![0.25, 0.2, 0.25],
        4,
        vec!["name".to_string()],
        Some("US".to_string()),
        Some("fraud".to_string()),
    );

    let live = router.search(query.clone()).expect("live search succeeds");
    let dry = router.dry_run(query).expect("dry run succeeds");

    assert_eq!(dry.mode, SearchMode::DryRun);
    assert_eq!(dry.results, live.results, "dry-run must mirror live mode");
}
