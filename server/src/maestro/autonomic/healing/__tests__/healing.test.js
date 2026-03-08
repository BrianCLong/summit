"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const healing_executor_js_1 = require("../healing-executor.js");
const types_js_1 = require("../../signals/types.js");
(0, globals_1.describe)('HealingExecutor', () => {
    let executor;
    (0, globals_1.beforeEach)(() => {
        executor = new healing_executor_js_1.HealingExecutor();
    });
    (0, globals_1.it)('should trigger playbook when conditions met', async () => {
        const playbook = {
            id: 'pb-retry',
            name: 'Retry High Latency',
            scope: 'TASK',
            triggers: [{ signalType: types_js_1.SignalType.TASK_LATENCY, operator: 'GT', value: 1000 }],
            actions: [{ type: 'RETRY', params: { backoff: 'exponential' } }],
            cooldownMs: 0
        };
        executor.registerPlaybook(playbook);
        // Spy on console to verify execution or mock runAction if we refactor to allow injection
        const consoleSpy = globals_1.jest.spyOn(console, 'log').mockImplementation(() => { });
        await executor.evaluateAndExecute([{
                type: types_js_1.SignalType.TASK_LATENCY,
                value: 1500,
                sourceId: 't1',
                tenantId: 'tn1',
                timestamp: new Date(),
                metadata: {},
                id: 's1'
            }]);
        (0, globals_1.expect)(consoleSpy).toHaveBeenCalledWith(globals_1.expect.stringContaining('[Healing] Executing Playbook: Retry High Latency'));
        (0, globals_1.expect)(consoleSpy).toHaveBeenCalledWith(globals_1.expect.stringContaining('Retrying task with backoff'));
        consoleSpy.mockRestore();
    });
    (0, globals_1.it)('should respect cooldown', async () => {
        const playbook = {
            id: 'pb-cooldown',
            name: 'Cooldown Test',
            scope: 'TASK',
            triggers: [{ signalType: types_js_1.SignalType.TASK_FAILURE_COUNT, operator: 'GT', value: 0 }],
            actions: [{ type: 'ALERT', params: {} }],
            cooldownMs: 5000
        };
        executor.registerPlaybook(playbook);
        const consoleSpy = globals_1.jest.spyOn(console, 'log').mockImplementation(() => { });
        const signal = {
            type: types_js_1.SignalType.TASK_FAILURE_COUNT,
            value: 1,
            sourceId: 't1',
            tenantId: 'tn1',
            timestamp: new Date(),
            metadata: {},
            id: 's1'
        };
        // First run
        await executor.evaluateAndExecute([signal]);
        (0, globals_1.expect)(consoleSpy).toHaveBeenCalledTimes(2); // Header + Action
        consoleSpy.mockClear();
        // Immediate second run (should be ignored)
        await executor.evaluateAndExecute([signal]);
        (0, globals_1.expect)(consoleSpy).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});
