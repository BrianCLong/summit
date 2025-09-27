use anyhow::Result;
use serde::Serialize;
use sha2::{Digest, Sha256};

const PLAN_CONTEXT: &str = "acdc-plan-signature:v1";
const POLICY_CONTEXT: &str = "acdc-policy-fingerprint:v1";

pub fn sign_execution_plan<T: Serialize>(plan: &T) -> Result<String> {
    let value = serde_json::to_value(plan)?;
    digest(&value, PLAN_CONTEXT)
}

pub fn verify_execution_plan<T: Serialize>(plan: &T, signature: &str) -> Result<bool> {
    Ok(sign_execution_plan(plan)? == signature)
}

pub fn fingerprint_config<P: Serialize, C: Serialize>(policy: &P, consent: &C) -> Result<String> {
    let payload = serde_json::json!({
      "policy": policy,
      "consent": consent,
    });
    digest(&payload, POLICY_CONTEXT)
}

fn digest(value: &serde_json::Value, context: &str) -> Result<String> {
    let bytes = serde_json::to_vec(value)?;
    let mut hasher = Sha256::new();
    hasher.update(context.as_bytes());
    hasher.update(bytes);
    Ok(hex::encode(hasher.finalize()))
}
