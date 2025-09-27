use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fmt;

use crate::attestation::AttestationDomain;
use crate::functional_encryption::InputBinding;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PolicySpec {
    pub policy_id: String,
    pub allowed_fields: Vec<String>,
    pub analytic: ToyAnalytic,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ToyAnalytic {
    Sum,
    Mean,
}

impl fmt::Display for ToyAnalytic {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ToyAnalytic::Sum => write!(f, "sum"),
            ToyAnalytic::Mean => write!(f, "mean"),
        }
    }
}

#[derive(Debug, Clone)]
pub struct SigningKey {
    pub key_id: String,
    secret: Vec<u8>,
}

impl SigningKey {
    pub fn new<S: Into<String>>(key_id: S, secret: Vec<u8>) -> Self {
        Self {
            key_id: key_id.into(),
            secret,
        }
    }

    pub fn to_public_hint(&self) -> PolicyPublicHint {
        PolicyPublicHint {
            key_id: self.key_id.clone(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PolicyPublicHint {
    pub key_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct CompiledPolicy {
    pub policy_id: String,
    pub allowed_fields: Vec<String>,
    pub analytic: ToyAnalytic,
    pub signing_hint: PolicyPublicHint,
    pub signature: String,
}

impl CompiledPolicy {
    pub fn digest(&self) -> String {
        let mut allowed = self.allowed_fields.clone();
        allowed.sort();
        let preimage = format!(
            "{}:{}:{}:{}",
            self.policy_id,
            allowed.join(","),
            self.analytic,
            self.signing_hint.key_id
        );
        let mut hasher = Sha256::new();
        hasher.update(preimage.as_bytes());
        hex::encode(hasher.finalize())
    }

    pub fn attestation_domain(&self) -> AttestationDomain {
        AttestationDomain {
            policy_digest: self.digest(),
            analytic: self.analytic.clone(),
        }
    }

    pub fn bind_input(&self, binding: &InputBinding) -> bool {
        binding.policy_signature == self.signature
    }
}

#[derive(Debug, thiserror::Error)]
pub enum PolicyError {
    #[error("allowed fields must be unique")]
    DuplicateField,
}

type PolicyMac = Hmac<Sha256>;

pub struct PolicyCompiler;

impl PolicyCompiler {
    pub fn compile(
        spec: &PolicySpec,
        signing_key: &SigningKey,
    ) -> Result<CompiledPolicy, PolicyError> {
        let mut dedup = spec.allowed_fields.clone();
        dedup.sort();
        dedup.dedup();
        if dedup.len() != spec.allowed_fields.len() {
            return Err(PolicyError::DuplicateField);
        }

        let mut mac =
            PolicyMac::new_from_slice(&signing_key.secret).expect("HMAC can take key of any size");
        mac.update(spec.policy_id.as_bytes());
        mac.update(b":");
        for field in dedup.iter() {
            mac.update(field.as_bytes());
            mac.update(b", ");
        }
        mac.update(b":");
        mac.update(spec.analytic.to_string().as_bytes());

        let signature = hex::encode(mac.finalize().into_bytes());

        Ok(CompiledPolicy {
            policy_id: spec.policy_id.clone(),
            allowed_fields: spec.allowed_fields.clone(),
            analytic: spec.analytic.clone(),
            signing_hint: signing_key.to_public_hint(),
            signature,
        })
    }
}
