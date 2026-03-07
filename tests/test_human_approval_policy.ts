import test from 'node:test';
import assert from 'node:assert';
import { requires_approval } from '../summit/validation/approval_gate.js';

test('Approval Gate: Does not require approval for safe operations', () => {
    const safePlan = {
        operations: [
            { kind: "add" },
            { kind: "update" },
            { kind: "replace" }
        ]
    };
    assert.strictEqual(requires_approval(safePlan), false);
});

test('Approval Gate: Requires approval for delete', () => {
    const riskyPlan = {
        operations: [
            { kind: "delete" }
        ]
    };
    assert.strictEqual(requires_approval(riskyPlan), true);
});

test('Approval Gate: Requires approval for bulk_edit', () => {
    const riskyPlan = {
        operations: [
            { kind: "bulk_edit" }
        ]
    };
    assert.strictEqual(requires_approval(riskyPlan), true);
});

test('Approval Gate: Requires approval for privileged_tool', () => {
    const riskyPlan = {
        operations: [
            { kind: "privileged_tool" }
        ]
    };
    assert.strictEqual(requires_approval(riskyPlan), true);
});

test('Approval Gate: Requires approval if any operation is risky', () => {
    const mixedPlan = {
        operations: [
            { kind: "add" },
            { kind: "bulk_edit" }
        ]
    };
    assert.strictEqual(requires_approval(mixedPlan), true);
});
