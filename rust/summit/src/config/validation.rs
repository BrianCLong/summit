use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct AppConfig {
    pub version: String,
    // Add other fields as needed
}

#[derive(Debug, Clone)]
pub struct ValidationRule {
    pub name: String,
    pub validate: fn(&AppConfig) -> Result<(), String>,
}

#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("Validation failed: {0}")]
    Validation(String),
    #[error("Migration failed: {0}")]
    Migration(String),
}

pub struct ConfigValidator {
    pub schema: schemars::schema::RootSchema,
    pub rules: Vec<ValidationRule>,
}

impl ConfigValidator {
    pub fn new(rules: Vec<ValidationRule>) -> Self {
        let schema = schemars::schema_for!(AppConfig);
        Self { schema, rules }
    }

    pub async fn validate_and_reload(
        &self,
        new_config: &AppConfig,
        _old_config: &AppConfig,
    ) -> Result<(), ConfigError> {
        // Validate semantic rules
        for rule in &self.rules {
            (rule.validate)(new_config).map_err(ConfigError::Validation)?;
        }
        // Check for breaking changes (mock implementation)

        // Execute migration hooks if needed (mock implementation)

        Ok(())
    }
}
