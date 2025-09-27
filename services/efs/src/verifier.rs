use crate::attestation::{measurement, AttestationQuote};
use crate::crypto::SealedFeatureBlob;
use crate::error::Result;

pub fn verify_quote(
    quote: &AttestationQuote,
    attestation_key: &[u8],
    sealed_blob: &SealedFeatureBlob,
) -> Result<()> {
    quote.verify(attestation_key, sealed_blob)
}

pub fn verify_payload_hash(quote: &AttestationQuote, sealed_blob: &SealedFeatureBlob) -> bool {
    measurement(&quote.tenant_id, &quote.feature_key, sealed_blob) == quote.measurement
}
