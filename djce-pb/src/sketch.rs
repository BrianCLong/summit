use hyperloglog::HyperLogLog;
use serde::{Deserialize, Serialize};

use crate::{
    bloom::BloomFilter,
    hash::hash_record,
    minhash::MinHashSketch,
};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SketchConfig {
    pub expected_items: usize,
    pub bloom_false_positive_rate: f64,
    pub hll_error_rate: f64,
    pub minhash_permutations: usize,
    pub seed: u64,
}

impl Default for SketchConfig {
    fn default() -> Self {
        SketchConfig {
            expected_items: 100_000,
            bloom_false_positive_rate: 0.01,
            hll_error_rate: 0.015,
            minhash_permutations: 128,
            seed: 42,
        }
    }
}

impl SketchConfig {
    pub fn minhash_error(&self) -> f64 {
        (1.0 / (self.minhash_permutations as f64).max(1.0)).sqrt()
    }
}

#[derive(Clone, Debug)]
pub struct DatasetSketch {
    bloom: BloomFilter,
    hll: HyperLogLog,
    minhash: MinHashSketch,
    config: SketchConfig,
}

impl DatasetSketch {
    pub fn new(config: SketchConfig) -> Self {
        let hll_seed = ((config.seed as u128) << 64) | config.seed as u128;
        let error_rate = config.hll_error_rate.clamp(0.0001, 0.35);
        DatasetSketch {
            bloom: BloomFilter::new(
                config.expected_items,
                config.bloom_false_positive_rate,
                config.seed,
            ),
            hll: HyperLogLog::new_deterministic(error_rate, hll_seed),
            minhash: MinHashSketch::new(config.minhash_permutations, config.seed ^ 0xabad1dea),
            config,
        }
    }

    pub fn absorb_record(&mut self, fields: &[String]) -> u64 {
        let hash = hash_record(fields, self.config.seed);
        self.absorb_hash(hash);
        hash
    }

    pub fn absorb_hash(&mut self, hash: u64) {
        self.bloom.insert(hash);
        self.hll.insert(&hash);
        self.minhash.update(hash);
    }

    pub fn contains_hash(&self, hash: u64) -> bool {
        self.bloom.contains(hash)
    }

    pub fn hyperloglog(&self) -> &HyperLogLog {
        &self.hll
    }

    pub fn minhash(&self) -> &MinHashSketch {
        &self.minhash
    }

    pub fn bloom(&self) -> &BloomFilter {
        &self.bloom
    }

    pub fn config(&self) -> &SketchConfig {
        &self.config
    }

    pub fn estimated_cardinality(&self) -> f64 {
        self.hll.len()
    }
}

#[derive(Clone, Debug)]
pub struct DatasetProfile {
    pub name: String,
    pub quasi_identifier_width: usize,
    pub record_count: usize,
    pub sketch: DatasetSketch,
}

impl DatasetProfile {
    pub fn from_records<I>(name: impl Into<String>, records: I, mut config: SketchConfig) -> Self
    where
        I: IntoIterator,
        I::Item: Into<Vec<String>>,
    {
        let records_vec: Vec<Vec<String>> = records.into_iter().map(Into::into).collect();
        let record_count = records_vec.len();
        let quasi_identifier_width = records_vec.iter().map(|r| r.len()).max().unwrap_or(0);

        if config.expected_items < record_count {
            config.expected_items = record_count;
        }

        let mut sketch = DatasetSketch::new(config.clone());
        for fields in &records_vec {
            sketch.absorb_record(fields);
        }

        DatasetProfile {
            name: name.into(),
            quasi_identifier_width,
            record_count,
            sketch,
        }
    }
}
