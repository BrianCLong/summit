use ahash::RandomState;
use serde::{Deserialize, Serialize};
use std::f64::consts::LN_2;
use std::hash::{BuildHasher, Hasher};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct HyperLogLog {
    precision: u8,
    registers: Vec<u8>,
}

impl HyperLogLog {
    pub fn new(precision: u8) -> Self {
        assert!(
            (4..=18).contains(&precision),
            "precision must be between 4 and 18"
        );
        let size = 1 << precision;
        Self {
            precision,
            registers: vec![0; size],
        }
    }

    pub fn insert(&mut self, value: &str) {
        let hash = hash_with_seed(value, 0);
        self.insert_hash(hash);
    }

    fn insert_hash(&mut self, hash: u64) {
        let index_bits = self.precision as u64;
        let index = (hash >> (64 - index_bits)) as usize;
        let w = hash << index_bits;
        let leading = w.leading_zeros() + 1;
        self.registers[index] = self.registers[index].max(leading as u8);
    }

    pub fn estimate(&self) -> f64 {
        let m = self.registers.len() as f64;
        let alpha = alpha_m(m);
        let sum: f64 = self.registers.iter().map(|&v| 2f64.powi(-(v as i32))).sum();
        let raw_estimate = alpha * m * m / sum;
        let zeros = self.registers.iter().filter(|&&v| v == 0).count() as f64;
        if raw_estimate <= 2.5 * m && zeros > 0.0 {
            m * (m / zeros).ln()
        } else {
            raw_estimate
        }
    }
}

fn alpha_m(m: f64) -> f64 {
    match m as usize {
        16 => 0.673,
        32 => 0.697,
        64 => 0.709,
        _ => 0.7213 / (1.0 + 1.079 / m),
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct BloomFilter {
    bits: Vec<u8>,
    bit_size: usize,
    hash_functions: u32,
}

impl BloomFilter {
    pub fn new(capacity: usize, false_positive_rate: f64) -> Self {
        assert!(capacity > 0, "capacity must be positive");
        assert!(false_positive_rate > 0.0 && false_positive_rate < 1.0);
        let m = optimal_bit_size(capacity, false_positive_rate);
        let k = optimal_hash_functions(capacity, m);
        let byte_size = (m + 7) / 8;
        Self {
            bits: vec![0; byte_size],
            bit_size: m,
            hash_functions: k,
        }
    }

    pub fn insert(&mut self, value: &str) {
        for i in 0..self.hash_functions {
            let hash = hash_with_seed(value, i as u64);
            let idx = (hash as usize) % self.bit_size;
            self.set_bit(idx);
        }
    }

    pub fn contains(&self, value: &str) -> bool {
        (0..self.hash_functions).all(|i| {
            let hash = hash_with_seed(value, i as u64);
            let idx = (hash as usize) % self.bit_size;
            self.get_bit(idx)
        })
    }

    fn set_bit(&mut self, index: usize) {
        let byte_index = index / 8;
        let bit_index = index % 8;
        self.bits[byte_index] |= 1 << bit_index;
    }

    fn get_bit(&self, index: usize) -> bool {
        let byte_index = index / 8;
        let bit_index = index % 8;
        (self.bits[byte_index] >> bit_index) & 1 == 1
    }

    pub fn bit_size(&self) -> usize {
        self.bit_size
    }

    pub fn hash_functions(&self) -> u32 {
        self.hash_functions
    }
}

fn optimal_bit_size(capacity: usize, fp_rate: f64) -> usize {
    let numerator = -(capacity as f64) * fp_rate.ln();
    let denominator = LN_2.powi(2);
    (numerator / denominator).ceil() as usize
}

fn optimal_hash_functions(capacity: usize, bit_size: usize) -> u32 {
    let k = (bit_size as f64 / capacity as f64) * LN_2;
    k.round().max(1.0) as u32
}

fn hash_with_seed(value: &str, seed: u64) -> u64 {
    let state = RandomState::with_seeds(
        seed,
        seed.rotate_left(17),
        seed ^ 0x9e3779b97f4a7c15,
        seed.rotate_right(11),
    );
    let mut hasher = state.build_hasher();
    hasher.write(value.as_bytes());
    hasher.finish()
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct JoinProofDigest {
    pub hll: HyperLogLog,
    pub bloom: BloomFilter,
}

impl JoinProofDigest {
    pub fn new(precision: u8, capacity: usize, false_positive_rate: f64) -> Self {
        Self {
            hll: HyperLogLog::new(precision),
            bloom: BloomFilter::new(capacity, false_positive_rate),
        }
    }

    pub fn ingest(&mut self, values: &[String]) {
        for value in values {
            self.hll.insert(value);
            self.bloom.insert(value);
        }
    }

    pub fn estimated_cardinality(&self) -> f64 {
        self.hll.estimate()
    }

    pub fn might_contain(&self, value: &str) -> bool {
        self.bloom.contains(value)
    }
}
