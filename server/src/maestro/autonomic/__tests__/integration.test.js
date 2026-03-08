"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const index_js_1 = require("../index.js");
const types_js_1 = require("../signals/types.js");
(0, globals_1.describe)('AutonomicLayer Integration', () => {
    let layer;
    (0, globals_1.beforeEach)(() => {
        layer = new index_js_1.AutonomicLayer();
        globals_1.jest.useFakeTimers();
    });
    (0, globals_1.afterEach)(() => {
        layer.stop();
        globals_1.jest.useRealTimers();
    });
    (0, globals_1.it)('should run control loops and execute governed plans', async () => {
        // 1. Setup: Register a contract
        layer.policy.registerContract({
            id: 'c1',
            tenantId: 'system',
            tiers: 'GOLD',
            slos: [{
                    id: 'slo-1',
                    name: 'No Errors',
                    targetType: types_js_1.SignalType.TASK_FAILURE_COUNT,
                    targetValue: 0,
                    comparator: '<=',
                    window: '5m',
                    errorBudgetStartingPoints: 0, // Fail immediately
                    burnRatePerViolation: 1
                }]
        });
        // 2. Inject Failure Signal
        layer.signals.ingestSignal({
            type: types_js_1.SignalType.TASK_FAILURE_COUNT,
            value: 1,
            sourceId: 'system-core',
            tenantId: 'system',
            metadata: { scope: 'SYSTEM' }
        });
        // 3. Spy on execute of ReliabilityLoop (which is the first loop usually)
        // Hard to spy on internal array, so we spy on console for this integration test
        const logSpy = globals_1.jest.spyOn(console, 'log').mockImplementation(() => { });
        // 4. Run Loop
        await layer.runControlLoops();
        // 5. Verify
        // ReliabilityLoop should see BUDGET_EXHAUSTED -> Plan THROTTLE_QUEUE
        // Governance should see THROTTLE_QUEUE -> APPROVED
        // Loop should execute -> Console log
        (0, globals_1.expect)(logSpy).toHaveBeenCalledWith(globals_1.expect.stringContaining('[ReliabilityLoop] Executing plan'));
        (0, globals_1.expect)(logSpy).toHaveBeenCalledWith(globals_1.expect.stringContaining('THROTTLE_QUEUE'));
        logSpy.mockRestore();
    });
});
