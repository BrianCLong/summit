use rand::prelude::*;
use serde::{Deserialize, Serialize};

use crate::noise::{Mechanism, NoiseParameters, sample_noise};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TestStub {
    pub target: String,
    pub mechanism: Mechanism,
    pub parameters: NoiseParameters,
    pub samples: usize,
}

impl TestStub {
    pub fn new(
        target: impl Into<String>,
        mechanism: Mechanism,
        parameters: NoiseParameters,
    ) -> Self {
        Self {
            target: target.into(),
            mechanism,
            parameters,
            samples: 10_000,
        }
    }

    pub fn with_samples(mut self, samples: usize) -> Self {
        self.samples = samples.max(1000);
        self
    }

    pub fn run(&self) -> UnbiasednessCheck {
        let mut rng = StdRng::seed_from_u64(Self::seed(&self.target));
        let mut values = Vec::with_capacity(self.samples);
        for _ in 0..self.samples {
            values.push(sample_noise(
                self.mechanism.clone(),
                &self.parameters,
                &mut rng,
            ));
        }
        let mean = values.iter().sum::<f64>() / self.samples as f64;
        let variance =
            values.iter().map(|v| (v - mean).powi(2)).sum::<f64>() / (self.samples as f64 - 1.0);
        let expected_var = self.parameters.variance(self.mechanism.clone());
        let stderr = (variance / self.samples as f64).sqrt();
        let tolerance = 3.0 * stderr;
        UnbiasednessCheck {
            target: self.target.clone(),
            observed_mean: mean,
            observed_variance: variance,
            expected_variance: expected_var,
            tolerance,
            unbiased: mean.abs() <= tolerance,
        }
    }

    fn seed(target: &str) -> u64 {
        let mut hash: u64 = 0xcbf29ce484222325;
        for byte in target.as_bytes() {
            hash ^= *byte as u64;
            hash = hash.wrapping_mul(0x100000001b3);
        }
        hash
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct UnbiasednessCheck {
    pub target: String,
    pub observed_mean: f64,
    pub observed_variance: f64,
    pub expected_variance: f64,
    pub tolerance: f64,
    pub unbiased: bool,
}
