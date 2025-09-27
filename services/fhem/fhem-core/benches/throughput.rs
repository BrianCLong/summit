use criterion::{criterion_group, criterion_main, Criterion};
use fhem_core::{encrypt_batch, generate_keys, homomorphic_count, homomorphic_sum, KeyConfig};

fn bench_sum(c: &mut Criterion) {
    let keys = generate_keys(&KeyConfig::default()).expect("keys");
    let values: Vec<u32> = (0..32).collect();
    let batch = encrypt_batch(&values, &keys).expect("encrypt batch");

    c.bench_function("homomorphic_sum_32", |b| {
        b.iter(|| {
            homomorphic_sum(&batch.ciphertexts, &keys).expect("sum result");
        });
    });
}

fn bench_count(c: &mut Criterion) {
    let keys = generate_keys(&KeyConfig::default()).expect("keys");
    let values: Vec<u32> = (0..64).collect();
    let batch = encrypt_batch(&values, &keys).expect("encrypt batch");

    c.bench_function("homomorphic_count_64", |b| {
        b.iter(|| {
            homomorphic_count(&batch.ciphertexts, &keys).expect("count result");
        });
    });
}

criterion_group!(benches, bench_sum, bench_count);
criterion_main!(benches);
