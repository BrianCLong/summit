use anyhow::Result;
use indexmap::IndexMap;
use serde::Serialize;
use similar::TextDiff;

use crate::dsl::Flow;
use crate::planner::{compile_plan, CompiledArtifacts, GuardAction};
use crate::policy::PolicyContext;

#[derive(Debug, Clone, Serialize)]
pub struct GuardDelta {
    pub edge: String,
    pub before: Option<GuardAction>,
    pub after: Option<GuardAction>,
    pub justification_before: Option<String>,
    pub justification_after: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct SimulationResult {
    pub baseline: CompiledArtifacts,
    pub updated: CompiledArtifacts,
    pub diff_report: String,
    pub guard_deltas: Vec<GuardDelta>,
}

pub fn simulate(
    flow: &Flow,
    baseline: &PolicyContext,
    updated: &PolicyContext,
) -> Result<SimulationResult> {
    let baseline_plan = compile_plan(flow, baseline)?;
    let updated_plan = compile_plan(flow, updated)?;

    let baseline_json = serde_json::to_string_pretty(&baseline_plan.plan)?;
    let updated_json = serde_json::to_string_pretty(&updated_plan.plan)?;

    let diff = TextDiff::from_lines(&baseline_json, &updated_json);
    let mut diff_report = String::new();
    for change in diff.iter_all_changes() {
        let tag = match change.tag() {
            similar::ChangeTag::Delete => '-',
            similar::ChangeTag::Insert => '+',
            similar::ChangeTag::Equal => ' ',
        };
        diff_report.push(tag);
        diff_report.push_str(change.value());
    }

    let guard_deltas = extract_guard_deltas(&baseline_plan, &updated_plan);

    Ok(SimulationResult {
        baseline: baseline_plan,
        updated: updated_plan,
        diff_report,
        guard_deltas,
    })
}

fn extract_guard_deltas(
    baseline: &CompiledArtifacts,
    updated: &CompiledArtifacts,
) -> Vec<GuardDelta> {
    let mut index: IndexMap<
        String,
        (
            Option<GuardAction>,
            Option<String>,
            Option<GuardAction>,
            Option<String>,
        ),
    > = IndexMap::new();

    for edge in &baseline.plan.edges {
        index.insert(
            format!("{}->{}", edge.from, edge.to),
            (
                Some(edge.guard.clone()),
                Some(edge.justification.clone()),
                None,
                None,
            ),
        );
    }

    for edge in &updated.plan.edges {
        let key = format!("{}->{}", edge.from, edge.to);
        let entry = index.entry(key).or_insert((None, None, None, None));
        entry.2 = Some(edge.guard.clone());
        entry.3 = Some(edge.justification.clone());
    }

    let mut deltas = Vec::new();
    for (edge, (before_guard, before_just, after_guard, after_just)) in index {
        if before_guard != after_guard || before_just != after_just {
            deltas.push(GuardDelta {
                edge,
                before: before_guard,
                after: after_guard,
                justification_before: before_just,
                justification_after: after_just,
            });
        }
    }

    deltas
}
