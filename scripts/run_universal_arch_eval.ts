import { score_workflow } from '../summit/evals/universal_arch_eval.js';
import { UniversalArchClassifier } from '../summit/architecture/universal_arch_classifier.js';
import fs from 'node:fs';

const classifier = new UniversalArchClassifier();
const mockWf = {
    has_modes: () => true,
    scopes_operations: () => true,
    uses_schema_state: () => true,
    uses_tools_or_handoffs: () => true,
    emits_diff_or_ops: () => true,
    validates_outputs: () => true,
    has_eval_gate: () => true,
    has_human_or_policy_gate: () => false,
    has_drift_monitoring: () => false
};

const result = classifier.classify(mockWf);
const evalOutput = score_workflow(result);

fs.writeFileSync('artifacts/universal_arch/report.json', JSON.stringify({
    workflow: "mock_test_workflow",
    eval_result: evalOutput
}, null, 2));

console.log("Evaluation Complete:", evalOutput);
