export interface UniversalWorkflow {
    has_modes(): boolean;
    scopes_operations(): boolean;
    uses_schema_state(): boolean;
    uses_tools_or_handoffs(): boolean;
    emits_diff_or_ops(): boolean;
    validates_outputs(): boolean;
    has_eval_gate(): boolean;
    has_human_or_policy_gate(): boolean;
    has_drift_monitoring(): boolean;
}

export class UniversalArchClassifier {
    classify(wf: UniversalWorkflow): Record<string, boolean> {
        const score = {
            "has_modes": wf.has_modes(),
            "scoped_ops": wf.scopes_operations(),
            "structured_state": wf.uses_schema_state(),
            "tool_runtime": wf.uses_tools_or_handoffs(),
            "diff_ops": wf.emits_diff_or_ops(),
            "validation": wf.validates_outputs(),
            "evals": wf.has_eval_gate(),
            "approval": wf.has_human_or_policy_gate(),
            "monitoring": wf.has_drift_monitoring(),
        };
        return score;
    }
}
