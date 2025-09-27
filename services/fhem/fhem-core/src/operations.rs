use crate::engine::reseed_shortint_engine;
use crate::error::FhemError;
use crate::keys::KeyMaterial;
use crate::metrics::CiphertextStats;
use base64::engine::general_purpose::STANDARD as BASE64_ENGINE;
use base64::Engine;
use blake3::Hasher;
use tfhe::core_crypto::commons::math::random::Seed;
use tfhe::prelude::*;
use tfhe::FheUint32;

#[derive(Debug, Clone)]
pub struct EncryptedBatch {
    pub ciphertexts: Vec<Vec<u8>>,
    pub stats: CiphertextStats,
}

fn derive_seed(base: Seed, value: u32, position: u64) -> Seed {
    let mut hasher = Hasher::new();
    hasher.update(&base.0.to_le_bytes());
    hasher.update(&value.to_le_bytes());
    hasher.update(&position.to_le_bytes());
    let hash = hasher.finalize();
    let mut buf = [0u8; 16];
    buf.copy_from_slice(&hash.as_bytes()[..16]);
    Seed(u128::from_le_bytes(buf))
}

fn serialize_ciphertext(ciphertext: &FheUint32) -> Result<Vec<u8>, FhemError> {
    Ok(bincode::serialize(ciphertext)?)
}

pub fn deserialize_ciphertext(bytes: &[u8]) -> Result<FheUint32, FhemError> {
    Ok(bincode::deserialize(bytes)?)
}

pub fn encrypt_batch(values: &[u32], keys: &KeyMaterial) -> Result<EncryptedBatch, FhemError> {
    if values.is_empty() {
        return Ok(EncryptedBatch {
            ciphertexts: Vec::new(),
            stats: CiphertextStats::default(),
        });
    }

    let mut ciphertexts = Vec::with_capacity(values.len());
    let mut total_bytes = 0usize;

    for (idx, value) in values.iter().copied().enumerate() {
        let seed = derive_seed(keys.encryption_seed(), value, idx as u64);
        reseed_shortint_engine(seed);
        let ciphertext =
            FheUint32::try_encrypt(value, keys.client_key()).map_err(FhemError::encryption)?;
        let bytes = serialize_ciphertext(&ciphertext)?;
        total_bytes += bytes.len();
        ciphertexts.push(bytes);
    }

    Ok(EncryptedBatch {
        ciphertexts,
        stats: CiphertextStats::new(values.len(), total_bytes),
    })
}

pub fn encrypt_batch_base64(
    values: &[u32],
    keys: &KeyMaterial,
) -> Result<(Vec<String>, CiphertextStats), FhemError> {
    let batch = encrypt_batch(values, keys)?;
    let encoded = batch
        .ciphertexts
        .iter()
        .map(|bytes| BASE64_ENGINE.encode(bytes))
        .collect();
    Ok((encoded, batch.stats))
}

pub fn decrypt_ciphertext_base64(encoded: &str, keys: &KeyMaterial) -> Result<u32, FhemError> {
    let bytes = BASE64_ENGINE.decode(encoded)?;
    let ciphertext: FheUint32 = deserialize_ciphertext(&bytes)?;
    Ok(ciphertext.decrypt(keys.client_key()))
}

pub fn homomorphic_sum(ciphertexts: &[Vec<u8>], keys: &KeyMaterial) -> Result<Vec<u8>, FhemError> {
    keys.install_server_key();
    if ciphertexts.is_empty() {
        let zero = FheUint32::encrypt_trivial(0u32);
        return serialize_ciphertext(&zero);
    }

    let mut decoded = Vec::with_capacity(ciphertexts.len());
    for bytes in ciphertexts {
        decoded.push(deserialize_ciphertext(bytes)?);
    }
    let refs: Vec<&FheUint32> = decoded.iter().collect();
    let result = FheUint32::sum(refs);
    serialize_ciphertext(&result)
}

pub fn homomorphic_count(
    ciphertexts: &[Vec<u8>],
    keys: &KeyMaterial,
) -> Result<Vec<u8>, FhemError> {
    keys.install_server_key();
    if ciphertexts.is_empty() {
        let zero = FheUint32::encrypt_trivial(0u32);
        return serialize_ciphertext(&zero);
    }

    let mut ones: Vec<FheUint32> = Vec::with_capacity(ciphertexts.len());
    for _ in ciphertexts {
        ones.push(FheUint32::encrypt_trivial(1u32));
    }
    let refs: Vec<&FheUint32> = ones.iter().collect();
    let result = FheUint32::sum(refs);
    serialize_ciphertext(&result)
}

pub fn ciphertexts_from_base64(encoded: &[String]) -> Result<Vec<Vec<u8>>, FhemError> {
    encoded
        .iter()
        .map(|item| Ok(BASE64_ENGINE.decode(item)?))
        .collect()
}

pub fn ciphertext_to_base64(bytes: &[u8]) -> String {
    BASE64_ENGINE.encode(bytes)
}

pub fn decrypt_ciphertext(bytes: &[u8], keys: &KeyMaterial) -> Result<u32, FhemError> {
    let ciphertext: FheUint32 = deserialize_ciphertext(bytes)?;
    Ok(ciphertext.decrypt(keys.client_key()))
}
