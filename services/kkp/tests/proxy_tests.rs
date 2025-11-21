use axum::{
    body::{Body, Bytes},
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use kkp::{app::AppConfig, build_router, token};
use serde_json::{json, Value};
use time::Duration;
use tower::ServiceExt;

async fn setup_app() -> axum::Router {
    let config = AppConfig {
        listen_addr: "127.0.0.1:0".to_string(),
        policy_path: None,
        default_token_ttl: Duration::seconds(120),
        key_ttl: Duration::seconds(600),
        rotation_interval: Duration::seconds(120),
        max_active_keys: 4,
    };
    let state = config.build_state().await.expect("state");
    build_router(state)
}

async fn post_json(router: &axum::Router, path: &str, payload: &Value) -> (StatusCode, Bytes) {
    let response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(path)
                .header("content-type", "application/json")
                .body(Body::from(payload.to_string()))
                .unwrap(),
        )
        .await
        .expect("response");
    let status = response.status();
    let body = body_bytes(response).await;
    (status, body)
}

async fn get(router: &axum::Router, path: &str) -> (StatusCode, Bytes) {
    let response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(path)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .expect("response");
    let status = response.status();
    let body = body_bytes(response).await;
    (status, body)
}

async fn body_bytes(response: axum::response::Response) -> Bytes {
    response.into_body().collect().await.unwrap().to_bytes()
}

#[tokio::test]
async fn cross_cloud_envelope_round_trip() {
    let router = setup_app().await;
    for backend in ["aws", "gcp", "azure"] {
        let token_payload = json!({
            "subject": "service-account",
            "audience": "client-app",
            "backend": backend,
            "key_id": "alias/app",
            "policy_claims": {"environment": "prod"},
            "request_context": json!({}),
        });
        let (status, token_body) = post_json(&router, "/token", &token_payload).await;
        assert_eq!(status, StatusCode::OK);
        let token_data: kkp::api::TokenResponse = serde_json::from_slice(&token_body).unwrap();

        let encrypt_payload = json!({
            "backend": backend,
            "key_id": "alias/app",
            "plaintext": format!("hello-{backend}"),
            "policy_context": {"environment": "prod"}
        });
        let (encrypt_status, encrypt_body) =
            post_json(&router, "/envelope/encrypt", &encrypt_payload).await;
        assert_eq!(encrypt_status, StatusCode::OK);
        let envelope: kkp::api::EncryptResponse = serde_json::from_slice(&encrypt_body).unwrap();

        let decrypt_payload = json!({
            "token": token_data.token,
            "envelope": envelope.envelope,
            "context": {"environment": "prod"},
        });
        let (decrypt_status, decrypt_body) =
            post_json(&router, "/envelope/decrypt", &decrypt_payload).await;
        assert_eq!(decrypt_status, StatusCode::OK);
        let decrypted: kkp::api::DecryptResponse = serde_json::from_slice(&decrypt_body).unwrap();
        assert_eq!(decrypted.plaintext, format!("hello-{backend}"));
    }
}

#[tokio::test]
async fn policy_enforced_and_offline_verification() {
    let router = setup_app().await;

    let token_payload = json!({
        "subject": "analytics",
        "audience": "cli",
        "backend": "aws",
        "key_id": "alias/app",
        "policy_claims": {"environment": "prod"},
        "request_context": json!({}),
    });
    let (token_status, token_body) = post_json(&router, "/token", &token_payload).await;
    assert_eq!(token_status, StatusCode::OK);
    let token_data: kkp::api::TokenResponse = serde_json::from_slice(&token_body).unwrap();

    let (jwks_status, jwks_body) = get(&router, "/keys/jwks").await;
    assert_eq!(jwks_status, StatusCode::OK);
    let jwks: kkp::api::JwksResponse = serde_json::from_slice(&jwks_body).unwrap();

    let claims = token::verify_with_jwks(&jwks.keys, &token_data.token).unwrap();
    assert_eq!(claims.sub, "analytics");

    // Decrypt succeeds when context matches claims
    let encrypt_payload = json!({
        "backend": "aws",
        "key_id": "alias/app",
        "plaintext": "protected",
        "policy_context": {"environment": "prod"}
    });
    let (_, encrypt_body) = post_json(&router, "/envelope/encrypt", &encrypt_payload).await;
    let envelope: kkp::api::EncryptResponse = serde_json::from_slice(&encrypt_body).unwrap();

    let decrypt_payload = json!({
        "token": token_data.token,
        "envelope": envelope.envelope,
        "context": {"environment": "prod"},
    });
    let (decrypt_status, _) = post_json(&router, "/envelope/decrypt", &decrypt_payload).await;
    assert_eq!(decrypt_status, StatusCode::OK);

    // Context mismatch should be forbidden
    let forbidden_payload = json!({
        "token": token_data.token,
        "envelope": envelope.envelope,
        "context": {"environment": "staging"},
    });
    let (forbidden_status, _) = post_json(&router, "/envelope/decrypt", &forbidden_payload).await;
    assert_eq!(forbidden_status, StatusCode::FORBIDDEN);

    // Rotate keys and ensure old token still verifies with new JWKS set
    let (rotate_status, _) = post_json(&router, "/keys/rotate", &json!({})).await;
    assert_eq!(rotate_status, StatusCode::CREATED);
    let (_, new_jwks_body) = get(&router, "/keys/jwks").await;
    let new_jwks: kkp::api::JwksResponse = serde_json::from_slice(&new_jwks_body).unwrap();
    let claims_after_rotation = token::verify_with_jwks(&new_jwks.keys, &token_data.token).unwrap();
    assert_eq!(claims_after_rotation.sub, "analytics");
}

#[tokio::test]
async fn expected_audience_must_match() {
    let router = setup_app().await;

    let token_payload = json!({
        "subject": "worker", 
        "audience": "mobile-app",
        "backend": "aws",
        "key_id": "alias/app",
        "policy_claims": {"environment": "prod"},
        "request_context": json!({}),
    });
    let (token_status, token_body) = post_json(&router, "/token", &token_payload).await;
    assert_eq!(token_status, StatusCode::OK);
    let token_data: kkp::api::TokenResponse = serde_json::from_slice(&token_body).unwrap();

    let encrypt_payload = json!({
        "backend": "aws",
        "key_id": "alias/app",
        "plaintext": "aud-protected",
        "policy_context": {"environment": "prod"}
    });
    let (encrypt_status, encrypt_body) = post_json(&router, "/envelope/encrypt", &encrypt_payload).await;
    assert_eq!(encrypt_status, StatusCode::OK);
    let envelope: kkp::api::EncryptResponse = serde_json::from_slice(&encrypt_body).unwrap();

    let valid_decrypt_payload = json!({
        "token": token_data.token,
        "envelope": envelope.envelope,
        "expected_audience": "mobile-app",
        "context": {"environment": "prod"},
    });
    let (valid_status, valid_body) = post_json(&router, "/envelope/decrypt", &valid_decrypt_payload).await;
    assert_eq!(valid_status, StatusCode::OK);
    let decrypted: kkp::api::DecryptResponse = serde_json::from_slice(&valid_body).unwrap();
    assert_eq!(decrypted.plaintext, "aud-protected");

    let mismatch_payload = json!({
        "token": token_data.token,
        "envelope": envelope.envelope,
        "expected_audience": "web-app",
        "context": {"environment": "prod"},
    });
    let (mismatch_status, _) = post_json(&router, "/envelope/decrypt", &mismatch_payload).await;
    assert_eq!(mismatch_status, StatusCode::FORBIDDEN);
}
