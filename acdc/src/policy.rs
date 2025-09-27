use std::fs;
use std::path::Path;

use anyhow::Result;
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};

use crate::signing;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct PolicyConfig {
    pub jurisdiction_rules: IndexMap<String, Vec<String>>,
    pub retention_limits: IndexMap<String, u32>,
    pub fallback_retention_days: Option<u32>,
    pub guard_preferences: GuardPreferences,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct GuardPreferences {
    pub redact_fields: Vec<String>,
    pub tokenize_fields: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct ConsentConfig {
    pub purposes: IndexMap<String, bool>,
}

#[derive(Debug, Clone)]
pub struct PolicyContext {
    policy: PolicyConfig,
    consent: ConsentConfig,
    fingerprint: String,
}

impl PolicyContext {
    pub fn new(policy: PolicyConfig, consent: ConsentConfig) -> Result<Self> {
        let fingerprint = signing::fingerprint_config(&policy, &consent)?;
        Ok(Self {
            policy,
            consent,
            fingerprint,
        })
    }

    pub fn fingerprint(&self) -> &str {
        &self.fingerprint
    }

    pub fn is_purpose_allowed(&self, purpose: &str) -> bool {
        self.consent.purposes.get(purpose).copied().unwrap_or(true)
    }

    pub fn is_jurisdiction_allowed(&self, from: &str, to: &str) -> bool {
        match self.policy.jurisdiction_rules.get(from) {
            Some(allowed) => allowed.iter().any(|candidate| candidate == to),
            None => from == to,
        }
    }

    pub fn allowed_jurisdictions_for(&self, from: &str) -> Option<&Vec<String>> {
        self.policy.jurisdiction_rules.get(from)
    }

    pub fn retention_limit_for(&self, purpose: &str) -> Option<u32> {
        self.policy
            .retention_limits
            .get(purpose)
            .copied()
            .or(self.policy.fallback_retention_days)
    }

    pub fn guard_preferences(&self) -> &GuardPreferences {
        &self.policy.guard_preferences
    }

    pub fn consent_state(&self, purpose: &str) -> Option<bool> {
        self.consent.purposes.get(purpose).copied()
    }
}

impl PolicyConfig {
    pub fn from_path(path: &Path) -> Result<Self> {
        let raw = fs::read_to_string(path)?;
        parse_policy_payload(&raw, path.extension().and_then(|ext| ext.to_str()))
    }
}

impl ConsentConfig {
    pub fn from_path(path: &Path) -> Result<Self> {
        let raw = fs::read_to_string(path)?;
        parse_consent_payload(&raw, path.extension().and_then(|ext| ext.to_str()))
    }
}

fn parse_policy_payload(raw: &str, ext: Option<&str>) -> Result<PolicyConfig> {
    let policy = match ext {
        Some("yaml") | Some("yml") => serde_yaml::from_str(raw)?,
        _ => serde_json::from_str(raw)?,
    };
    Ok(policy)
}

fn parse_consent_payload(raw: &str, ext: Option<&str>) -> Result<ConsentConfig> {
    let consent = match ext {
        Some("yaml") | Some("yml") => serde_yaml::from_str(raw)?,
        _ => serde_json::from_str(raw)?,
    };
    Ok(consent)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fingerprints_are_stable() {
        let policy = PolicyConfig {
            jurisdiction_rules: IndexMap::new(),
            retention_limits: IndexMap::new(),
            fallback_retention_days: Some(30),
            guard_preferences: GuardPreferences {
                redact_fields: vec!["email".into()],
                tokenize_fields: vec![],
            },
        };
        let consent = ConsentConfig {
            purposes: IndexMap::from_iter([(String::from("analytics"), true)]),
        };

        let ctx = PolicyContext::new(policy.clone(), consent.clone()).unwrap();
        let ctx_again = PolicyContext::new(policy, consent).unwrap();
        assert_eq!(ctx.fingerprint(), ctx_again.fingerprint());
    }
}
