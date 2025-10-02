use std::collections::BTreeMap;

use criterion::{black_box, criterion_group, criterion_main, Criterion};
use ed25519_dalek::SigningKey;
use tats::replay::NoopReplayCache;
use tats::token::{encode_token, TokenClaims};
use tats::verifier::{TokenVerifier, VerificationOptions};

fn signing_key() -> SigningKey {
    SigningKey::from_bytes(&[42u8; 32])
}

fn issue_benchmark(c: &mut Criterion) {
    let signing = signing_key();
    c.bench_function("issue_token", |b| {
        b.iter(|| {
            let claims = TokenClaims::new(
                vec!["dataset-a".into(), "dataset-b".into()],
                BTreeMap::from([(String::from("dataset-a"), vec!["row-1".into()])]),
                vec!["analytics".into()],
                "aud".into(),
                1_700_000_000,
                1_700_000_600,
                None,
                "nonce".into(),
            );
            let token = encode_token(&claims, &signing).expect("token");
            black_box(token);
        });
    });
}

fn verify_benchmark(c: &mut Criterion) {
    let signing = signing_key();
    let verifying = signing.verifying_key();
    let claims = TokenClaims::new(
        vec!["dataset-a".into()],
        BTreeMap::new(),
        vec!["analytics".into()],
        "aud".into(),
        1_700_000_000,
        4_000_000_000,
        None,
        "nonce".into(),
    );
    let token = encode_token(&claims, &signing).expect("token");
    c.bench_function("verify_token", |b| {
        b.iter(|| {
            let verifier = TokenVerifier::new(verifying, NoopReplayCache);
            let result = verifier
                .verify(
                    &token,
                    VerificationOptions {
                        expected_audience: Some("aud".into()),
                        required_datasets: vec!["dataset-a".into()],
                        required_row_scopes: BTreeMap::new(),
                        required_purposes: vec!["analytics".into()],
                    },
                )
                .expect("verify");
            black_box(result);
        });
    });
}

criterion_group!(benches, issue_benchmark, verify_benchmark);
criterion_main!(benches);
