use serde::{Deserialize, Serialize};
use validator::Validate;
use http::HeaderMap;

#[derive(Serialize, Deserialize, Validate, Clone, Debug)]
pub struct TracingConfig {
    pub enabled: bool,
    pub sampling_rate: f64,
}

#[derive(Debug, Clone)]
pub struct CorrelationContext {
    pub trace_id: String,
    pub span_id: String,
}

pub trait TraceContextInjector {
    fn inject_trace_context(&self, headers: &mut HeaderMap);
    fn extract_trace_context(headers: &HeaderMap) -> Option<CorrelationContext>;
}
