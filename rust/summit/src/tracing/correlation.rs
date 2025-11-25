use std::collections::HashMap;
use uuid::Uuid;

pub type TraceId = Uuid;
pub type SpanId = Uuid;

#[derive(Debug, Clone)]
pub struct CorrelationContext {
    pub trace_id: TraceId,
    pub span_id: SpanId,
    pub baggage: HashMap<String, String>,
}

impl CorrelationContext {
    pub fn new() -> Self {
        Self {
            trace_id: Uuid::new_v4(),
            span_id: Uuid::new_v4(),
            baggage: HashMap::new(),
        }
    }
}
