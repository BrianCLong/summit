use std::collections::VecDeque;

use base64::Engine;
use ed25519_dalek::{Keypair, PublicKey, Signature, Signer, Verifier, SECRET_KEY_LENGTH};
use rand::rngs::OsRng;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use time::{Duration, OffsetDateTime};

use crate::error::ProxyError;

const DEFAULT_MAX_ACTIVE: usize = 5;

pub struct SigningKey {
    pub id: String,
    pub keypair: Keypair,
    pub created_at: OffsetDateTime,
    pub expires_at: OffsetDateTime,
}

impl SigningKey {
    fn new(ttl: Duration) -> Self {
        let mut rng = OsRng;
        let keypair = Keypair::generate(&mut rng);
        let now = OffsetDateTime::now_utc();
        let expires_at = now + ttl;
        let mut hasher = Sha256::new();
        hasher.update(keypair.public.to_bytes());
        let id = base64::engine::general_purpose::URL_SAFE_NO_PAD
            .encode(hasher.finalize())
            .chars()
            .take(16)
            .collect();
        Self {
            id,
            keypair,
            created_at: now,
            expires_at,
        }
    }

    pub fn public_key(&self) -> PublicKey {
        self.keypair.public
    }

    pub fn sign(&self, payload: &[u8]) -> Signature {
        self.keypair.sign(payload)
    }

    pub fn verify(&self, payload: &[u8], signature: &Signature) -> Result<(), ProxyError> {
        self.keypair
            .public
            .verify(payload, signature)
            .map_err(|err| {
                ProxyError::InvalidToken(format!("signature verification failed: {err}"))
            })
    }
}

impl Clone for SigningKey {
    fn clone(&self) -> Self {
        let bytes = self.keypair.to_bytes();
        let keypair = Keypair::from_bytes(&bytes).expect("valid keypair bytes");
        Self {
            id: self.id.clone(),
            keypair,
            created_at: self.created_at,
            expires_at: self.expires_at,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JwkPublicKey {
    pub kty: String,
    pub crv: String,
    pub kid: String,
    pub x: String,
    pub alg: String,
}

impl JwkPublicKey {
    fn from_key(key: &SigningKey) -> Self {
        Self {
            kty: "OKP".to_string(),
            crv: "Ed25519".to_string(),
            alg: "EdDSA".to_string(),
            kid: key.id.clone(),
            x: base64::engine::general_purpose::URL_SAFE_NO_PAD
                .encode(key.keypair.public.to_bytes()),
        }
    }
}

pub struct SigningKeyRing {
    keys: VecDeque<SigningKey>,
    max_active: usize,
    key_ttl: Duration,
}

impl SigningKeyRing {
    pub fn new(max_active: Option<usize>, key_ttl: Duration) -> Self {
        let mut ring = Self {
            keys: VecDeque::new(),
            max_active: max_active.unwrap_or(DEFAULT_MAX_ACTIVE),
            key_ttl,
        };
        ring.rotate();
        ring
    }

    pub fn current(&self) -> &SigningKey {
        self.keys
            .front()
            .expect("at least one signing key must be present")
    }

    pub fn current_mut(&mut self) -> &mut SigningKey {
        self.keys
            .front_mut()
            .expect("at least one signing key must be present")
    }

    pub fn rotate(&mut self) {
        let key = SigningKey::new(self.key_ttl);
        self.keys.push_front(key);
        while self.keys.len() > self.max_active {
            self.keys.pop_back();
        }
    }

    pub fn find(&self, kid: &str) -> Option<&SigningKey> {
        self.keys.iter().find(|key| key.id == kid)
    }

    pub fn all_public_keys(&self) -> Vec<JwkPublicKey> {
        self.keys.iter().map(JwkPublicKey::from_key).collect()
    }

    pub fn verify(&self, kid: &str, payload: &[u8], signature: &[u8]) -> Result<(), ProxyError> {
        let key = self
            .find(kid)
            .ok_or_else(|| ProxyError::InvalidToken(format!("unknown key id {kid}")))?;
        let signature = Signature::from_bytes(signature)
            .map_err(|err| ProxyError::InvalidToken(format!("signature format invalid: {err}")))?;
        key.verify(payload, &signature)
    }

    pub fn sign_current(&self, payload: &[u8]) -> (String, Vec<u8>) {
        let current = self.current();
        let signature = current.sign(payload);
        (current.id.clone(), signature.to_bytes().to_vec())
    }

    pub fn prune_expired(&mut self) {
        let now = OffsetDateTime::now_utc();
        self.keys.retain(|key| key.expires_at > now);
        if self.keys.is_empty() {
            self.rotate();
        }
    }

    pub fn secret_material(&self) -> Vec<u8> {
        self.keys
            .front()
            .map(|k| k.keypair.secret.to_bytes().to_vec())
            .unwrap_or_else(|| vec![0u8; SECRET_KEY_LENGTH])
    }
}
