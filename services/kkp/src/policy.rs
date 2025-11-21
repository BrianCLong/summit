use regorus::{Engine, Value};
use serde_json::Value as JsonValue;

use crate::error::ProxyError;

const DEFAULT_RULE: &str = "data.kkp.authz.allow";

pub struct PolicyEngine {
    policy: String,
    rule: String,
}

impl PolicyEngine {
    pub fn new(policy_source: impl Into<String>, rule: Option<String>) -> Self {
        Self {
            policy: policy_source.into(),
            rule: rule.unwrap_or_else(|| DEFAULT_RULE.to_string()),
        }
    }

    pub fn evaluate(&self, input: &JsonValue) -> Result<(), ProxyError> {
        let mut engine = Engine::new();
        engine
            .add_policy("kkp.rego".to_string(), self.policy.clone())
            .map_err(|err| ProxyError::PolicyDenied(format!("policy load failed: {err}")))?;
        let input_str = serde_json::to_string(input).map_err(|err| {
            ProxyError::PolicyDenied(format!("failed to encode policy input: {err}"))
        })?;
        engine
            .set_input_json(&input_str)
            .map_err(|err| ProxyError::PolicyDenied(format!("policy input invalid: {err}")))?;
        let value = engine
            .eval_rule(self.rule.clone())
            .map_err(|err| ProxyError::PolicyDenied(format!("policy evaluation failed: {err}")))?;
        match value {
            Value::Bool(true) => Ok(()),
            Value::Bool(false) | Value::Null => {
                Err(ProxyError::PolicyDenied("policy returned deny".into()))
            }
            other => {
                if other.is_truthy() {
                    Ok(())
                } else {
                    Err(ProxyError::PolicyDenied("policy returned deny".into()))
                }
            }
        }
    }

    pub fn policy_document(&self) -> &str {
        &self.policy
    }
}

trait Truthy {
    fn is_truthy(&self) -> bool;
}

impl Truthy for Value {
    fn is_truthy(&self) -> bool {
        match self {
            Value::Bool(value) => *value,
            Value::Null => false,
            Value::String(s) => !s.is_empty(),
            Value::Array(arr) => !arr.is_empty(),
            Value::Set(set) => !set.is_empty(),
            Value::Object(obj) => !obj.is_empty(),
            _ => true,
        }
    }
}
