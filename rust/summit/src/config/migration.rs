use serde_json::Value;

pub struct ConfigMigration {
    pub from_version: semver::Version,
    pub to_version: semver::Version,
    pub migration_script: fn(Value) -> Value,
}

impl ConfigMigration {
    pub fn new(
        from_version: semver::Version,
        to_version: semver::Version,
        migration_script: fn(Value) -> Value,
    ) -> Self {
        Self {
            from_version,
            to_version,
            migration_script,
        }
    }
}
