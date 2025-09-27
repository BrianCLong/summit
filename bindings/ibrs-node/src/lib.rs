use ibrs::{Engine, EngineError, EvaluationResult, Proof};
use napi::bindgen_prelude::*;
use napi_derive::napi;
use serde_json::Value;

fn map_engine(err: EngineError) -> Error {
    Error::new(Status::GenericFailure, err.to_string())
}

fn serialize_result(result: EvaluationResult) -> napi::Result<Value> {
    serde_json::to_value(result).map_err(|err| Error::new(Status::GenericFailure, err.to_string()))
}

#[napi]
pub fn evaluate(rules: String, facts: Value) -> napi::Result<Value> {
    let engine = Engine::new(&rules).map_err(map_engine)?;
    let evaluation = engine.evaluate(&facts).map_err(map_engine)?;
    serialize_result(evaluation)
}

#[napi]
pub fn verify(rules: String, facts: Value, proof: Value) -> napi::Result<Value> {
    let engine = Engine::new(&rules).map_err(map_engine)?;
    let proof: Proof = serde_json::from_value(proof)
        .map_err(|err| Error::new(Status::GenericFailure, err.to_string()))?;
    let evaluation = engine.verify_proof(&facts, &proof).map_err(map_engine)?;
    serialize_result(evaluation)
}
