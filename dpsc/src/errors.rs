use thiserror::Error;

#[derive(Debug, Error)]
pub enum DPSCError {
    #[error("missing DP annotation comment (/*dp:...*/) in query")]
    MissingAnnotation,
    #[error("failed to parse DP annotation: {0}")]
    AnnotationParse(String),
    #[error("unsupported mechanism '{0}'")]
    UnsupportedMechanism(String),
    #[error("epsilon must be > 0, got {0}")]
    InvalidEpsilon(f64),
    #[error("delta must be in (0,1), got {0}")]
    InvalidDelta(f64),
    #[error("sensitivity must be > 0, got {0}")]
    InvalidSensitivity(f64),
    #[error("SQL parsing error: {0}")]
    Sql(String),
    #[error("aggregation '{0}' is not supported; use COUNT, SUM, or AVG")]
    UnsupportedAggregation(String),
    #[error("AVG aggregates require 'lower' and 'upper' bounds in annotation")]
    MissingBounds,
    #[error("serialization error: {0}")]
    Serialization(String),
}

pub type Result<T> = std::result::Result<T, DPSCError>;
