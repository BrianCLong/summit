use thiserror::Error;

#[derive(Debug, Error)]
pub enum AqlError {
    #[error("unexpected end of input while parsing")]
    UnexpectedEof,
    #[error("expected keyword {0}")]
    ExpectedKeyword(String),
    #[error("expected identifier")]
    ExpectedIdentifier,
    #[error("expected operator {0}")]
    ExpectedOperator(String),
    #[error("expected string literal")]
    ExpectedString,
    #[error("invalid timestamp: {0}")]
    InvalidTimestamp(String),
    #[error("unknown connector '{0}'")]
    UnknownConnector(String),
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("json error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("execution error: {0}")]
    Execution(String),
    #[error("verification failed: {0}")]
    Verification(String),
}

pub type Result<T> = std::result::Result<T, AqlError>;
