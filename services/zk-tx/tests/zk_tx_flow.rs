use axum::{body::Body, http::Request};
use http_body_util::BodyExt;
use tower::ServiceExt;
use zk_tx::{build_router, OverlapProofRequest, SelectorSet, TenantSubmission, VerifyRequest};

fn tenant_submission(tenant_id: &str, salt: &str, selectors: SelectorSet) -> TenantSubmission {
    TenantSubmission {
        tenant_id: tenant_id.to_string(),
        salt: salt.to_string(),
        scope: vec!["pii".to_string(), "contact".to_string()],
        selectors,
    }
}

#[tokio::test]
async fn proves_overlap_and_verifies() {
    let router = build_router();

    let tenant_a = tenant_submission(
        "tenant-a",
        "shared-salt",
        SelectorSet {
            emails: vec!["alice@example.com".into()],
            phones: vec!["+15555550100".into()],
            ibans: vec!["DE02123412341234123412".into()],
        },
    );

    let tenant_b = tenant_submission(
        "tenant-b",
        "shared-salt",
        SelectorSet {
            emails: vec!["alice@example.com".into(), "bob@example.com".into()],
            phones: vec!["+15555550100".into()],
            ibans: vec!["GB29NWBK60161331926819".into()],
        },
    );

    let request = Request::post("/proofs/overlap")
        .header("content-type", "application/json")
        .body(Body::from(
            serde_json::to_vec(&OverlapProofRequest {
                tenant_a,
                tenant_b,
            })
            .unwrap(),
        ))
        .unwrap();

    let response = router.clone().oneshot(request).await.unwrap();
    assert!(response.status().is_success());

    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    let proof_response: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(proof_response["overlap"], true);

    let proof_blob = proof_response["proof"].as_str().unwrap().to_string();
    let verify_request = Request::post("/verify/overlap")
        .header("content-type", "application/json")
        .body(Body::from(
            serde_json::to_vec(&VerifyRequest { proof: proof_blob }).unwrap(),
        ))
        .unwrap();

    let verify_response = router.oneshot(verify_request).await.unwrap();
    assert!(verify_response.status().is_success());
    let bytes = verify_response.into_body().collect().await.unwrap().to_bytes();
    let verify_body: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(verify_body["valid"], true);
    assert_eq!(verify_body["overlap"], true);
    assert_eq!(verify_body["leakage"], 0);
}

#[tokio::test]
async fn proves_disjoint_and_verifies() {
    let router = build_router();

    let tenant_a = tenant_submission(
        "tenant-a",
        "shared-salt",
        SelectorSet {
            emails: vec!["alice@example.com".into()],
            phones: vec!["+15555550100".into()],
            ibans: vec!["DE02123412341234123412".into()],
        },
    );

    let tenant_b = tenant_submission(
        "tenant-b",
        "shared-salt",
        SelectorSet {
            emails: vec!["carol@example.com".into()],
            phones: vec!["+15555550123".into()],
            ibans: vec!["GB29NWBK60161331926819".into()],
        },
    );

    let request = Request::post("/proofs/nonoverlap")
        .header("content-type", "application/json")
        .body(Body::from(
            serde_json::to_vec(&OverlapProofRequest {
                tenant_a,
                tenant_b,
            })
            .unwrap(),
        ))
        .unwrap();

    let response = router.clone().oneshot(request).await.unwrap();
    assert!(response.status().is_success());

    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    let proof_response: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(proof_response["overlap"], false);

    let proof_blob = proof_response["proof"].as_str().unwrap().to_string();
    let verify_request = Request::post("/verify/nonoverlap")
        .header("content-type", "application/json")
        .body(Body::from(
            serde_json::to_vec(&VerifyRequest { proof: proof_blob }).unwrap(),
        ))
        .unwrap();

    let verify_response = router.oneshot(verify_request).await.unwrap();
    assert!(verify_response.status().is_success());
    let bytes = verify_response.into_body().collect().await.unwrap().to_bytes();
    let verify_body: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(verify_body["valid"], true);
    assert_eq!(verify_body["overlap"], false);
    assert_eq!(verify_body["leakage"], 0);
}

#[tokio::test]
async fn mismatched_salts_fail_overlap_proof() {
    let router = build_router();

    let tenant_a = tenant_submission(
        "tenant-a",
        "salt-one",
        SelectorSet {
            emails: vec!["shared@example.com".into()],
            phones: vec!["+15555550100".into()],
            ibans: vec!["DE02123412341234123412".into()],
        },
    );

    let tenant_b = tenant_submission(
        "tenant-b",
        "salt-two",
        SelectorSet {
            emails: vec!["shared@example.com".into()],
            phones: vec!["+15555550100".into()],
            ibans: vec!["DE02123412341234123412".into()],
        },
    );

    let request = Request::post("/proofs/overlap")
        .header("content-type", "application/json")
        .body(Body::from(
            serde_json::to_vec(&OverlapProofRequest {
                tenant_a,
                tenant_b,
            })
            .unwrap(),
        ))
        .unwrap();

    let response = router.oneshot(request).await.unwrap();
    assert_eq!(response.status(), 400);
}
