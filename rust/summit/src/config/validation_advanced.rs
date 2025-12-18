use std::collections::{HashMap, BTreeMap};
use serde_json::Value;
use thiserror::Error;
use jsonschema::JSONSchema;

#[derive(Debug, Error)]
pub enum ConfigValidationError {
    #[error("Schema violation for key {key}: {error}")]
    SchemaViolation {
        key: String,
        error: String,
    },
    #[error("Validation error: {0}")]
    Custom(String),
}

pub trait ConfigValidator: Send + Sync {
    fn validate(&self, config: &Value) -> Result<(), ConfigValidationError>;
}

pub struct SchemaWrapper {
    inner: JSONSchema,
}

impl SchemaWrapper {
    pub fn new(schema_json: &Value) -> Result<Self, String> {
        JSONSchema::compile(schema_json)
            .map(|s| Self { inner: s })
            .map_err(|e| e.to_string())
    }

    pub fn validate(&self, value: &Value) -> Result<(), String> {
        if let Err(errors) = self.inner.validate(value) {
            let msg = errors.map(|e| e.to_string()).collect::<Vec<_>>().join(", ");
            Err(msg)
        } else {
            Ok(())
        }
    }
}

// 1. Strong configuration validation with JSON Schema
pub struct JsonSchemaValidator {
    pub schemas: HashMap<String, SchemaWrapper>,
    pub custom_validators: Vec<Box<dyn ConfigValidator>>,
}

impl JsonSchemaValidator {
    pub fn new() -> Self {
        Self {
            schemas: HashMap::new(),
            custom_validators: Vec::new(),
        }
    }

    pub fn add_schema(&mut self, key: String, schema_json: Value) -> Result<(), String> {
        let schema = SchemaWrapper::new(&schema_json)?;
        self.schemas.insert(key, schema);
        Ok(())
    }

    pub fn validate_config(&self, config: &serde_json::Value) -> Result<(), ConfigValidationError> {
        // Validate each known section
        for (key, schema) in &self.schemas {
            if let Some(value) = config.get(key) {
                schema.validate(value)
                    .map_err(|e| ConfigValidationError::SchemaViolation {
                        key: key.clone(),
                        error: e,
                    })?;
            }
        }

        // Custom validators
        for validator in &self.custom_validators {
            validator.validate(config)?;
        }

        Ok(())
    }
}

pub type Version = u32;

#[derive(Debug, Error)]
pub enum MigrationError {
    #[error("Migration failed: {0}")]
    Failed(String),
}

#[async_trait::async_trait]
pub trait ConfigMigration: Send + Sync {
    async fn migrate(&self, config: Value) -> Result<Value, MigrationError>;
}

// 2. Configuration schema evolution with automatic migration
pub struct ConfigMigrationEngine {
    pub migrations: BTreeMap<Version, Box<dyn ConfigMigration>>,
}

impl ConfigMigrationEngine {
    pub fn new() -> Self {
        Self { migrations: BTreeMap::new() }
    }

    pub fn add_migration(&mut self, target_version: Version, migration: Box<dyn ConfigMigration>) {
        self.migrations.insert(target_version, migration);
    }

    pub async fn migrate_config(
        &self,
        config: serde_json::Value,
        from_version: Version,
        to_version: Version
    ) -> Result<serde_json::Value, MigrationError> {
        let mut current_config = config;
        let mut _current_version = from_version; // Prefix with _ to silence warning or use it logic

        for (target_version, migration) in self.migrations.range((from_version + 1)..=to_version) {
            // Apply migration to reach target_version
            current_config = migration.migrate(current_config).await?;
            _current_version = *target_version;
        }

        Ok(current_config)
    }
}

pub struct AdvancedConfigSystem {
    pub schema_validator: JsonSchemaValidator,
    pub version_migration: ConfigMigrationEngine,
}
