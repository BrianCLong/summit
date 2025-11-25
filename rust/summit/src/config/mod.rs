pub mod validation;
pub mod migration;

pub use validation::{ConfigValidator, AppConfig, ConfigError, ValidationRule};
pub use migration::ConfigMigration;

use serde::de::DeserializeOwned;

pub trait Configurable: Sized {
    type Config: DeserializeOwned + schemars::JsonSchema; // simplified
    fn from_config(config: Self::Config) -> Result<Self, anyhow::Error>;
    fn update_config(&mut self, config: Self::Config) -> Result<(), anyhow::Error>;
}
