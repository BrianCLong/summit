use std::f64::consts::LN_2;

use crate::hash::mix_hash;

#[derive(Clone, Debug)]
pub struct BloomFilter {
    num_bits: usize,
    num_hashes: u32,
    bits: Vec<u8>,
    seeds: Vec<u64>,
    false_positive_rate: f64,
}

impl BloomFilter {
    pub fn new(expected_items: usize, false_positive_rate: f64, seed: u64) -> Self {
        let expected_items = expected_items.max(1);
        let false_positive_rate = false_positive_rate.clamp(1e-9, 0.5);
        let num_bits = ((-(expected_items as f64) * false_positive_rate.ln()) / (LN_2 * LN_2))
            .ceil()
            .max(expected_items as f64)
            as usize;
        let num_hashes = ((num_bits as f64 / expected_items as f64) * LN_2)
            .round()
            .clamp(1.0, 12.0) as u32;

        let mut seeds = Vec::with_capacity(num_hashes as usize);
        let mut local_seed = seed;
        for _ in 0..num_hashes {
            local_seed = mix_hash(local_seed, 0x9e3779b185ebca87);
            seeds.push(local_seed);
        }

        BloomFilter {
            num_bits: num_bits.max(8),
            num_hashes,
            bits: vec![0; (num_bits + 7) / 8],
            seeds,
            false_positive_rate,
        }
    }

    pub fn insert(&mut self, value: u64) {
        let indices: Vec<u64> = self.hash_indices(value).collect();
        for bit_idx in indices {
            self.set_bit(bit_idx as usize);
        }
    }

    pub fn contains(&self, value: u64) -> bool {
        self.hash_indices(value)
            .all(|bit_idx| self.test_bit(bit_idx as usize))
    }

    pub fn false_positive_rate(&self) -> f64 {
        self.false_positive_rate
    }

    pub fn num_hashes(&self) -> u32 {
        self.num_hashes
    }

    fn hash_indices(&self, value: u64) -> impl Iterator<Item = u64> + '_ {
        let modulo = self.num_bits as u64;
        self.seeds.iter().map(move |seed| mix_hash(value, *seed) % modulo)
    }

    fn set_bit(&mut self, index: usize) {
        let byte_index = index / 8;
        let bit = index % 8;
        if let Some(byte) = self.bits.get_mut(byte_index) {
            *byte |= 1 << bit;
        }
    }

    fn test_bit(&self, index: usize) -> bool {
        let byte_index = index / 8;
        let bit = index % 8;
        self.bits
            .get(byte_index)
            .map(|byte| (byte & (1 << bit)) != 0)
            .unwrap_or(false)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bloom_filter_round_trip() {
        let mut filter = BloomFilter::new(100, 0.01, 42);
        for value in 0..50u64 {
            filter.insert(value);
        }

        for value in 0..50u64 {
            assert!(filter.contains(value));
        }

        let mut false_positives = 0;
        for value in 200..400u64 {
            if filter.contains(value) {
                false_positives += 1;
            }
        }
        let fp_rate = false_positives as f64 / 200.0;
        assert!(fp_rate <= 0.08, "unexpectedly high false positive rate: {fp_rate}");
    }
}
