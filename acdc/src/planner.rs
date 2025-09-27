use anyhow::{anyhow, Result};
use chrono::Utc;
use indexmap::IndexMap;
use serde::Serialize;

use crate::dsl::{Flow, Node, NodeKind};
use crate::policy::PolicyContext;
use crate::signing;

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum GuardAction {
    Allow,
    Redact { reason: String, fields: Vec<String> },
    Tokenize { reason: String, strategy: String },
    Deny { reason: String },
}

impl GuardAction {
    pub fn label(&self) -> &'static str {
        match self {
            GuardAction::Allow => "allow",
            GuardAction::Redact { .. } => "redact",
            GuardAction::Tokenize { .. } => "tokenize",
            GuardAction::Deny { .. } => "deny",
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct NodeAnnotationPlan {
    pub purpose: String,
    pub jurisdiction: String,
    pub retention: String,
    pub retention_days: u32,
}

#[derive(Debug, Clone, Serialize)]
pub struct NodePlan {
    pub name: String,
    pub kind: NodeKind,
    pub annotations: NodeAnnotationPlan,
    pub operations: Vec<String>,
    pub proof_hook: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct EdgePlan {
    pub from: String,
    pub to: String,
    pub guard: GuardAction,
    pub justification: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ExecutionPlan {
    pub flow_name: Option<String>,
    pub generated_at: chrono::DateTime<chrono::Utc>,
    pub policy_fingerprint: String,
    pub nodes: Vec<NodePlan>,
    pub edges: Vec<EdgePlan>,
}

#[derive(Debug, Clone, Serialize)]
pub struct PolicyJustification {
    pub edge: String,
    pub status: String,
    pub rationale: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProofArtifact {
    pub node: String,
    pub hook: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct CompiledArtifacts {
    pub plan: ExecutionPlan,
    pub policy_justifications: Vec<PolicyJustification>,
    pub proof_artifacts: Vec<ProofArtifact>,
    pub signature: String,
}

pub fn compile_plan(flow: &Flow, ctx: &PolicyContext) -> Result<CompiledArtifacts> {
    let mut node_plans: IndexMap<String, NodePlan> = IndexMap::new();
    for node in flow.nodes.values() {
        node_plans.insert(node.name.clone(), build_node_plan(node));
    }

    let mut edge_plans = Vec::new();
    let mut justifications = Vec::new();

    for edge in &flow.edges {
        let from = flow
            .nodes
            .get(&edge.from)
            .ok_or_else(|| anyhow!("unknown node '{}' referenced", edge.from))?;
        let to = flow
            .nodes
            .get(&edge.to)
            .ok_or_else(|| anyhow!("unknown node '{}' referenced", edge.to))?;

        let (guard, justification, status) = determine_guard(from, to, ctx);

        if let Some(plan) = node_plans.get_mut(&edge.from) {
            if !matches!(guard, GuardAction::Allow) {
                plan.operations
                    .push(format!("apply-guard:{} -> {}", guard.label(), edge.to));
            }
        }

        edge_plans.push(EdgePlan {
            from: edge.from.clone(),
            to: edge.to.clone(),
            guard: guard.clone(),
            justification: justification.clone(),
        });
        justifications.push(PolicyJustification {
            edge: format!("{}->{}", edge.from, edge.to),
            status,
            rationale: justification,
        });
    }

    let generated_at = Utc::now();
    let proof_artifacts = node_plans
        .values()
        .map(|plan| ProofArtifact {
            node: plan.name.clone(),
            hook: plan.proof_hook.clone(),
        })
        .collect();

    let plan = ExecutionPlan {
        flow_name: flow.name.clone(),
        generated_at,
        policy_fingerprint: ctx.fingerprint().to_string(),
        nodes: node_plans.values().cloned().collect(),
        edges: edge_plans,
    };

    let signature = signing::sign_execution_plan(&plan)?;

    Ok(CompiledArtifacts {
        plan,
        policy_justifications: justifications,
        proof_artifacts,
        signature,
    })
}

fn build_node_plan(node: &Node) -> NodePlan {
    NodePlan {
        name: node.name.clone(),
        kind: node.kind.clone(),
        annotations: NodeAnnotationPlan {
            purpose: node.annotations.purpose.clone(),
            jurisdiction: node.annotations.jurisdiction.clone(),
            retention: node.annotations.retention.as_str(),
            retention_days: node.annotations.retention.to_days(),
        },
        operations: default_operations(&node.kind),
        proof_hook: format!(
            "proof://node/{name}?purpose={purpose}&jurisdiction={jurisdiction}",
            name = node.name,
            purpose = node.annotations.purpose,
            jurisdiction = node.annotations.jurisdiction
        ),
    }
}

fn default_operations(kind: &NodeKind) -> Vec<String> {
    match kind {
        NodeKind::Source => vec!["fetch-input".to_string()],
        NodeKind::Transform => vec!["apply-transform".to_string()],
        NodeKind::Sink => vec!["emit-output".to_string()],
    }
}

fn determine_guard(from: &Node, to: &Node, ctx: &PolicyContext) -> (GuardAction, String, String) {
    if !ctx.is_purpose_allowed(&from.annotations.purpose) {
        let reason = format!(
            "Consent for purpose '{}' is not granted; deny edge {}->{}",
            from.annotations.purpose, from.name, to.name
        );
        return (
            GuardAction::Deny {
                reason: reason.clone(),
            },
            reason,
            "blocked".to_string(),
        );
    }

    if !ctx.is_jurisdiction_allowed(&from.annotations.jurisdiction, &to.annotations.jurisdiction) {
        let allowed = ctx
            .allowed_jurisdictions_for(&from.annotations.jurisdiction)
            .map(|list| list.join(", "))
            .unwrap_or_else(|| from.annotations.jurisdiction.clone());
        let reason = format!(
            "Jurisdiction transfer {}→{} not in [{}]; tokenize before delivery",
            from.annotations.jurisdiction, to.annotations.jurisdiction, allowed
        );
        let fields = ctx.guard_preferences().tokenize_fields.clone();
        return (
            GuardAction::Tokenize {
                reason: reason.clone(),
                strategy: if fields.is_empty() {
                    "format-preserving".to_string()
                } else {
                    format!("tokenize-fields:{}", fields.join("|"))
                },
            },
            reason,
            "guarded".to_string(),
        );
    }

    if let Some(limit) = ctx.retention_limit_for(&from.annotations.purpose) {
        if to.annotations.retention.to_days() > limit {
            let mut fields = ctx.guard_preferences().redact_fields.clone();
            if fields.is_empty() {
                fields.push("default_pii".to_string());
            }
            let reason = format!(
                "Retention {} exceeds limit {} days for purpose '{}'; redact sensitive fields",
                to.annotations.retention, limit, from.annotations.purpose
            );
            return (
                GuardAction::Redact {
                    reason: reason.clone(),
                    fields,
                },
                reason,
                "guarded".to_string(),
            );
        }
    }

    let consent_state = ctx
        .consent_state(&from.annotations.purpose)
        .map(|state| if state { "granted" } else { "revoked" })
        .unwrap_or("implicit");
    let justification = format!(
        "Consent {}; jurisdictions aligned {}→{}; retention {} accepted",
        consent_state,
        from.annotations.jurisdiction,
        to.annotations.jurisdiction,
        to.annotations.retention
    );

    (GuardAction::Allow, justification, "allow".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dsl;
    use crate::policy::{ConsentConfig, GuardPreferences, PolicyConfig};

    fn build_context(consent_allowed: bool, retention_limit: Option<u32>) -> PolicyContext {
        let mut policy = PolicyConfig::default();
        policy.fallback_retention_days = retention_limit;
        policy.guard_preferences = GuardPreferences {
            redact_fields: vec!["email".into()],
            tokenize_fields: vec!["ssn".into()],
        };

        let mut consent = ConsentConfig::default();
        consent
            .purposes
            .insert("analytics".to_string(), consent_allowed);

        PolicyContext::new(policy, consent).unwrap()
    }

    fn build_flow() -> Flow {
        let dsl = r#"
source users [purpose=analytics, jurisdiction=US, retention=30d]
transform sanitize [purpose=analytics, jurisdiction=US, retention=30d]
sink warehouse [purpose=analytics, jurisdiction=US, retention=120d]

users -> sanitize -> warehouse
"#;
        dsl::parse(dsl).unwrap()
    }

    #[test]
    fn denies_edges_when_consent_missing() {
        let flow = build_flow();
        let ctx = build_context(false, Some(365));
        let plan = compile_plan(&flow, &ctx).unwrap();
        let first_edge = &plan.plan.edges[0];
        assert!(matches!(first_edge.guard, GuardAction::Deny { .. }));
    }

    #[test]
    fn redacts_when_retention_exceeds_limit() {
        let flow = build_flow();
        let ctx = build_context(true, Some(60));
        let plan = compile_plan(&flow, &ctx).unwrap();
        let last_edge = plan
            .plan
            .edges
            .iter()
            .find(|edge| edge.to == "warehouse")
            .unwrap();
        assert!(matches!(last_edge.guard, GuardAction::Redact { .. }));
    }
}
