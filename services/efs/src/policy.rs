use serde::{Deserialize, Serialize};
use serde_with::{base64::Base64, serde_as};
use sha2::{Digest, Sha256};

#[serde_as]
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AttestationPolicy {
    pub version: u32,
    pub statement: String,
    #[serde(default)]
    #[serde_as(as = "Option<Base64>")]
    pub extra_context: Option<Vec<u8>>,
}

impl AttestationPolicy {
    pub fn hash(&self) -> [u8; 32] {
        let mut hasher = Sha256::new();
        hasher.update(self.version.to_be_bytes());
        hasher.update(self.statement.as_bytes());
        if let Some(ctx) = &self.extra_context {
            hasher.update(ctx);
        }
        hasher.finalize().into()
    }
}
