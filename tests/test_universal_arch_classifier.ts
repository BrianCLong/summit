import test from 'node:test';
import assert from 'node:assert';
import { UniversalArchClassifier, UniversalWorkflow } from '../summit/architecture/universal_arch_classifier.js';

class MockWorkflow implements UniversalWorkflow {
    constructor(private features: Record<string, boolean> = {}) {}

    has_modes() { return this.features['has_modes'] || false; }
    scopes_operations() { return this.features['scopes_operations'] || false; }
    uses_schema_state() { return this.features['uses_schema_state'] || false; }
    uses_tools_or_handoffs() { return this.features['uses_tools_or_handoffs'] || false; }
    emits_diff_or_ops() { return this.features['emits_diff_or_ops'] || false; }
    validates_outputs() { return this.features['validates_outputs'] || false; }
    has_eval_gate() { return this.features['has_eval_gate'] || false; }
    has_human_or_policy_gate() { return this.features['has_human_or_policy_gate'] || false; }
    has_drift_monitoring() { return this.features['has_drift_monitoring'] || false; }
}

test('UniversalArchClassifier classifies workflow correctly', () => {
    const classifier = new UniversalArchClassifier();
    const wf = new MockWorkflow({
        has_modes: true,
        scopes_operations: true,
        uses_schema_state: false,
    });

    const score = classifier.classify(wf);
    assert.strictEqual(score.has_modes, true);
    assert.strictEqual(score.scoped_ops, true);
    assert.strictEqual(score.structured_state, false);
    assert.strictEqual(score.evals, false);
});
