use ibrs::{AppliedRule, Engine, EngineError};
use serde_json::json;

fn sample_rules() -> &'static str {
    "fact eligible if income >= 75000.\n\
fact low_risk if delinquencies == 0 and not flagged.\n\
decision \"approve\" if eligible and low_risk.\n\
decision \"manual_review\" if eligible and flagged.\n\
default decision \"reject\"."
}

#[test]
fn identical_inputs_produce_identical_outputs() {
    let rules = sample_rules();
    let facts = json!({
        "income": 80000,
        "delinquencies": 0,
        "flagged": false
    });
    let engine = Engine::new(rules).expect("engine");
    let first = engine.evaluate(&facts).expect("first evaluation");
    let second = engine.evaluate(&facts).expect("second evaluation");

    let first_bytes = serde_json::to_vec(&first).expect("serialize first");
    let second_bytes = serde_json::to_vec(&second).expect("serialize second");

    assert_eq!(
        first_bytes, second_bytes,
        "evaluation must be deterministic"
    );
}

#[test]
fn nondeterministic_tokens_are_rejected() {
    let rules = "decision \"approve\" if now() == 1.\ndefault decision \"reject\".";
    let err = match Engine::new(rules) {
        Ok(_) => panic!("rules should be rejected"),
        Err(err) => err,
    };
    match err {
        EngineError::Parse(_) => {}
        other => panic!("expected parse error, got {other:?}"),
    }
}

#[test]
fn verifier_reconstructs_decision_from_proof() {
    let rules = sample_rules();
    let facts = json!({
        "income": 92000,
        "delinquencies": 0,
        "flagged": true
    });
    let engine = Engine::new(rules).expect("engine");
    let evaluation = engine.evaluate(&facts).expect("evaluation");
    let verified = engine
        .verify_proof(&facts, &evaluation.proof)
        .expect("proof verification");

    assert_eq!(verified.decision, evaluation.decision);
    assert_eq!(verified.proof.decision, evaluation.proof.decision);

    // Tamper with the proof to ensure verifier catches it.
    let mut tampered = evaluation.proof.clone();
    tampered.applied_rule = AppliedRule::Default {
        label: "reject".to_string(),
    };
    let err = engine
        .verify_proof(&facts, &tampered)
        .expect_err("tampered proof");
    match err {
        EngineError::InvalidProof(_) => {}
        other => panic!("expected invalid proof error, got {other:?}"),
    }
}
