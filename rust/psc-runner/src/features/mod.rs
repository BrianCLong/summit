pub struct FeatureFlags {
    pub dynamic_config: bool,
    pub distributed_tracing: bool,
    pub multi_serialization: bool,
    pub pluggable_storage: bool,
    pub advanced_health: bool,
    pub intelligent_lb: bool,
    pub k8s_operator: bool,
    pub performance_suite: bool,
}

pub enum Environment {
    Development,
    Staging,
    Production,
}

impl FeatureFlags {
    pub fn all_enabled() -> Self {
        Self {
            dynamic_config: true,
            distributed_tracing: true,
            multi_serialization: true,
            pluggable_storage: true,
            advanced_health: true,
            intelligent_lb: true,
            k8s_operator: true,
            performance_suite: true,
        }
    }

    pub fn staging_rollout() -> Self {
         Self {
            dynamic_config: true,
            distributed_tracing: true,
            multi_serialization: true,
            pluggable_storage: true,
            advanced_health: true, // Maybe check if this should be true or false
            intelligent_lb: false,
            k8s_operator: false,
            performance_suite: true,
        }
    }

    pub fn production_rollout() -> Self {
         Self {
            dynamic_config: true, // Careful rollout
            distributed_tracing: true,
            multi_serialization: false,
            pluggable_storage: false,
            advanced_health: false,
            intelligent_lb: false,
            k8s_operator: false,
            performance_suite: true,
        }
    }

    pub fn for_environment(env: &Environment) -> Self {
        match env {
            Environment::Development => Self::all_enabled(),
            Environment::Staging => Self::staging_rollout(),
            Environment::Production => Self::production_rollout(),
        }
    }
}
