use axum::{body::Body, http::Request, Router};
use criterion::{criterion_group, criterion_main, Criterion};
use hyper::body::to_bytes;
use kkp::{app::AppConfig, build_router};
use serde_json::json;
use time::Duration;
use tower::ServiceExt;

async fn setup_router() -> Router {
    let config = AppConfig {
        listen_addr: "127.0.0.1:0".to_string(),
        policy_path: None,
        default_token_ttl: Duration::seconds(60),
        key_ttl: Duration::seconds(600),
        rotation_interval: Duration::seconds(60),
        max_active_keys: 3,
    };
    build_router(config.build_state().await.expect("state"))
}

async fn post(
    router: Router,
    path: &str,
    payload: serde_json::Value,
) -> hyper::Response<axum::body::Body> {
    router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(path)
                .header("content-type", "application/json")
                .body(Body::from(payload.to_string()))
                .unwrap(),
        )
        .await
        .expect("response")
}

async fn prepare_decrypt(router: &Router) -> (String, serde_json::Value) {
    let token_payload = json!({
        "subject": "bench",
        "audience": "bench-client",
        "backend": "aws",
        "key_id": "alias/app",
        "policy_claims": {"environment": "bench"},
        "request_context": json!({}),
    });
    let token_resp = post(router.clone(), "/token", token_payload).await;
    let token_body = to_bytes(token_resp.into_body()).await.unwrap();
    let token: kkp::api::TokenResponse = serde_json::from_slice(&token_body).unwrap();

    let encrypt_payload = json!({
        "backend": "aws",
        "key_id": "alias/app",
        "plaintext": "payload",
        "policy_context": {"environment": "bench"}
    });
    let encrypt_resp = post(router.clone(), "/envelope/encrypt", encrypt_payload).await;
    let encrypt_body = to_bytes(encrypt_resp.into_body()).await.unwrap();
    let envelope: kkp::api::EncryptResponse = serde_json::from_slice(&encrypt_body).unwrap();

    let decrypt_payload = json!({
        "token": token.token,
        "envelope": envelope.envelope,
        "context": {"environment": "bench"},
    });
    (token.token, decrypt_payload)
}

fn latency_benchmark(c: &mut Criterion) {
    let runtime = tokio::runtime::Runtime::new().expect("runtime");
    let router = runtime.block_on(setup_router());

    let token_router = router.clone();
    let token_payload = json!({
        "subject": "bench",
        "audience": "bench-client",
        "backend": "aws",
        "key_id": "alias/app",
        "policy_claims": {"environment": "bench"},
        "request_context": json!({}),
    });
    c.bench_function("issue_token", |b| {
        b.to_async(&runtime).iter(|| {
            let payload = token_payload.clone();
            let router = token_router.clone();
            async move {
                let response = post(router, "/token", payload).await;
                assert!(response.status().is_success());
            }
        });
    });

    let decrypt_router = router.clone();
    let (token_string, decrypt_payload) = runtime.block_on(prepare_decrypt(&router));
    c.bench_function("decrypt_envelope", |b| {
        b.to_async(&runtime).iter(|| {
            let router = decrypt_router.clone();
            let payload = decrypt_payload.clone();
            async move {
                let response = post(router, "/envelope/decrypt", payload).await;
                assert!(response.status().is_success());
            }
        });
    });

    // Prevent optimization of token string
    std::hint::black_box(token_string);
}

criterion_group!(benches, latency_benchmark);
criterion_main!(benches);
