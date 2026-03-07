import test from 'node:test';
import assert from 'node:assert';
import { ModeRouter, WorkflowRequest } from '../summit/orchestration/mode_router.js';

test('ModeRouter requires a declared mode', () => {
    const router = new ModeRouter();

    const requestMissingMode: WorkflowRequest = { intent: "summarize" } as WorkflowRequest;

    assert.throws(() => {
        router.route(requestMissingMode);
    }, /Workflow request must declare a mode/);
});

test('ModeRouter accepts valid modes', () => {
    const router = new ModeRouter();

    assert.strictEqual(router.route({ intent: "summarize", mode: "ask" }), "ask");
    assert.strictEqual(router.route({ intent: "update section", mode: "edit" }), "edit");
    assert.strictEqual(router.route({ intent: "resolve issue", mode: "agent" }), "agent");
});

test('ModeRouter rejects invalid modes', () => {
    const router = new ModeRouter();

    assert.throws(() => {
        router.route({ intent: "summarize", mode: "invalid" as any });
    }, /Invalid mode: invalid/);
});
