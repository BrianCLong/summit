use std::convert::TryFrom;

use aes_gcm::aead::{Aead, KeyInit, OsRng};
use aes_gcm::{Aes256Gcm, Nonce};
use rand::RngCore;
use sharks::{Share, Sharks};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum CryptoError {
    #[error("invalid share material")]
    InvalidShare,
    #[error("invalid threshold for secret sharing")]
    InvalidThreshold,
    #[error("shamir recovery failed")]
    Recovery,
    #[error("encryption failure")]
    Encrypt,
    #[error("decryption failure")]
    Decrypt,
}

pub fn generate_master_secret() -> [u8; 32] {
    let mut secret = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut secret);
    secret
}

pub fn split_secret(
    secret: &[u8],
    threshold: usize,
    share_count: usize,
) -> Result<Vec<Vec<u8>>, CryptoError> {
    let threshold = u8::try_from(threshold).map_err(|_| CryptoError::InvalidThreshold)?;
    if share_count == 0 || share_count > 256 {
        return Err(CryptoError::InvalidThreshold);
    }
    let sharks = Sharks(threshold);
    let dealer = sharks.dealer(secret);
    Ok(dealer
        .take(share_count)
        .map(|share| Vec::<u8>::from(&share))
        .collect())
}

pub fn recover_secret(shares: &[Vec<u8>], threshold: usize) -> Result<Vec<u8>, CryptoError> {
    let threshold = u8::try_from(threshold).map_err(|_| CryptoError::InvalidThreshold)?;
    let sharks = Sharks(threshold);
    let parsed: Result<Vec<Share>, _> = shares
        .iter()
        .map(|bytes| Share::try_from(bytes.as_slice()))
        .collect();
    let parsed = parsed.map_err(|_| CryptoError::InvalidShare)?;
    sharks
        .recover(parsed.iter())
        .map_err(|_| CryptoError::Recovery)
}

pub fn encrypt(master_key: &[u8], plaintext: &[u8]) -> Result<(Vec<u8>, Vec<u8>), CryptoError> {
    let cipher = Aes256Gcm::new_from_slice(master_key).map_err(|_| CryptoError::Encrypt)?;
    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|_| CryptoError::Encrypt)?;
    Ok((nonce_bytes.to_vec(), ciphertext))
}

pub fn decrypt(master_key: &[u8], nonce: &[u8], ciphertext: &[u8]) -> Result<Vec<u8>, CryptoError> {
    let cipher = Aes256Gcm::new_from_slice(master_key).map_err(|_| CryptoError::Decrypt)?;
    let nonce = Nonce::from_slice(nonce);
    cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| CryptoError::Decrypt)
}
