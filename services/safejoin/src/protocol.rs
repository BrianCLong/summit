use std::collections::HashMap;

use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use hmac::{Hmac, Mac};
use rand::{rngs::StdRng, Rng, SeedableRng};
use sha2::Sha256;
use x25519_dalek::{PublicKey, StaticSecret};

use crate::{BloomFilterBits, SimpleBloom};

pub type SharedSecret = [u8; 32];

type HmacSha256 = Hmac<Sha256>;

#[derive(Debug, thiserror::Error)]
pub enum DeriveError {
    #[error("peer public key has incorrect length")]
    InvalidPeerKey,
}

pub fn generate_keypair() -> (StaticSecret, PublicKey) {
    let mut rng = rand::thread_rng();
    let secret = StaticSecret::random_from_rng(&mut rng);
    let public = PublicKey::from(&secret);
    (secret, public)
}

pub fn derive_shared_secret(
    secret: &StaticSecret,
    peer_public: &str,
) -> Result<SharedSecret, DeriveError> {
    let peer_bytes = BASE64
        .decode(peer_public)
        .map_err(|_| DeriveError::InvalidPeerKey)?;
    let peer_public = PublicKey::from(
        <[u8; 32]>::try_from(peer_bytes.as_slice()).map_err(|_| DeriveError::InvalidPeerKey)?,
    );
    Ok(secret.diffie_hellman(&peer_public).to_bytes())
}

pub fn hash_tokens_with_secret(keys: &[String], secret: &SharedSecret) -> Vec<String> {
    keys.iter()
        .map(|key| {
            let mut mac = HmacSha256::new_from_slice(secret).expect("secret length");
            mac.update(key.as_bytes());
            BASE64.encode(mac.finalize().into_bytes())
        })
        .collect()
}

pub fn bloom_from_tokens(tokens: &[String], m: usize, k: u8) -> SimpleBloom {
    let mut bloom = SimpleBloom::new(m, k);
    for token in tokens {
        if let Ok(bytes) = BASE64.decode(token) {
            bloom.insert(&bytes);
        }
    }
    bloom
}

#[derive(Clone, Debug)]
pub struct AggregateInput {
    pub hashed_token: String,
    pub attribute: f64,
}

#[derive(Clone, Debug)]
pub struct AggregateNoiseConfig {
    pub epsilon: f64,
    pub rng_seed: Option<u64>,
}

#[derive(Clone, Debug, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct NoisyAggregate {
    pub noisy_sum: f64,
    pub noisy_count: f64,
}

pub fn dp_noisy_aggregates(
    inputs: &[AggregateInput],
    secret: &SharedSecret,
    config: AggregateNoiseConfig,
) -> (Vec<String>, HashMap<String, NoisyAggregate>) {
    let tokens: Vec<String> = inputs.iter().map(|r| r.hashed_token.clone()).collect();
    let mut grouped: HashMap<String, Vec<f64>> = HashMap::new();
    for entry in inputs {
        grouped
            .entry(entry.hashed_token.clone())
            .or_default()
            .push(entry.attribute);
    }
    let scale = if config.epsilon <= f64::EPSILON {
        1.0
    } else {
        1.0 / config.epsilon
    };
    let mut seed_material = [0u8; 32];
    seed_material.copy_from_slice(secret);
    let derived_seed = u64::from_le_bytes(seed_material[..8].try_into().expect("seed slice"));
    let mut rng: StdRng = match config.rng_seed {
        Some(seed) => StdRng::seed_from_u64(seed),
        None => StdRng::seed_from_u64(derived_seed ^ (tokens.len() as u64)),
    };
    let mut aggregates = HashMap::new();
    for (token, values) in grouped.into_iter() {
        let sum: f64 = values.iter().sum();
        let count = values.len() as f64;
        let noisy_sum = sum + sample_laplace(&mut rng, scale);
        let noisy_count = count + sample_laplace(&mut rng, scale);
        aggregates.insert(
            token,
            NoisyAggregate {
                noisy_sum,
                noisy_count,
            },
        );
    }
    // ensure deterministic order of tokens to keep compatibility between clients
    let mut unique_tokens = tokens;
    unique_tokens.sort();
    unique_tokens.dedup();
    (unique_tokens, aggregates)
}

fn sample_laplace<R: Rng + ?Sized>(rng: &mut R, scale: f64) -> f64 {
    let uniform: f64 = rng.gen_range(-0.5..0.5);
    let sign = if uniform >= 0.0 { 1.0 } else { -1.0 };
    let magnitude = (1.0 - 2.0 * uniform.abs()).max(1e-12).ln();
    -scale * sign * magnitude
}

pub fn encode_public_key(public: &PublicKey) -> String {
    BASE64.encode(public.as_bytes())
}

pub fn encode_shared_tokens(
    keys: &[String],
    secret: &SharedSecret,
) -> (Vec<String>, BloomFilterBits) {
    let tokens = hash_tokens_with_secret(keys, secret);
    let bloom = bloom_from_tokens(&tokens, 2048, 3);
    (tokens, bloom.to_payload())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hash_is_deterministic() {
        let keys = vec!["alpha".to_string(), "beta".to_string()];
        let secret = [7u8; 32];
        let tokens_a = hash_tokens_with_secret(&keys, &secret);
        let tokens_b = hash_tokens_with_secret(&keys, &secret);
        assert_eq!(tokens_a, tokens_b);
    }

    #[test]
    fn bloom_generation() {
        let secret = [3u8; 32];
        let keys = vec!["one".to_string(), "two".to_string(), "three".to_string()];
        let tokens = hash_tokens_with_secret(&keys, &secret);
        let bloom = bloom_from_tokens(&tokens, 512, 4);
        assert!(bloom.estimated_cardinality() > 0.0);
    }

    #[test]
    fn dp_noise_seeded() {
        let inputs = vec![AggregateInput {
            hashed_token: "token".into(),
            attribute: 5.0,
        }];
        let secret = [1u8; 32];
        let config = AggregateNoiseConfig {
            epsilon: 0.8,
            rng_seed: Some(42),
        };
        let (_, aggregates) = dp_noisy_aggregates(&inputs, &secret, config.clone());
        let (_, aggregates_two) = dp_noisy_aggregates(&inputs, &secret, config);
        assert_eq!(aggregates, aggregates_two);
    }
}
