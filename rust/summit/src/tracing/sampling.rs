pub trait Sampler: Send + Sync {
    fn should_sample(&self, trace_id: &super::correlation::TraceId) -> bool;
}

pub enum SamplingStrategy {
    AlwaysOn,
    Probabilistic(f64),
    RateLimiting(u32), // traces per second
    Custom(Box<dyn Sampler>),
}

impl SamplingStrategy {
    pub fn should_sample(&self, trace_id: &super::correlation::TraceId) -> bool {
        match self {
            SamplingStrategy::AlwaysOn => true,
            SamplingStrategy::Probabilistic(rate) => {
                // Mock implementation
                let val = 0.5; // should be random
                val < *rate
            }
            SamplingStrategy::RateLimiting(_limit) => {
                // Mock implementation
                true
            }
            SamplingStrategy::Custom(sampler) => sampler.should_sample(trace_id),
        }
    }
}
