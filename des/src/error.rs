use thiserror::Error;

#[derive(Debug, Error)]
pub enum DesError {
    #[error("embedding with id '{id}' and version '{version}' conflicts with existing record")]
    ConflictingEmbedding { id: String, version: String },

    #[error("embedding with id '{id}' missing version '{version}'")]
    VersionNotFound { id: String, version: String },

    #[error("dimension mismatch for id '{id}': expected {expected}, got {actual}")]
    DimensionMismatch {
        id: String,
        expected: usize,
        actual: usize,
    },

    #[error("no overlapping embeddings between versions to diff")]
    EmptyDiff,

    #[error(transparent)]
    Serialization(#[from] serde_json::Error),
}
