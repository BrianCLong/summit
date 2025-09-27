pub mod batcher;
pub mod config;
pub mod diff;
pub mod error;
pub mod store;

pub use batcher::DeterministicBatcher;
pub use config::{DeterministicQuantization, EmbeddingConfig, NormalizationStep};
pub use diff::{cosine_drift, CosineDrift, DriftEntry};
pub use error::DesError;
pub use store::{EmbeddingRecord, EmbeddingStore, VersionId};
