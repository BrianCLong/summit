use rand::{rngs::StdRng, Rng, SeedableRng};
use crate::hash::mix_hash;

#[derive(Clone, Debug)]
pub struct MinHashSketch {
    seeds: Vec<u64>,
    signature: Vec<u64>,
}

impl MinHashSketch {
    pub fn new(num_permutations: usize, seed: u64) -> Self {
        let num_permutations = num_permutations.max(1);
        let mut rng = StdRng::seed_from_u64(seed);
        let mut seeds = Vec::with_capacity(num_permutations);
        for _ in 0..num_permutations {
            seeds.push(rng.gen());
        }

        MinHashSketch {
            seeds,
            signature: vec![u64::MAX; num_permutations],
        }
    }

    pub fn update(&mut self, hash_value: u64) {
        for (i, seed) in self.seeds.iter().enumerate() {
            let permuted = mix_hash(hash_value, *seed);
            if permuted < self.signature[i] {
                self.signature[i] = permuted;
            }
        }
    }

    pub fn estimate_jaccard(&self, other: &Self) -> f64 {
        let matches = self
            .signature
            .iter()
            .zip(other.signature.iter())
            .filter(|(a, b)| a == b)
            .count();

        matches as f64 / self.signature.len().max(1) as f64
    }

    pub fn signature(&self) -> &[u64] {
        &self.signature
    }

    pub fn num_permutations(&self) -> usize {
        self.signature.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn identical_sets_have_perfect_similarity() {
        let mut left = MinHashSketch::new(64, 99);
        let mut right = MinHashSketch::new(64, 99);
        for value in 0..128u64 {
            left.update(value);
            right.update(value);
        }
        assert!((left.estimate_jaccard(&right) - 1.0).abs() < 1e-9);
    }

    #[test]
    fn disjoint_sets_have_low_similarity() {
        let mut left = MinHashSketch::new(64, 123);
        let mut right = MinHashSketch::new(64, 123);
        for value in 0..128u64 {
            left.update(value);
        }
        for value in 128..256u64 {
            right.update(value);
        }
        assert!(left.estimate_jaccard(&right) < 0.1);
    }
}
