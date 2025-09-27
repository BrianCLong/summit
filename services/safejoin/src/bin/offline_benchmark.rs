use std::collections::{HashMap, HashSet};
use std::time::Instant;

use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use rand::Rng;
use safejoin::{
    derive_shared_secret, dp_noisy_aggregates, encode_public_key, generate_keypair,
    hash_tokens_with_secret, AggregateInput, AggregateNoiseConfig, AggregateReport,
    BloomFilterPayload, RegisterRequest, SessionMode, SessionResult, SessionStore, SimpleBloom,
    UploadRequest,
};

fn main() {
    env_logger::init();
    let scenarios = vec![(1_000usize, 200usize), (10_000, 2_000)];
    println!("safejoin offline benchmarks");
    for (size, overlap) in scenarios {
        run_intersection_benchmark(size, overlap);
        run_aggregate_benchmark(size, overlap, 1.0);
    }
}

fn run_intersection_benchmark(size: usize, overlap: usize) {
    let (dataset_a, dataset_b) = synthetic_datasets(size, overlap);
    let plain_intersection = plaintext_intersection(&dataset_a, &dataset_b);

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
        .expect("register A");
    store
        .register(
            session_id,
            RegisterRequest {
                participant_id: "B".into(),
                public_key: pub_b.clone(),
            },
        )
        .expect("register B");

    let secret_ab = derive_shared_secret(&secret_a, &pub_b).expect("secret");
    let secret_ba = derive_shared_secret(&secret_b, &pub_a).expect("secret");
    assert_eq!(secret_ab, secret_ba);

    let (tokens_a, bloom_a) = encode_tokens(&dataset_a, &secret_ab);
    let (tokens_b, bloom_b) = encode_tokens(&dataset_b, &secret_ba);

    let start_upload = Instant::now();
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
        .expect("upload A");
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
        .expect("upload B");
    let upload_elapsed = start_upload.elapsed();

    let start_result = Instant::now();
    let result = store.result(session_id).expect("result ready");
    let result_elapsed = start_result.elapsed();

    match result {
        SessionResult::Intersection { exact, estimated } => {
            println!(
                "intersection | size: {:>6} | overlap: {:>6} | exact: {:>6} | bloom_est: {:>8.2} | upload: {:>6?} | compute: {:>6?}",
                size,
                overlap,
                exact,
                estimated.unwrap_or_default(),
                upload_elapsed,
                result_elapsed
            );
            assert_eq!(exact, plain_intersection.len());
        }
        _ => unreachable!(),
    }
}

fn run_aggregate_benchmark(size: usize, overlap: usize, epsilon: f64) {
    let (dataset_a, dataset_b) = synthetic_datasets(size, overlap);
    let plain_intersection = plaintext_intersection(&dataset_a, &dataset_b);
    let plain_sum: f64 = plain_intersection
        .iter()
        .map(|key| {
            let attr_a = dataset_a.iter().find(|(k, _)| k == key).unwrap().1;
            let attr_b = dataset_b.iter().find(|(k, _)| k == key).unwrap().1;
            attr_a + attr_b
        })
        .sum();

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
        .expect("register A");
    store
        .register(
            session_id,
            RegisterRequest {
                participant_id: "B".into(),
                public_key: pub_b.clone(),
            },
        )
        .expect("register B");

    let secret_ab = derive_shared_secret(&secret_a, &pub_b).expect("secret");
    let secret_ba = derive_shared_secret(&secret_b, &pub_a).expect("secret");

    let (tokens_a, bloom_a) = encode_tokens(&dataset_a, &secret_ab);
    let (tokens_b, bloom_b) = encode_tokens(&dataset_b, &secret_ba);

    let aggregates_a = noisy_reports(&dataset_a, &tokens_a, &secret_ab, epsilon);
    let aggregates_b = noisy_reports(&dataset_b, &tokens_b, &secret_ba, epsilon);

    let start_upload = Instant::now();
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
        .expect("upload A");
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
        .expect("upload B");
    let upload_elapsed = start_upload.elapsed();

    let start_result = Instant::now();
    let result = store.result(session_id).expect("result ready");
    let result_elapsed = start_result.elapsed();

    match result {
        SessionResult::Aggregate(agg) => {
            let noisy_total: f64 = agg.entries.iter().map(|entry| entry.total_noisy_sum).sum();
            println!(
                "aggregate    | size: {:>6} | overlap: {:>6} | plain_sum: {:>10.2} | noisy_sum: {:>10.2} | upload: {:>6?} | compute: {:>6?}",
                size,
                overlap,
                plain_sum,
                noisy_total,
                upload_elapsed,
                result_elapsed
            );
        }
        _ => unreachable!(),
    }
}

fn encode_tokens(
    dataset: &[(String, f64)],
    secret: &[u8; 32],
) -> (Vec<String>, BloomFilterPayload) {
    let keys: Vec<String> = dataset.iter().map(|(k, _)| k.clone()).collect();
    let tokens = hash_tokens_with_secret(&keys, secret);
    let mut bloom = SimpleBloom::new(4096, 4);
    for token in &tokens {
        let bytes = BASE64.decode(token).expect("valid base64 token");
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
            rng_seed: None,
        },
    );
    aggregates
        .into_iter()
        .map(|(token, aggregate)| {
            (
                token,
                AggregateReport {
                    noisy_sum: aggregate.noisy_sum,
                    noisy_count: aggregate.noisy_count,
                },
            )
        })
        .collect()
}

fn synthetic_datasets(size: usize, overlap: usize) -> (Vec<(String, f64)>, Vec<(String, f64)>) {
    assert!(overlap <= size);
    let mut rng = rand::thread_rng();
    let mut dataset_a = Vec::with_capacity(size);
    for i in 0..size {
        let key = format!("user-{:05}", i);
        dataset_a.push((key, rng.gen_range(0.0..10.0)));
    }
    let mut dataset_b = Vec::with_capacity(size);
    for i in 0..overlap {
        let key = format!("user-{:05}", i);
        dataset_b.push((key, rng.gen_range(0.0..10.0)));
    }
    for i in overlap..size {
        let key = format!("partner-{:05}", i);
        dataset_b.push((key, rng.gen_range(0.0..10.0)));
    }
    (dataset_a, dataset_b)
}

fn plaintext_intersection(
    dataset_a: &[(String, f64)],
    dataset_b: &[(String, f64)],
) -> HashSet<String> {
    let keys_a: HashSet<String> = dataset_a.iter().map(|(k, _)| k.clone()).collect();
    let keys_b: HashSet<String> = dataset_b.iter().map(|(k, _)| k.clone()).collect();
    keys_a.intersection(&keys_b).cloned().collect()
}
