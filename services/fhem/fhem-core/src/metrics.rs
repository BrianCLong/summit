#[derive(Debug, Clone, Copy, serde::Serialize, serde::Deserialize)]
pub struct CiphertextStats {
    pub count: usize,
    pub total_bytes: usize,
}

impl CiphertextStats {
    pub fn new(count: usize, total_bytes: usize) -> Self {
        Self { count, total_bytes }
    }

    pub fn average_bytes(&self) -> f64 {
        if self.count == 0 {
            0.0
        } else {
            self.total_bytes as f64 / self.count as f64
        }
    }
}

impl Default for CiphertextStats {
    fn default() -> Self {
        Self {
            count: 0,
            total_bytes: 0,
        }
    }
}
