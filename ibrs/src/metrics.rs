use std::sync::{Arc, Mutex};
use std::collections::HashMap;

#[derive(Clone, Debug)]
pub struct MetricsRegistry {
    counters: Arc<Mutex<HashMap<String, u64>>>,
}

impl MetricsRegistry {
    pub fn new() -> Self {
        Self {
            counters: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn increment(&self, key: &str) {
        let mut counters = self.counters.lock().unwrap();
        // Check if key exists to avoid allocation if possible?
        // HashMap entry API requires ownership if inserting.
        // We can check contains_key first, but that's two lookups.
        // A better approach for high performance is pre-registering metrics or using atomic integers per key.
        // For now, let's just use `entry` but we accept that `key.to_string()` happens.
        // However, we can optimize by ensuring we don't re-allocate if we can help it,
        // but standard HashMap<String, ...> needs String.
        // To strictly avoid allocation on every call without DashMap or other crates,
        // we would need a fixed set of keys or use interned strings.
        // Given the constraints and the "skeleton" nature, the current implementation is acceptable for V1,
        // but we will add a comment about future optimization.

        // Actually, we can use `if let` to avoid allocation on existing keys if we didn't use entry API
        // counters.get_mut(key).map(|v| *v += 1).unwrap_or_else(|| { counters.insert(key.to_string(), 1); });
        // This does 2 lookups on insert, but 1 lookup on update (common case), and no allocation on update.

        if let Some(val) = counters.get_mut(key) {
            *val += 1;
        } else {
            counters.insert(key.to_string(), 1);
        }
    }

    pub fn get(&self, key: &str) -> u64 {
        let counters = self.counters.lock().unwrap();
        *counters.get(key).unwrap_or(&0)
    }
}

impl Default for MetricsRegistry {
    fn default() -> Self {
        Self::new()
    }
}
