use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;

use crate::error::ProxyError;

pub fn encode(data: &[u8]) -> String {
    URL_SAFE_NO_PAD.encode(data)
}

pub fn decode(data: &str) -> Result<Vec<u8>, ProxyError> {
    URL_SAFE_NO_PAD
        .decode(data)
        .map_err(|err| ProxyError::Envelope(format!("base64 decode failed: {err}")))
}
