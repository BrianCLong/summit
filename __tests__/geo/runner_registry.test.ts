import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import { RunnerRegistry } from '../../agentic_web_visibility/geo/src/runner_registry.js';

test('RunnerRegistry runs all registered engines', async () => {
    const registry = new RunnerRegistry();

    registry.register({
        id: 'mock-engine-1',
        run: async (prompt: string) => ({
            engine: 'mock-engine-1',
            promptId: 'test-1',
            answerText: 'Mock answer 1',
            citations: ['mock.com'],
            raw: {}
        })
    });

    registry.register({
        id: 'mock-engine-2',
        run: async (prompt: string) => ({
            engine: 'mock-engine-2',
            promptId: 'test-1',
            answerText: 'Mock answer 2',
            citations: [],
            raw: {}
        })
    });

    const answers = await registry.runAll('GEO:PROMPT:001', 'best CRM');

    assert.strictEqual(answers.length, 2);
    assert.strictEqual(answers[0].engine, 'mock-engine-1');
    assert.strictEqual(answers[0].promptId, 'GEO:PROMPT:001');
    assert.strictEqual(answers[1].engine, 'mock-engine-2');
});
