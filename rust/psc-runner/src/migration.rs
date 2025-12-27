#[derive(Debug, Clone)]
pub struct MigrationError {
    pub message: String,
}

#[async_trait::async_trait]
pub trait MigrationStrategy {
    async fn pre_migration_checks(&self) -> Result<(), MigrationError>;
    async fn execute_migration(&self) -> Result<(), MigrationError>;
    async fn post_migration_validation(&self) -> Result<(), MigrationError>;
    async fn rollback_procedure(&self) -> Result<(), MigrationError>;
}
