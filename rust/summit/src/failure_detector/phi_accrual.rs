use std::collections::HashMap;
use std::time::Instant;

/// A failure detector based on the Phi Accrual Failure Detector algorithm.
/// It calculates a suspicion level (phi) based on inter-arrival times of heartbeats.
pub struct PhiAccrualFailureDetector {
    threshold: f64,
    min_std_deviation_millis: u64,
    history: HashMap<String, Window>,
}

struct Window {
    intervals: Vec<u64>,
    last_heartbeat: Instant,
}

impl PhiAccrualFailureDetector {
    pub fn new(threshold: f64, min_std_deviation_millis: u64) -> Self {
        Self {
            threshold,
            min_std_deviation_millis,
            history: HashMap::new(),
        }
    }

    pub fn report(&mut self, resource_id: &str) {
        let now = Instant::now();
        let entry = self.history.entry(resource_id.to_string()).or_insert_with(|| Window {
            intervals: Vec::new(),
            last_heartbeat: now,
        });

        let elapsed = now.duration_since(entry.last_heartbeat).as_millis() as u64;
        // Don't record the first interval as it's just initialization or 0
        if elapsed > 0 {
             entry.intervals.push(elapsed);
             if entry.intervals.len() > 1000 {
                 entry.intervals.remove(0);
             }
        }
        entry.last_heartbeat = now;
    }

    pub fn is_available(&self, resource_id: &str) -> bool {
        self.phi(resource_id) < self.threshold
    }

    pub fn phi(&self, resource_id: &str) -> f64 {
        let now = Instant::now();
        if let Some(window) = self.history.get(resource_id) {
             let time_since_last = now.duration_since(window.last_heartbeat).as_millis() as u64;
             let mean = self.mean(&window.intervals);
             let std_dev = self.std_dev(&window.intervals, mean);

             // Avoid division by zero
             let std_dev = if std_dev < self.min_std_deviation_millis as f64 {
                 self.min_std_deviation_millis as f64
             } else {
                 std_dev
             };

             let y = (time_since_last as f64 - mean) / std_dev;
             let e = (-y * (1.5976 + 0.070566 * y * y)).exp();

             if time_since_last as f64 > mean {
                 -((e / (1.0 + e)).log10())
             } else {
                 0.0
             }
        } else {
            0.0
        }
    }

    fn mean(&self, data: &[u64]) -> f64 {
        if data.is_empty() {
            return 0.0;
        }
        let sum: u64 = data.iter().sum();
        sum as f64 / data.len() as f64
    }

    fn std_dev(&self, data: &[u64], mean: f64) -> f64 {
        if data.len() < 2 {
            return 0.0;
        }
        let variance: f64 = data.iter()
            .map(|&val| {
                let diff = val as f64 - mean;
                diff * diff
            })
            .sum::<f64>() / (data.len() - 1) as f64;
        variance.sqrt()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread;
    use std::time::Duration;

    #[test]
    fn test_phi_accrual() {
        let mut fd = PhiAccrualFailureDetector::new(8.0, 100);
        let id = "node1";

        // Simulate steady heartbeats
        for _ in 0..10 {
            fd.report(id);
            thread::sleep(Duration::from_millis(50));
        }

        assert!(fd.is_available(id));

        // Wait a long time
        thread::sleep(Duration::from_millis(1000));

        // Should be unavailable (phi high)
        assert!(!fd.is_available(id));
    }
}
