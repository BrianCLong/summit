use std::collections::{BTreeMap, HashMap};

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::parser::{parse_program, CompareOp, Expr, FactRule, ParseError, Program};

#[derive(Debug, thiserror::Error)]
pub enum EngineError {
    #[error("{0}")]
    Parse(#[from] ParseError),
    #[error("facts input must be a JSON object")]
    InvalidFacts,
    #[error("default decision is required for total evaluation")]
    MissingDefaultDecision,
    #[error("identifier '{0}' was not provided as a fact or derived fact")]
    UnknownIdentifier(String),
    #[error("expected {expected} but found {found}")]
    TypeMismatch {
        expected: &'static str,
        found: String,
    },
    #[error("no decision rule matched and no default decision provided")]
    NoDecision,
    #[error("invalid proof: {0}")]
    InvalidProof(String),
    #[error("io error: {0}")]
    Io(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EvaluationResult {
    pub decision: String,
    pub proof: Proof,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Proof {
    pub facts: Vec<FactProof>,
    pub applied_rule: AppliedRule,
    pub decision: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FactProof {
    pub name: String,
    pub value: Value,
    pub condition: ProofExpr,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum AppliedRule {
    Conditional { label: String, condition: ProofExpr },
    Default { label: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProofExpr {
    pub result: Value,
    pub kind: ProofExprKind,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ProofExprKind {
    Literal,
    InputFact {
        name: String,
    },
    FactRef {
        name: String,
    },
    Not {
        child: Box<ProofExpr>,
    },
    And {
        operands: Vec<ProofExpr>,
    },
    Or {
        operands: Vec<ProofExpr>,
    },
    Comparison {
        operator: CompareOp,
        left: Box<ProofExpr>,
        right: Box<ProofExpr>,
    },
}

pub struct Engine {
    program: Program,
}

impl Engine {
    pub fn new(rules: &str) -> Result<Self, EngineError> {
        let program = parse_program(rules)?;
        if program.default_decision.is_none() {
            return Err(EngineError::MissingDefaultDecision);
        }
        Ok(Self { program })
    }

    pub fn from_program(program: Program) -> Result<Self, EngineError> {
        if program.default_decision.is_none() {
            return Err(EngineError::MissingDefaultDecision);
        }
        Ok(Self { program })
    }

    pub fn evaluate(&self, facts: &Value) -> Result<EvaluationResult, EngineError> {
        let input_map = facts.as_object().ok_or(EngineError::InvalidFacts)?;
        let mut ctx = EvalContext::new(input_map);

        for rule in &self.program.fact_rules {
            let (value, proof) = ctx.evaluate_expr(&rule.condition)?;
            let bool_value = value.as_bool().ok_or_else(|| EngineError::TypeMismatch {
                expected: "a boolean fact",
                found: value_type_name(&value).into(),
            })?;
            ctx.record_fact(&rule.name, bool_value, proof);
        }

        let mut applied_rule = None;
        for decision in &self.program.decision_rules {
            let (value, proof) = ctx.evaluate_expr(&decision.condition)?;
            let matches = value.as_bool().ok_or_else(|| EngineError::TypeMismatch {
                expected: "boolean decision condition",
                found: value_type_name(&value).into(),
            })?;
            if matches {
                applied_rule = Some(AppliedRule::Conditional {
                    label: decision.label.clone(),
                    condition: proof,
                });
                break;
            }
        }

        let applied_rule = match applied_rule {
            Some(rule) => rule,
            None => AppliedRule::Default {
                label: self
                    .program
                    .default_decision
                    .clone()
                    .ok_or(EngineError::NoDecision)?,
            },
        };

        let decision = match &applied_rule {
            AppliedRule::Conditional { label, .. } => label.clone(),
            AppliedRule::Default { label } => label.clone(),
        };

        Ok(EvaluationResult {
            decision: decision.clone(),
            proof: Proof {
                facts: ctx.fact_proofs,
                applied_rule,
                decision,
            },
        })
    }

    pub fn verify_proof(
        &self,
        facts: &Value,
        proof: &Proof,
    ) -> Result<EvaluationResult, EngineError> {
        let input_map = facts.as_object().ok_or(EngineError::InvalidFacts)?;
        let mut replay = ReplayContext::new(input_map, &self.program.fact_rules);
        replay.verify_facts(&proof.facts)?;
        let decision = replay.verify_decision(&self.program, &proof.applied_rule)?;

        if decision != proof.decision {
            return Err(EngineError::InvalidProof(format!(
                "decision mismatch: expected '{}' but proof recorded '{}'",
                decision, proof.decision
            )));
        }

        Ok(EvaluationResult {
            decision,
            proof: proof.clone(),
        })
    }
}

struct EvalContext<'a> {
    inputs: &'a serde_json::Map<String, Value>,
    derived: BTreeMap<String, Value>,
    fact_proofs: Vec<FactProof>,
}

impl<'a> EvalContext<'a> {
    fn new(inputs: &'a serde_json::Map<String, Value>) -> Self {
        Self {
            inputs,
            derived: BTreeMap::new(),
            fact_proofs: Vec::new(),
        }
    }

    fn record_fact(&mut self, name: &str, value: bool, proof: ProofExpr) {
        let fact_value = Value::Bool(value);
        self.derived.insert(name.to_string(), fact_value.clone());
        self.fact_proofs.push(FactProof {
            name: name.to_string(),
            value: fact_value,
            condition: proof,
        });
    }

    fn evaluate_expr(&mut self, expr: &Expr) -> Result<(Value, ProofExpr), EngineError> {
        let (value, proof) = self.eval(expr)?;
        Ok((value, proof))
    }

    fn eval(&mut self, expr: &Expr) -> Result<(Value, ProofExpr), EngineError> {
        match expr {
            Expr::Identifier(name) => {
                if let Some(value) = self.derived.get(name) {
                    Ok((
                        value.clone(),
                        ProofExpr {
                            result: value.clone(),
                            kind: ProofExprKind::FactRef { name: name.clone() },
                        },
                    ))
                } else if let Some(value) = self.inputs.get(name) {
                    Ok((
                        value.clone(),
                        ProofExpr {
                            result: value.clone(),
                            kind: ProofExprKind::InputFact { name: name.clone() },
                        },
                    ))
                } else {
                    Err(EngineError::UnknownIdentifier(name.clone()))
                }
            }
            Expr::BoolLiteral(value) => Ok((
                Value::Bool(*value),
                ProofExpr {
                    result: Value::Bool(*value),
                    kind: ProofExprKind::Literal,
                },
            )),
            Expr::NumberLiteral(value) => Ok((
                Value::from(*value),
                ProofExpr {
                    result: Value::from(*value),
                    kind: ProofExprKind::Literal,
                },
            )),
            Expr::StringLiteral(value) => Ok((
                Value::String(value.clone()),
                ProofExpr {
                    result: Value::String(value.clone()),
                    kind: ProofExprKind::Literal,
                },
            )),
            Expr::Not(inner) => {
                let (child_value, child_proof) = self.eval(inner)?;
                let bool_value =
                    child_value
                        .as_bool()
                        .ok_or_else(|| EngineError::TypeMismatch {
                            expected: "boolean operand",
                            found: value_type_name(&child_value).into(),
                        })?;
                let result = !bool_value;
                Ok((
                    Value::Bool(result),
                    ProofExpr {
                        result: Value::Bool(result),
                        kind: ProofExprKind::Not {
                            child: Box::new(child_proof),
                        },
                    },
                ))
            }
            Expr::And(operands) => {
                let mut proofs = Vec::new();
                let mut result = true;
                for operand in operands {
                    let (value, proof) = self.eval(operand)?;
                    let bool_value = value.as_bool().ok_or_else(|| EngineError::TypeMismatch {
                        expected: "boolean operand",
                        found: value_type_name(&value).into(),
                    })?;
                    result &= bool_value;
                    proofs.push(proof);
                    if !result {
                        // Short-circuit but still evaluate deterministically by breaking after storing proof
                        // to keep consistent tree we continue evaluation but deterministic semantics requires
                        // evaluating all operands; we purposefully evaluate all operands before break.
                    }
                }
                Ok((
                    Value::Bool(result),
                    ProofExpr {
                        result: Value::Bool(result),
                        kind: ProofExprKind::And { operands: proofs },
                    },
                ))
            }
            Expr::Or(operands) => {
                let mut proofs = Vec::new();
                let mut result = false;
                for operand in operands {
                    let (value, proof) = self.eval(operand)?;
                    let bool_value = value.as_bool().ok_or_else(|| EngineError::TypeMismatch {
                        expected: "boolean operand",
                        found: value_type_name(&value).into(),
                    })?;
                    result |= bool_value;
                    proofs.push(proof);
                }
                Ok((
                    Value::Bool(result),
                    ProofExpr {
                        result: Value::Bool(result),
                        kind: ProofExprKind::Or { operands: proofs },
                    },
                ))
            }
            Expr::Comparison { left, op, right } => {
                let (left_value, left_proof) = self.eval(left)?;
                let (right_value, right_proof) = self.eval(right)?;
                let result = Value::Bool(compare_values(*op, &left_value, &right_value)?);
                Ok((
                    result.clone(),
                    ProofExpr {
                        result,
                        kind: ProofExprKind::Comparison {
                            operator: *op,
                            left: Box::new(left_proof),
                            right: Box::new(right_proof),
                        },
                    },
                ))
            }
            Expr::Group(inner) => self.eval(inner),
        }
    }
}

struct ReplayContext<'a> {
    inputs: &'a serde_json::Map<String, Value>,
    fact_rules: &'a [FactRule],
    derived: HashMap<String, Value>,
}

impl<'a> ReplayContext<'a> {
    fn new(inputs: &'a serde_json::Map<String, Value>, fact_rules: &'a [FactRule]) -> Self {
        Self {
            inputs,
            fact_rules,
            derived: HashMap::new(),
        }
    }

    fn verify_facts(&mut self, proofs: &[FactProof]) -> Result<(), EngineError> {
        if proofs.len() != self.fact_rules.len() {
            return Err(EngineError::InvalidProof(format!(
                "expected {} fact proofs but found {}",
                self.fact_rules.len(),
                proofs.len()
            )));
        }

        for (rule, proof) in self.fact_rules.iter().zip(proofs.iter()) {
            if rule.name != proof.name {
                return Err(EngineError::InvalidProof(format!(
                    "fact order mismatch: expected '{}' but found '{}'",
                    rule.name, proof.name
                )));
            }
            let result = self.replay_expr(&rule.condition, &proof.condition)?;
            if result != proof.value {
                return Err(EngineError::InvalidProof(format!(
                    "fact '{}' value mismatch",
                    rule.name
                )));
            }
            self.derived.insert(rule.name.clone(), result);
        }
        Ok(())
    }

    fn verify_decision(
        &mut self,
        program: &Program,
        applied: &AppliedRule,
    ) -> Result<String, EngineError> {
        match applied {
            AppliedRule::Conditional { label, condition } => {
                for decision_rule in &program.decision_rules {
                    if &decision_rule.label == label {
                        let result = self.replay_expr(&decision_rule.condition, condition)?;
                        if !result.as_bool().ok_or_else(|| {
                            EngineError::InvalidProof("decision condition must be boolean".into())
                        })? {
                            return Err(EngineError::InvalidProof(format!(
                                "decision '{}' condition evaluated to false",
                                label
                            )));
                        }
                        return Ok(label.clone());
                    }
                }
                Err(EngineError::InvalidProof(format!(
                    "decision '{}' not present in rules",
                    label
                )))
            }
            AppliedRule::Default { label } => {
                if program.default_decision.as_ref() != Some(label) {
                    return Err(EngineError::InvalidProof(
                        "default decision does not match program".into(),
                    ));
                }
                Ok(label.clone())
            }
        }
    }

    fn replay_expr(&mut self, expr: &Expr, proof: &ProofExpr) -> Result<Value, EngineError> {
        match expr {
            Expr::Identifier(name) => match &proof.kind {
                ProofExprKind::InputFact { name: proof_name } => {
                    if proof_name != name {
                        return Err(EngineError::InvalidProof(format!(
                            "input fact mismatch: expected '{}' but proof referenced '{}'",
                            name, proof_name
                        )));
                    }
                    let expected = self.inputs.get(name).ok_or_else(|| {
                        EngineError::InvalidProof(format!(
                            "input fact '{}' missing from provided facts",
                            name
                        ))
                    })?;
                    if expected != &proof.result {
                        return Err(EngineError::InvalidProof(format!(
                            "input fact '{}' value mismatch",
                            name
                        )));
                    }
                    Ok(expected.clone())
                }
                ProofExprKind::FactRef { name: proof_name } => {
                    if proof_name != name {
                        return Err(EngineError::InvalidProof(format!(
                            "fact reference mismatch: expected '{}' but proof referenced '{}'",
                            name, proof_name
                        )));
                    }
                    let value = self.derived.get(name).ok_or_else(|| {
                        EngineError::InvalidProof(format!(
                            "fact '{}' referenced before being derived",
                            name
                        ))
                    })?;
                    if value != &proof.result {
                        return Err(EngineError::InvalidProof(format!(
                            "fact '{}' reference value mismatch",
                            name
                        )));
                    }
                    Ok(value.clone())
                }
                _ => Err(EngineError::InvalidProof(format!(
                    "identifier '{}' proof has incompatible node",
                    name
                ))),
            },
            Expr::BoolLiteral(expected) => match &proof.kind {
                ProofExprKind::Literal => {
                    if proof.result != Value::Bool(*expected) {
                        return Err(EngineError::InvalidProof(
                            "boolean literal value mismatch".into(),
                        ));
                    }
                    Ok(Value::Bool(*expected))
                }
                _ => Err(EngineError::InvalidProof(
                    "boolean literal proof must be literal".into(),
                )),
            },
            Expr::NumberLiteral(expected) => match &proof.kind {
                ProofExprKind::Literal => {
                    if proof.result != Value::from(*expected) {
                        return Err(EngineError::InvalidProof(
                            "number literal value mismatch".into(),
                        ));
                    }
                    Ok(Value::from(*expected))
                }
                _ => Err(EngineError::InvalidProof(
                    "number literal proof must be literal".into(),
                )),
            },
            Expr::StringLiteral(expected) => match &proof.kind {
                ProofExprKind::Literal => {
                    if proof.result != Value::String(expected.clone()) {
                        return Err(EngineError::InvalidProof(
                            "string literal value mismatch".into(),
                        ));
                    }
                    Ok(Value::String(expected.clone()))
                }
                _ => Err(EngineError::InvalidProof(
                    "string literal proof must be literal".into(),
                )),
            },
            Expr::Not(inner) => match &proof.kind {
                ProofExprKind::Not { child } => {
                    let value = self.replay_expr(inner, child)?;
                    let bool_value = value.as_bool().ok_or_else(|| {
                        EngineError::InvalidProof("negation operand must be boolean".into())
                    })?;
                    let result = Value::Bool(!bool_value);
                    if result != proof.result {
                        return Err(EngineError::InvalidProof("negation result mismatch".into()));
                    }
                    Ok(result)
                }
                _ => Err(EngineError::InvalidProof(
                    "negation proof missing child".into(),
                )),
            },
            Expr::And(operands) => match &proof.kind {
                ProofExprKind::And {
                    operands: proof_ops,
                } => {
                    if operands.len() != proof_ops.len() {
                        return Err(EngineError::InvalidProof(
                            "logical 'and' operand count mismatch".into(),
                        ));
                    }
                    let mut result = true;
                    for (expr_child, proof_child) in operands.iter().zip(proof_ops.iter()) {
                        let value = self.replay_expr(expr_child, proof_child)?;
                        let bool_value = value.as_bool().ok_or_else(|| {
                            EngineError::InvalidProof(
                                "logical 'and' operand must be boolean".into(),
                            )
                        })?;
                        result &= bool_value;
                    }
                    let computed = Value::Bool(result);
                    if computed != proof.result {
                        return Err(EngineError::InvalidProof(
                            "logical 'and' result mismatch".into(),
                        ));
                    }
                    Ok(computed)
                }
                _ => Err(EngineError::InvalidProof(
                    "logical 'and' proof missing operands".into(),
                )),
            },
            Expr::Or(operands) => match &proof.kind {
                ProofExprKind::Or {
                    operands: proof_ops,
                } => {
                    if operands.len() != proof_ops.len() {
                        return Err(EngineError::InvalidProof(
                            "logical 'or' operand count mismatch".into(),
                        ));
                    }
                    let mut result = false;
                    for (expr_child, proof_child) in operands.iter().zip(proof_ops.iter()) {
                        let value = self.replay_expr(expr_child, proof_child)?;
                        let bool_value = value.as_bool().ok_or_else(|| {
                            EngineError::InvalidProof("logical 'or' operand must be boolean".into())
                        })?;
                        result |= bool_value;
                    }
                    let computed = Value::Bool(result);
                    if computed != proof.result {
                        return Err(EngineError::InvalidProof(
                            "logical 'or' result mismatch".into(),
                        ));
                    }
                    Ok(computed)
                }
                _ => Err(EngineError::InvalidProof(
                    "logical 'or' proof missing operands".into(),
                )),
            },
            Expr::Comparison { left, op, right } => match &proof.kind {
                ProofExprKind::Comparison {
                    operator,
                    left: proof_left,
                    right: proof_right,
                } => {
                    if operator != op {
                        return Err(EngineError::InvalidProof(
                            "comparison operator mismatch".into(),
                        ));
                    }
                    let left_value = self.replay_expr(left, proof_left)?;
                    let right_value = self.replay_expr(right, proof_right)?;
                    let bool_value = compare_values(*op, &left_value, &right_value)?;
                    let computed = Value::Bool(bool_value);
                    if computed != proof.result {
                        return Err(EngineError::InvalidProof(
                            "comparison result mismatch".into(),
                        ));
                    }
                    Ok(computed)
                }
                _ => Err(EngineError::InvalidProof(
                    "comparison proof missing operands".into(),
                )),
            },
            Expr::Group(inner) => self.replay_expr(inner, proof),
        }
    }
}

fn compare_values(op: CompareOp, left: &Value, right: &Value) -> Result<bool, EngineError> {
    match op {
        CompareOp::Eq => Ok(left == right),
        CompareOp::Ne => Ok(left != right),
        CompareOp::Gt | CompareOp::Ge | CompareOp::Lt | CompareOp::Le => {
            let left_num = left.as_f64().ok_or_else(|| EngineError::TypeMismatch {
                expected: "number",
                found: value_type_name(left).into(),
            })?;
            let right_num = right.as_f64().ok_or_else(|| EngineError::TypeMismatch {
                expected: "number",
                found: value_type_name(right).into(),
            })?;
            match op {
                CompareOp::Gt => Ok(left_num > right_num),
                CompareOp::Ge => Ok(left_num >= right_num),
                CompareOp::Lt => Ok(left_num < right_num),
                CompareOp::Le => Ok(left_num <= right_num),
                _ => unreachable!(),
            }
        }
    }
}

fn value_type_name(value: &Value) -> &'static str {
    match value {
        Value::Null => "null",
        Value::Bool(_) => "boolean",
        Value::Number(_) => "number",
        Value::String(_) => "string",
        Value::Array(_) => "array",
        Value::Object(_) => "object",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn eval(rules: &str, facts: &Value) -> EvaluationResult {
        let engine = Engine::new(rules).expect("build engine");
        engine.evaluate(facts).expect("evaluate")
    }

    #[test]
    fn evaluates_simple_program() {
        let rules = "fact eligible if income >= 50000.\nfact risky if delinquencies > 0.\ndecision \"approve\" if eligible and not risky.\ndecision \"reject\" if risky.\ndefault decision \"review\".";
        let facts = serde_json::json!({
            "income": 80000,
            "delinquencies": 0
        });
        let result = eval(rules, &facts);
        assert_eq!(result.decision, "approve");
        assert!(matches!(
            result.proof.applied_rule,
            AppliedRule::Conditional { .. }
        ));
    }

    #[test]
    fn rejects_missing_default() {
        let rules = "fact eligible if income >= 50000.";
        let err = match Engine::new(rules) {
            Ok(_) => panic!("engine should require a default decision"),
            Err(err) => err,
        };
        assert!(matches!(err, EngineError::MissingDefaultDecision));
    }
}
