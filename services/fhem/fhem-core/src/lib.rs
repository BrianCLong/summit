pub mod engine;
pub mod error;
pub mod keys;
pub mod metrics;
pub mod operations;

pub use error::FhemError;
pub use keys::{generate_keys, KeyConfig, KeyMaterial, DEFAULT_ENCRYPTION_SEED, DEFAULT_KEY_SEED};
pub use metrics::CiphertextStats;
pub use operations::{
    ciphertext_to_base64, ciphertexts_from_base64, decrypt_ciphertext, decrypt_ciphertext_base64,
    encrypt_batch, encrypt_batch_base64, homomorphic_count, homomorphic_sum, EncryptedBatch,
};
