use ordered_float::OrderedFloat;

/// Deterministic batching utility that sorts input by the provided stable key
/// before chunking into fixed-size batches. This guarantees reproducible batch
/// boundaries regardless of upstream iterator ordering.
pub struct DeterministicBatcher {
    batch_size: usize,
}

impl DeterministicBatcher {
    pub fn new(batch_size: usize) -> Self {
        assert!(batch_size > 0, "batch size must be greater than zero");
        Self { batch_size }
    }

    pub fn batch<T, K, F>(&self, mut items: Vec<T>, key_fn: F) -> Vec<Vec<T>>
    where
        F: Fn(&T) -> K,
        K: Ord,
        T: Clone,
    {
        items.sort_by(|a, b| key_fn(a).cmp(&key_fn(b)));
        items
            .chunks(self.batch_size)
            .map(|chunk| chunk.to_vec())
            .collect()
    }

    pub fn batch_with_score<T, F>(&self, mut items: Vec<T>, score_fn: F) -> Vec<Vec<T>>
    where
        F: Fn(&T) -> f32,
        T: Clone,
    {
        items.sort_by(|a, b| {
            let lhs = OrderedFloat(score_fn(a));
            let rhs = OrderedFloat(score_fn(b));
            lhs.cmp(&rhs)
        });
        items
            .chunks(self.batch_size)
            .map(|chunk| chunk.to_vec())
            .collect()
    }
}

impl Default for DeterministicBatcher {
    fn default() -> Self {
        Self::new(64)
    }
}
