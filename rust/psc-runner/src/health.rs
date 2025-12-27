use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Serialize, Deserialize, Validate, Clone, Debug)]
pub struct HealthConfig {
    pub interval_seconds: u64,
}
