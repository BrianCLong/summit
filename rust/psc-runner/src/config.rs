use serde::{Deserialize, Serialize};
use validator::Validate;
use crate::tracing::TracingConfig;
use crate::serialization::SerializationConfig;
use crate::storage::StorageConfig;
use crate::health::HealthConfig;
use crate::load_balancing::LoadBalancingConfig;
use crate::operator::OperatorConfig;

#[derive(Serialize, Deserialize, Validate, Clone, Debug)]
pub struct SummitFeaturesConfig {
    pub tracing: TracingConfig,
    pub serialization: SerializationConfig,
    pub storage: StorageConfig,
    pub health: HealthConfig,
    pub load_balancing: LoadBalancingConfig,
    pub operator: OperatorConfig,
}
