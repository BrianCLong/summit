import test from 'node:test';
import assert from 'node:assert';
import { score_workflow } from '../summit/evals/universal_arch_eval.js';

test('Eval Gate: Rejects if required controls are missing', () => {
    const score = score_workflow({
        has_modes: true,
        scopes_operations: true,
        structured_state: false, // missing required
        tool_runtime: true,
        diff_ops: true,
        validation: true, // missing evals
        evals: false,
        approval: true,
        monitoring: true,
    });

    assert.strictEqual(score.pass, false);
    assert.strictEqual(score.reason, "missing required controls");
});

test('Eval Gate: Passes if required are met and threshold >= 7', () => {
    const score = score_workflow({
        has_modes: true,
        scopes_operations: true,
        structured_state: true, // required
        tool_runtime: true,
        diff_ops: true,
        validation: true, // required
        evals: true, // required
        approval: false,
        monitoring: false,
    });

    assert.strictEqual(score.pass, true);
    assert.strictEqual(score.score, 7);
});

test('Eval Gate: Fails if threshold < 7', () => {
    const score = score_workflow({
        has_modes: false,
        scopes_operations: false,
        structured_state: true, // required
        tool_runtime: false,
        diff_ops: false,
        validation: true, // required
        evals: true, // required
        approval: false,
        monitoring: false,
    });

    assert.strictEqual(score.pass, false);
    assert.strictEqual(score.score, 3);
});
