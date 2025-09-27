use std::collections::{HashMap, HashSet};

use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use once_cell::sync::Lazy;
use rand::SeedableRng;
use rand::{rngs::StdRng, Rng};
use safejoin::{
    derive_shared_secret, dp_noisy_aggregates, encode_public_key, generate_keypair,
    hash_tokens_with_secret, AggregateInput, AggregateNoiseConfig, AggregateReport,
    BloomFilterPayload, RegisterRequest, SessionMode, SessionResult, SessionStore, UploadRequest,
};

static DATASET_A: Lazy<Vec<(String, f64)>> = Lazy::new(|| synthetic_dataset(64, 32, 3.0));
static DATASET_B: Lazy<Vec<(String, f64)>> = Lazy::new(|| synthetic_dataset(64, 32, 5.0));

#[test]
fn intersection_matches_plaintext() {
    let store = SessionStore::default();
    let session_id = store.create_session(SessionMode::IntersectionOnly, 2, None);
    let (secret_a, public_a) = generate_keypair();
    let (secret_b, public_b) = generate_keypair();
    let pub_a = encode_public_key(&public_a);
    let pub_b = encode_public_key(&public_b);
    store
        .register(
            session_id,
            RegisterRequest {
                participant_id: "A".into(),
                public_key: pub_a.clone(),
            },
        )
        .unwrap();
    store
        .register(
            session_id,
            RegisterRequest {
                participant_id: "B".into(),
                public_key: pub_b.clone(),
            },
        )
        .unwrap();
    let secret_ab = derive_shared_secret(&secret_a, &pub_b).unwrap();
    let secret_ba = derive_shared_secret(&secret_b, &pub_a).unwrap();
    assert_eq!(secret_ab, secret_ba);

    let (tokens_a, bloom_a) = encode_tokens(&DATASET_A, &secret_ab);
    let (tokens_b, bloom_b) = encode_tokens(&DATASET_B, &secret_ba);

    store
        .upload(
            session_id,
            UploadRequest {
                participant_id: "A".into(),
                hashed_tokens: tokens_a,
                bloom_filter: Some(bloom_a),
                aggregates: None,
            },
        )
        .unwrap();
    store
        .upload(
            session_id,
            UploadRequest {
                participant_id: "B".into(),
                hashed_tokens: tokens_b,
                bloom_filter: Some(bloom_b),
                aggregates: None,
            },
        )
        .unwrap();

    let result = store.result(session_id).unwrap();
    match result {
        SessionResult::Intersection { exact, estimated } => {
            let plain = plaintext_intersection(&DATASET_A, &DATASET_B);
            assert_eq!(exact, plain.len());
            assert!(estimated.unwrap_or_default() > 0.0);
        }
        _ => panic!("expected intersection result"),
    }
}

