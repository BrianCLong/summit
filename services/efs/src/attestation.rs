use chrono::{DateTime, Utc};
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use serde_with::{base64::Base64, serde_as};
use sha2::{Digest, Sha256};
use subtle::ConstantTimeEq;

use crate::crypto::SealedFeatureBlob;
use crate::error::{EfsError, Result};

#[serde_as]
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AttestationQuote {
    pub tenant_id: String,
    pub feature_key: String,
    #[serde_as(as = "Base64")]
    pub nonce: Vec<u8>,
    #[serde_as(as = "Base64")]
    pub measurement: Vec<u8>,
    #[serde_as(as = "Base64")]
    pub policy_hash: Vec<u8>,
    pub timestamp: DateTime<Utc>,
    #[serde_as(as = "Base64")]
    pub signature: Vec<u8>,
}

#[serde_as]
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AttestationReport {
    pub quote: AttestationQuote,
    #[serde_as(as = "Base64")]
    pub policy_hash: Vec<u8>,
}

type HmacSha256 = Hmac<Sha256>;

impl AttestationQuote {
    pub fn verify(&self, attestation_key: &[u8], sealed_blob: &SealedFeatureBlob) -> Result<()> {
        let expected_measurement = measurement(&self.tenant_id, &self.feature_key, sealed_blob);
        if expected_measurement != self.measurement {
            return Err(EfsError::Attestation("measurement mismatch".into()));
        }
        let expected_signature = sign_quote(
            attestation_key,
            &self.tenant_id,
            &self.feature_key,
            &self.nonce,
            &self.policy_hash,
            &expected_measurement,
            self.timestamp,
        )?;
        if expected_signature.as_slice().ct_eq(&self.signature).into() {
            Ok(())
        } else {
            Err(EfsError::Attestation("signature mismatch".into()))
        }
    }
}

#[derive(Clone)]
pub struct MockEnclave {
    attestation_key: [u8; 32],
}

impl MockEnclave {
    pub fn new(attestation_key: [u8; 32]) -> Self {
        Self { attestation_key }
    }

    pub fn attest(
        &self,
        tenant_id: &str,
        feature_key: &str,
        nonce: &[u8],
        policy_hash: &[u8],
        sealed_blob: &SealedFeatureBlob,
    ) -> Result<AttestationReport> {
        let measurement = measurement(tenant_id, feature_key, sealed_blob);
        let timestamp = Utc::now();
        let signature = sign_quote(
            &self.attestation_key,
            tenant_id,
            feature_key,
            nonce,
            policy_hash,
            &measurement,
            timestamp,
        )?;
        let quote = AttestationQuote {
            tenant_id: tenant_id.to_string(),
            feature_key: feature_key.to_string(),
            nonce: nonce.to_vec(),
            measurement: measurement.clone(),
            policy_hash: policy_hash.to_vec(),
            timestamp,
            signature,
        };
        Ok(AttestationReport {
            policy_hash: policy_hash.to_vec(),
            quote,
        })
    }

    pub fn attestation_key(&self) -> [u8; 32] {
        self.attestation_key
    }
}

pub fn measurement(tenant_id: &str, feature_key: &str, sealed_blob: &SealedFeatureBlob) -> Vec<u8> {
    let mut hasher = Sha256::new();
    hasher.update(tenant_id.as_bytes());
    hasher.update(feature_key.as_bytes());
    hasher.update(sealed_blob.measurement_bytes());
    hasher.finalize().to_vec()
}

fn sign_quote(
    key: &[u8],
    tenant_id: &str,
    feature_key: &str,
    nonce: &[u8],
    policy_hash: &[u8],
    measurement: &[u8],
    timestamp: DateTime<Utc>,
) -> Result<Vec<u8>> {
    let mut mac =
        HmacSha256::new_from_slice(key).map_err(|e| EfsError::Attestation(e.to_string()))?;
    mac.update(tenant_id.as_bytes());
    mac.update(feature_key.as_bytes());
    mac.update(nonce);
    mac.update(policy_hash);
    mac.update(measurement);
    let timestamp_str = timestamp.to_rfc3339();
    mac.update(timestamp_str.as_bytes());
    let signature = mac.finalize().into_bytes().to_vec();
    Ok(signature)
}
