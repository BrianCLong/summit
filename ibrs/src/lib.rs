mod parser;
mod runtime;

pub use parser::{ParseError, Program};
pub use runtime::{
    AppliedRule, Engine, EngineError, EvaluationResult, FactProof, Proof, ProofExpr, ProofExprKind,
};