#[test]
fn aggregates_match_plaintext_with_dp_tolerance() {
    let epsilon = 1.0;
    let store = SessionStore::default();
    let session_id = store.create_session(SessionMode::Aggregate { epsilon }, 2, None);
    let (secret_a, public_a) = generate_keypair();
    let (secret_b, public_b) = generate_keypair();
    let pub_a = encode_public_key(&public_a);
    let pub_b = encode_public_key(&public_b);
    store
        .register(
            session_id,
            RegisterRequest {
                participant_id: "A".into(),
                public_key: pub_a.clone(),
            },
        )
        .unwrap();
    store
        .register(
            session_id,
            RegisterRequest {
                participant_id: "B".into(),
                public_key: pub_b.clone(),
            },
        )
        .unwrap();

    let secret_ab = derive_shared_secret(&secret_a, &pub_b).unwrap();
    let secret_ba = derive_shared_secret(&secret_b, &pub_a).unwrap();

    let (tokens_a, bloom_a) = encode_tokens(&DATASET_A, &secret_ab);
    let (tokens_b, bloom_b) = encode_tokens(&DATASET_B, &secret_ba);

    let aggregates_a = noisy_reports(&DATASET_A, &tokens_a, &secret_ab, epsilon, 7);
    let aggregates_b = noisy_reports(&DATASET_B, &tokens_b, &secret_ba, epsilon, 11);

    store
        .upload(
            session_id,
            UploadRequest {
                participant_id: "A".into(),
                hashed_tokens: tokens_a,
                bloom_filter: Some(bloom_a),
                aggregates: Some(aggregates_a),
            },
        )
        .unwrap();
    store
        .upload(
            session_id,
            UploadRequest {
                participant_id: "B".into(),
                hashed_tokens: tokens_b,
                bloom_filter: Some(bloom_b),
                aggregates: Some(aggregates_b),
            },
        )
        .unwrap();

    let result = store.result(session_id).unwrap();
    let intersection = plaintext_intersection(&DATASET_A, &DATASET_B);
    let plain_sum: f64 = intersection
        .iter()
        .map(|key| value_for(&DATASET_A, key) + value_for(&DATASET_B, key))
        .sum();

    match result {
        SessionResult::Aggregate(agg) => {
            assert_eq!(agg.intersection_size, intersection.len());
            let noisy_total: f64 = agg.entries.iter().map(|entry| entry.total_noisy_sum).sum();
            let tolerance = 6.0 / epsilon; // DP tolerance band
            let delta = (plain_sum - noisy_total).abs();
            assert!(
                delta <= tolerance,
                "delta {} exceeded tolerance {}",
                delta,
                tolerance
            );
        }
        _ => panic!("expected aggregate result"),
    }
}

fn encode_tokens(
    dataset: &[(String, f64)],
    secret: &[u8; 32],
) -> (Vec<String>, BloomFilterPayload) {
    let keys: Vec<String> = dataset.iter().map(|(k, _)| k.clone()).collect();
    let tokens = hash_tokens_with_secret(&keys, secret);
    let mut bloom = safejoin::SimpleBloom::new(2048, 3);
    for token in &tokens {
        let bytes = BASE64.decode(token).unwrap();
        bloom.insert(&bytes);
    }
    let payload = bloom.to_payload();
    (
        tokens,
        BloomFilterPayload {
            m: payload.m,
            k: payload.k,
            bits: payload.bits,
        },
    )
}

fn noisy_reports(
    dataset: &[(String, f64)],
    tokens: &[String],
    secret: &[u8; 32],
    epsilon: f64,
    seed: u64,
) -> HashMap<String, AggregateReport> {
    let mut inputs = Vec::new();
    for ((_, value), token) in dataset.iter().zip(tokens.iter()) {
        inputs.push(AggregateInput {
            hashed_token: token.clone(),
            attribute: *value,
        });
    }
    let (_, aggregates) = dp_noisy_aggregates(
        &inputs,
        secret,
        AggregateNoiseConfig {
            epsilon,
            rng_seed: Some(seed),
        },
    );
    aggregates
        .into_iter()
        .map(|(token, report)| {
            (
                token,
                AggregateReport {
                    noisy_sum: report.noisy_sum,
                    noisy_count: report.noisy_count,
                },
            )
        })
        .collect()
}

fn value_for(dataset: &[(String, f64)], key: &str) -> f64 {
    dataset
        .iter()
        .find(|(k, _)| k == key)
        .map(|(_, v)| *v)
        .unwrap_or_default()
}

fn synthetic_dataset(size: usize, overlap: usize, offset: f64) -> Vec<(String, f64)> {
    let mut rng = StdRng::seed_from_u64(42 + (offset as u64));
    let mut dataset = Vec::with_capacity(size);
    for i in 0..overlap {
        let key = format!("shared-{:04}", i);
        dataset.push((key, offset + rng.gen_range(0.0..5.0)));
    }
    for i in overlap..size {
        let key = format!("unique-{:04}", i);
        dataset.push((key, offset + rng.gen_range(0.0..5.0)));
    }
    dataset
}

fn plaintext_intersection(a: &[(String, f64)], b: &[(String, f64)]) -> HashSet<String> {
    let keys_a: HashSet<String> = a.iter().map(|(k, _)| k.clone()).collect();
    let keys_b: HashSet<String> = b.iter().map(|(k, _)| k.clone()).collect();
    keys_a.intersection(&keys_b).cloned().collect()
}
