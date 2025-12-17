use thiserror::Error;

#[derive(Debug, Error)]
pub enum PgvrError {
    #[error("unknown tenant: {0}")]
    UnknownTenant(String),
    #[error("search failed: {0}")]
    SearchFailure(String),
    #[error("fixture error: {0}")]
    Fixture(String),
}

pub type PgvrResult<T> = Result<T, PgvrError>;
