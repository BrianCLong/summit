use std::collections::HashMap;

use psc_runner::functional_encryption::FunctionalEncryptionEngine;
use psc_runner::policy::{PolicyCompiler, PolicySpec, SigningKey, ToyAnalytic};
use psc_runner::{Auditor, EnclaveShim};

fn demo_signing_key() -> SigningKey {
    SigningKey::new("test-key", b"integration-key".to_vec())
}

fn compile_policy() -> psc_runner::policy::CompiledPolicy {
    let spec = PolicySpec {
        policy_id: "policy-1".to_string(),
        allowed_fields: vec!["a".into(), "b".into()],
        analytic: ToyAnalytic::Sum,
    };
    PolicyCompiler::compile(&spec, &demo_signing_key()).expect("policy compiles")
}

#[test]
fn disallowed_field_is_rejected() {
    let policy = compile_policy();
    let mut inputs = HashMap::new();
    inputs.insert("a".to_string(), 1.0);
    inputs.insert("c".to_string(), 2.0);

    let ciphertext = FunctionalEncryptionEngine::bind_inputs(&policy, &inputs);
    let result = EnclaveShim::execute(&policy, &ciphertext);
    assert!(matches!(
        result,
        Err(psc_runner::enclave::EnclaveError::DisallowedField(field)) if field == "c"
    ));
}

#[test]
fn auditor_validates_from_sealed_output() {
    let policy = compile_policy();
    let mut inputs = HashMap::new();
    inputs.insert("a".to_string(), 3.0);
    inputs.insert("b".to_string(), 1.0);

    let ciphertext = FunctionalEncryptionEngine::bind_inputs(&policy, &inputs);
    let receipt = EnclaveShim::execute(&policy, &ciphertext).expect("enclave executes");

    Auditor::verify(&policy, &receipt.sealed_output, &receipt.proof).expect("auditor verifies");

    let mut tampered = receipt.sealed_output.clone();
    tampered.commitment = "deadbeef".into();
    let err = Auditor::verify(&policy, &tampered, &receipt.proof).unwrap_err();
    assert!(matches!(
        err,
        psc_runner::auditor::AuditorError::SealedOutputMismatch
    ));
}
