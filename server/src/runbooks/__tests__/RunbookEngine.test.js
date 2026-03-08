"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const RunbookEngine_js_1 = require("../engine/RunbookEngine.js");
// Mock provenance ledger
globals_1.jest.mock('../../provenance/ledger.js', () => ({
    provenanceLedger: {
        appendEntry: globals_1.jest.fn().mockResolvedValue({ id: 'mock-entry' }),
        getEntries: globals_1.jest.fn().mockResolvedValue([]),
    }
}));
// Mock Step
class MockStep {
    async execute(context, parameters) {
        return { executed: true, params: parameters };
    }
}
(0, globals_1.describe)('Runbook Engine', () => {
    let engine;
    const mockDef = {
        id: 'test-runbook',
        name: 'Test Runbook',
        description: 'Test',
        version: '1.0',
        triggers: [],
        inputs: { input1: 'Input 1' },
        outputs: {},
        steps: [
            {
                id: 'step1',
                name: 'Step 1',
                type: 'mock',
                parameters: { param1: '{{inputs.input1}}' }
            }
        ]
    };
    (0, globals_1.beforeEach)(() => {
        engine = new RunbookEngine_js_1.RunbookEngine();
        engine.registerStep('mock', new MockStep());
        engine.registerDefinition(mockDef);
    });
    (0, globals_1.it)('should list definitions', () => {
        const definitions = engine.listDefinitions();
        (0, globals_1.expect)(definitions).toHaveLength(1);
        (0, globals_1.expect)(definitions[0].id).toBe('test-runbook');
    });
    (0, globals_1.it)('should execute a runbook', async () => {
        const runId = await engine.executeRunbook('test-runbook', { input1: 'value1' }, 'user1', 'tenant1');
        (0, globals_1.expect)(runId).toBeDefined();
        // Wait for async execution
        await new Promise(resolve => engine.on('runbookCompleted', resolve));
        const status = engine.getStatus(runId);
        (0, globals_1.expect)(status.logs).toHaveLength(1);
        (0, globals_1.expect)(status.logs[0].stepId).toBe('step1');
        (0, globals_1.expect)(status.logs[0].result.params.param1).toBe('value1');
    });
    (0, globals_1.it)('should interpolate variables correctly', async () => {
        // Tested implicitly in previous test
    });
    (0, globals_1.it)('should handle missing definition', async () => {
        await (0, globals_1.expect)(engine.executeRunbook('missing', {}, 'u', 't')).rejects.toThrow();
    });
});
