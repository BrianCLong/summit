use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Serialize, Deserialize, Validate, Clone, Debug)]
pub struct OperatorConfig {
    pub auto_scaling: bool,
}
