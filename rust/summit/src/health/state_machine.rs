use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum HealthState {
    Healthy,
    Degraded,
    Unhealthy,
    Recovering,
}

pub struct StateTransition {
    pub from: HealthState,
    pub to: HealthState,
    pub trigger: String,
}

pub struct HealthStateMachine {
    pub current_state: HealthState,
    pub transitions: HashMap<HealthState, Vec<StateTransition>>,
}
