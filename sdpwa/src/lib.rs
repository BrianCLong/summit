use rand::{Rng, SeedableRng};
use rand_chacha::ChaCha20Rng;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::{HashMap, VecDeque};
use std::time::Duration;
use thiserror::Error;

const MIN_SEED_LEN: usize = 16;

#[derive(Debug, Error)]
pub enum AggregatorError {
    #[error("window size must be positive")]
    EmptyWindow,
    #[error("stride must be positive")]
    EmptyStride,
    #[error("max contributions per window must be positive")]
    EmptyContributionLimit,
    #[error("epsilon must be positive")]
    InvalidEpsilon,
    #[error("delta must be between 0 and 1")]
    InvalidDelta,
    #[error("seed must contain at least {MIN_SEED_LEN} bytes")]
    SeedTooShort,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Event {
    pub identity: String,
    pub value: f64,
    pub timestamp_ms: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ContributionBounds {
    pub max_contributions_per_window: usize,
    pub min_value: f64,
    pub max_value: f64,
}

impl ContributionBounds {
    pub fn clamp(&self, value: f64) -> f64 {
        value.clamp(self.min_value, self.max_value)
    }

    pub fn max_abs_value(&self) -> f64 {
        self.min_value.abs().max(self.max_value.abs())
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DpParameters {
    pub epsilon_count: f64,
    pub epsilon_sum: f64,
    pub delta_per_window: f64,
    pub ledger_delta_tolerance: f64,
}

impl DpParameters {
    fn validate(&self) -> Result<(), AggregatorError> {
        if self.epsilon_count <= 0.0 || self.epsilon_sum <= 0.0 {
            return Err(AggregatorError::InvalidEpsilon);
        }
        if !(0.0..1.0).contains(&self.delta_per_window)
            || !(0.0..1.0).contains(&self.ledger_delta_tolerance)
        {
            return Err(AggregatorError::InvalidDelta);
        }
        Ok(())
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct WindowConfig {
    #[serde(with = "humantime_serde")]
    pub window_size: Duration,
    #[serde(with = "humantime_serde")]
    pub window_stride: Duration,
    pub origin_ms: u64,
}

impl WindowConfig {
    fn validate(&self) -> Result<(), AggregatorError> {
        if self.window_size.is_zero() {
            return Err(AggregatorError::EmptyWindow);
        }
        if self.window_stride.is_zero() {
            return Err(AggregatorError::EmptyStride);
        }
        Ok(())
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AggregatorConfig {
    pub dp: DpParameters,
    pub bounds: ContributionBounds,
    pub window: WindowConfig,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PrivacyLoss {
    pub per_release_epsilons: Vec<f64>,
    pub release_delta: f64,
    pub cumulative_epsilon: f64,
    pub cumulative_delta: f64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct WindowRelease {
    pub window_start_ms: u64,
    pub window_end_ms: u64,
    pub noisy_count: f64,
    pub noisy_sum: f64,
    pub raw_count: f64,
    pub raw_sum: f64,
    pub privacy: PrivacyLoss,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PrivacyEntry {
    pub window_start_ms: u64,
    pub window_end_ms: u64,
    pub epsilons: Vec<f64>,
    pub delta: f64,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct PrivacyLedger {
    target_delta: f64,
    entries: Vec<PrivacyEntry>,
    cumulative_epsilon: f64,
}

impl PrivacyLedger {
    pub fn new(target_delta: f64) -> Result<Self, AggregatorError> {
        if !(0.0..1.0).contains(&target_delta) {
            return Err(AggregatorError::InvalidDelta);
        }
        Ok(Self {
            target_delta,
            entries: Vec::new(),
            cumulative_epsilon: 0.0,
        })
    }

    pub fn record(&mut self, entry: PrivacyEntry) -> PrivacyLoss {
        self.entries.push(entry);
        self.cumulative_epsilon = self.compute_epsilon();
        PrivacyLoss {
            per_release_epsilons: self
                .entries
                .last()
                .map(|e| e.epsilons.clone())
                .unwrap_or_default(),
            release_delta: self.entries.last().map(|e| e.delta).unwrap_or_default(),
            cumulative_epsilon: self.cumulative_epsilon,
            cumulative_delta: self.delta_consumed(),
        }
    }

    pub fn entries(&self) -> &[PrivacyEntry] {
        &self.entries
    }

    pub fn cumulative_epsilon(&self) -> f64 {
        self.cumulative_epsilon
    }

    pub fn delta_consumed(&self) -> f64 {
        self.entries.iter().map(|e| e.delta).sum()
    }

    fn compute_epsilon(&self) -> f64 {
        let epsilons: Vec<f64> = self
            .entries
            .iter()
            .flat_map(|entry| entry.epsilons.clone())
            .collect();
        if epsilons.is_empty() {
            return 0.0;
        }
        let sum_sq: f64 = epsilons.iter().map(|e| e * e).sum();
        let advanced_term: f64 = epsilons.iter().map(|e| e * (e.exp() - 1.0)).sum();
        let delta_used = self.delta_consumed();
        let delta_prime = (self.target_delta - delta_used).max(1e-12);
        (2.0 * delta_prime.recip().ln() * sum_sq).sqrt() + advanced_term
    }
}

#[derive(Clone, Debug)]
pub struct NoiseSeed {
    bytes: [u8; 32],
}

impl NoiseSeed {
    pub fn new(bytes: &[u8]) -> Result<Self, AggregatorError> {
        if bytes.len() < MIN_SEED_LEN {
            return Err(AggregatorError::SeedTooShort);
        }
        let mut hasher = Sha256::new();
        hasher.update(bytes);
        let digest = hasher.finalize();
        let mut arr = [0u8; 32];
        arr.copy_from_slice(&digest);
        Ok(Self { bytes: arr })
    }

    fn derive(&self, window_start: u64, metric: &str) -> [u8; 32] {
        let mut hasher = Sha256::new();
        hasher.update(&self.bytes);
        hasher.update(window_start.to_le_bytes());
        hasher.update(metric.as_bytes());
        let digest = hasher.finalize();
        let mut arr = [0u8; 32];
        arr.copy_from_slice(&digest);
        arr
    }
}

#[derive(Clone, Debug)]
struct SanitizedWindowMetrics {
    count: f64,
    sum: f64,
}

#[derive(Clone, Debug)]
pub struct StreamingDpWindowAggregator {
    config: AggregatorConfig,
    ledger: PrivacyLedger,
    seed: NoiseSeed,
    backlog: VecDeque<Event>,
    next_window_start: u64,
}

impl StreamingDpWindowAggregator {
    pub fn new(config: AggregatorConfig, seed_bytes: &[u8]) -> Result<Self, AggregatorError> {
        config.dp.validate()?;
        config.window.validate()?;
        if config.bounds.max_contributions_per_window == 0 {
            return Err(AggregatorError::EmptyContributionLimit);
        }
        let ledger = PrivacyLedger::new(config.dp.ledger_delta_tolerance)?;
        let seed = NoiseSeed::new(seed_bytes)?;
        Ok(Self {
            next_window_start: config.window.origin_ms,
            config,
            ledger,
            seed,
            backlog: VecDeque::new(),
        })
    }

    pub fn ingest(&mut self, event: Event) {
        self.backlog.push_back(event);
    }

    pub fn release_windows(&mut self, up_to_ms: u64) -> Vec<WindowRelease> {
        let mut releases = Vec::new();
        let window_size = self.config.window.window_size.as_millis() as u64;
        let stride = self.config.window.window_stride.as_millis() as u64;
        while self.next_window_start + window_size <= up_to_ms {
            let start = self.next_window_start;
            let end = start + window_size;
            let sanitized = self.compute_window(start, end);
            let noisy_count = sanitized.count
                + self.sample_laplace(
                    self.count_sensitivity() / self.config.dp.epsilon_count,
                    start,
                    "count",
                );
            let noisy_sum = sanitized.sum
                + self.sample_laplace(
                    self.sum_sensitivity() / self.config.dp.epsilon_sum,
                    start,
                    "sum",
                );
            let entry = PrivacyEntry {
                window_start_ms: start,
                window_end_ms: end,
                epsilons: vec![self.config.dp.epsilon_count, self.config.dp.epsilon_sum],
                delta: self.config.dp.delta_per_window,
            };
            let privacy = self.ledger.record(entry);
            releases.push(WindowRelease {
                window_start_ms: start,
                window_end_ms: end,
                noisy_count,
                noisy_sum,
                raw_count: sanitized.count,
                raw_sum: sanitized.sum,
                privacy,
            });
            self.next_window_start += stride;
        }
        self.prune_backlog();
        releases
    }

    pub fn ledger(&self) -> &PrivacyLedger {
        &self.ledger
    }

    fn prune_backlog(&mut self) {
        let window_size = self.config.window.window_size.as_millis() as u64;
        let min_ts = self.next_window_start.saturating_sub(window_size);
        while let Some(event) = self.backlog.front() {
            if event.timestamp_ms < min_ts {
                self.backlog.pop_front();
            } else {
                break;
            }
        }
    }

    fn compute_window(&self, start: u64, end: u64) -> SanitizedWindowMetrics {
        let mut per_identity: HashMap<&str, Vec<f64>> = HashMap::new();
        for event in &self.backlog {
            if event.timestamp_ms >= start && event.timestamp_ms < end {
                let entry = per_identity.entry(&event.identity).or_insert_with(Vec::new);
                entry.push(self.config.bounds.clamp(event.value));
            }
        }
        let mut count = 0usize;
        let mut sum = 0.0f64;
        for values in per_identity.values_mut() {
            if values.len() > self.config.bounds.max_contributions_per_window {
                values.truncate(self.config.bounds.max_contributions_per_window);
            }
            count += values.len();
            sum += values.iter().copied().sum::<f64>();
        }
        SanitizedWindowMetrics {
            count: count as f64,
            sum,
        }
    }

    fn sample_laplace(&self, scale: f64, window_start: u64, metric: &str) -> f64 {
        if scale <= 0.0 {
            return 0.0;
        }
        let seed = self.seed.derive(window_start, metric);
        let mut rng = ChaCha20Rng::from_seed(seed);
        let u: f64 = rng.gen::<f64>() - 0.5;
        let sign = if u >= 0.0 { 1.0 } else { -1.0 };
        -scale * sign * (1.0 - 2.0 * u.abs()).ln()
    }

    fn count_sensitivity(&self) -> f64 {
        self.config.bounds.max_contributions_per_window as f64
    }

    fn sum_sensitivity(&self) -> f64 {
        self.config.bounds.max_contributions_per_window as f64 * self.config.bounds.max_abs_value()
    }
}

#[derive(Clone, Debug)]
pub struct AuditReport {
    pub computed_epsilon: f64,
    pub reported_epsilon: f64,
    pub delta_consumed: f64,
    pub consistent: bool,
    pub discrepancy: f64,
}

#[derive(Clone, Debug)]
pub struct Auditor {
    target_delta: f64,
}

impl Auditor {
    pub fn new(target_delta: f64) -> Result<Self, AggregatorError> {
        if !(0.0..1.0).contains(&target_delta) {
            return Err(AggregatorError::InvalidDelta);
        }
        Ok(Self { target_delta })
    }

    pub fn audit(&self, ledger: &PrivacyLedger) -> AuditReport {
        let epsilons: Vec<f64> = ledger
            .entries()
            .iter()
            .flat_map(|entry| entry.epsilons.clone())
            .collect();
        let sum_sq: f64 = epsilons.iter().map(|e| e * e).sum();
        let advanced_term: f64 = epsilons.iter().map(|e| e * (e.exp() - 1.0)).sum();
        let delta_prime = (self.target_delta - ledger.delta_consumed()).max(1e-12);
        let computed = if epsilons.is_empty() {
            0.0
        } else {
            (2.0 * delta_prime.recip().ln() * sum_sq).sqrt() + advanced_term
        };
        let reported = ledger.cumulative_epsilon();
        let discrepancy = (reported - computed).abs();
        AuditReport {
            computed_epsilon: computed,
            reported_epsilon: reported,
            delta_consumed: ledger.delta_consumed(),
            consistent: discrepancy < 1e-8,
            discrepancy,
        }
    }
}

#[cfg(feature = "wasm")]
mod wasm_bindings {
    use super::*;
    use serde_wasm_bindgen::{from_value, to_value};
    use wasm_bindgen::prelude::*;

    #[wasm_bindgen]
    pub struct WasmAggregator {
        inner: StreamingDpWindowAggregator,
    }

    #[wasm_bindgen]
    impl WasmAggregator {
        #[wasm_bindgen(constructor)]
        pub fn new(config: JsValue, seed: &[u8]) -> Result<WasmAggregator, JsValue> {
            let config: AggregatorConfig = from_value(config)?;
            let inner = StreamingDpWindowAggregator::new(config, seed)
                .map_err(|err| JsValue::from_str(&err.to_string()))?;
            Ok(WasmAggregator { inner })
        }

        #[wasm_bindgen]
        pub fn ingest(&mut self, event: JsValue) -> Result<(), JsValue> {
            let event: Event = from_value(event)?;
            self.inner.ingest(event);
            Ok(())
        }

        #[wasm_bindgen]
        pub fn release(&mut self, up_to_ms: u64) -> Result<JsValue, JsValue> {
            let releases = self.inner.release_windows(up_to_ms);
            to_value(&releases).map_err(|err| JsValue::from_str(&err.to_string()))
        }

        #[wasm_bindgen]
        pub fn ledger(&self) -> Result<JsValue, JsValue> {
            to_value(self.inner.ledger()).map_err(|err| JsValue::from_str(&err.to_string()))
        }
    }
}

#[cfg(feature = "wasm")]
pub use wasm_bindings::WasmAggregator;

#[cfg(test)]
mod tests {
    use super::*;

    fn test_config() -> AggregatorConfig {
        AggregatorConfig {
            dp: DpParameters {
                epsilon_count: 0.5,
                epsilon_sum: 1.0,
                delta_per_window: 1e-6,
                ledger_delta_tolerance: 1e-5,
            },
            bounds: ContributionBounds {
                max_contributions_per_window: 2,
                min_value: -5.0,
                max_value: 5.0,
            },
            window: WindowConfig {
                window_size: Duration::from_secs(60),
                window_stride: Duration::from_secs(30),
                origin_ms: 0,
            },
        }
    }

    fn seed() -> Vec<u8> {
        b"deterministic-seed-for-tests".to_vec()
    }

    #[test]
    fn deterministic_noise_across_runs() {
        let mut agg_a = StreamingDpWindowAggregator::new(test_config(), &seed()).unwrap();
        let mut agg_b = StreamingDpWindowAggregator::new(test_config(), &seed()).unwrap();
        for ts in [10_000, 20_000, 30_000, 90_000] {
            agg_a.ingest(Event {
                identity: "user-a".into(),
                value: 1.3,
                timestamp_ms: ts,
            });
            agg_b.ingest(Event {
                identity: "user-a".into(),
                value: 1.3,
                timestamp_ms: ts,
            });
        }
        let released_a = agg_a.release_windows(180_000);
        let released_b = agg_b.release_windows(180_000);
        assert_eq!(released_a.len(), released_b.len());
        for (a, b) in released_a.iter().zip(released_b.iter()) {
            assert!((a.noisy_count - b.noisy_count).abs() < 1e-9);
            assert!((a.noisy_sum - b.noisy_sum).abs() < 1e-9);
        }
    }

    #[test]
    fn ledger_matches_auditor() {
        let mut agg = StreamingDpWindowAggregator::new(test_config(), &seed()).unwrap();
        for idx in 0..5 {
            agg.ingest(Event {
                identity: format!("user-{idx}"),
                value: idx as f64,
                timestamp_ms: (idx as u64) * 20_000,
            });
        }
        agg.release_windows(200_000);
        let auditor = Auditor::new(1e-5).unwrap();
        let report = auditor.audit(agg.ledger());
        assert!(report.consistent);
    }

    #[test]
    fn streaming_matches_offline_sanitization() {
        let config = test_config();
        let mut agg = StreamingDpWindowAggregator::new(config.clone(), &seed()).unwrap();
        let events = vec![
            Event {
                identity: "user-a".into(),
                value: 10.0,
                timestamp_ms: 10_000,
            },
            Event {
                identity: "user-a".into(),
                value: -10.0,
                timestamp_ms: 30_000,
            },
            Event {
                identity: "user-b".into(),
                value: 1.0,
                timestamp_ms: 50_000,
            },
            Event {
                identity: "user-a".into(),
                value: 4.0,
                timestamp_ms: 90_000,
            },
        ];
        for event in &events {
            agg.ingest(event.clone());
        }
        let releases = agg.release_windows(120_000);
        assert!(!releases.is_empty());
        let offline = offline_sanitize(
            &events,
            &config,
            releases[0].window_start_ms,
            releases[0].window_end_ms,
        );
        let release = &releases[0];
        assert_eq!(release.raw_count, offline.count);
        assert!((release.raw_sum - offline.sum).abs() < 1e-9);
    }

    fn offline_sanitize(
        events: &[Event],
        config: &AggregatorConfig,
        start: u64,
        end: u64,
    ) -> SanitizedWindowMetrics {
        let mut per_identity: HashMap<&str, Vec<f64>> = HashMap::new();
        for event in events {
            if event.timestamp_ms >= start && event.timestamp_ms < end {
                per_identity
                    .entry(&event.identity)
                    .or_insert_with(Vec::new)
                    .push(config.bounds.clamp(event.value));
            }
        }
        let mut count = 0usize;
        let mut sum = 0.0f64;
        for values in per_identity.values_mut() {
            if values.len() > config.bounds.max_contributions_per_window {
                values.truncate(config.bounds.max_contributions_per_window);
            }
            count += values.len();
            sum += values.iter().copied().sum::<f64>();
        }
        SanitizedWindowMetrics {
            count: count as f64,
            sum,
        }
    }
}
