pub mod correlation;
pub mod sampling;

pub use correlation::CorrelationContext;
pub use sampling::SamplingStrategy;

// Re-export the macro
pub use summit_macros::traced;

pub trait Traceable {
    fn tracing_span(&self) -> tracing::Span;
    fn trace_context(&self) -> &CorrelationContext;
}
