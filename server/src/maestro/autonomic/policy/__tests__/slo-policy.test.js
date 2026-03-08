"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const slo_policy_engine_js_1 = require("../slo-policy-engine.js");
const signals_service_js_1 = require("../../signals/signals-service.js");
const types_js_1 = require("../../signals/types.js");
const types_js_2 = require("../types.js");
(0, globals_1.describe)('SLOPolicyEngine', () => {
    let signalsService;
    let engine;
    (0, globals_1.beforeEach)(() => {
        signalsService = new signals_service_js_1.SignalsService();
        engine = new slo_policy_engine_js_1.SLOPolicyEngine(signalsService);
    });
    (0, globals_1.it)('should detect SLO breach and burn budget', () => {
        const sloId = 'slo-latency-1';
        const contract = {
            id: 'contract-1',
            tenantId: 'tenant-1',
            tiers: 'SILVER',
            slos: [
                {
                    id: sloId,
                    name: 'Latency < 500ms',
                    targetType: types_js_1.SignalType.TASK_LATENCY,
                    targetValue: 500,
                    comparator: '<',
                    window: '5m',
                    errorBudgetStartingPoints: 10,
                    burnRatePerViolation: 5
                }
            ]
        };
        engine.registerContract(contract);
        // Inject failing signal
        signalsService.ingestSignal({
            type: types_js_1.SignalType.TASK_LATENCY,
            value: 600, // Violation
            sourceId: 'system-core',
            tenantId: 'tenant-1',
            metadata: { scope: 'SYSTEM' }
        });
        const alerts = engine.evaluate('tenant-1');
        (0, globals_1.expect)(alerts).toHaveLength(1);
        (0, globals_1.expect)(alerts[0].level).toBe(types_js_2.SLOAlertLevel.BREACH);
        const budget = engine.getBudgetStatus(sloId);
        (0, globals_1.expect)(budget?.remainingPoints).toBe(5);
    });
    (0, globals_1.it)('should trigger exhaust alert when budget is gone', () => {
        const sloId = 'slo-fail-1';
        const contract = {
            id: 'contract-2',
            tenantId: 'tenant-2',
            tiers: 'GOLD',
            slos: [
                {
                    id: sloId,
                    name: 'Zero Failures',
                    targetType: types_js_1.SignalType.TASK_FAILURE_COUNT,
                    targetValue: 0,
                    comparator: '<=',
                    window: '5m',
                    errorBudgetStartingPoints: 5,
                    burnRatePerViolation: 10 // Instant exhaust
                }
            ]
        };
        engine.registerContract(contract);
        signalsService.ingestSignal({
            type: types_js_1.SignalType.TASK_FAILURE_COUNT,
            value: 1,
            sourceId: 'system-core',
            tenantId: 'tenant-2',
            metadata: { scope: 'SYSTEM' }
        });
        const alerts = engine.evaluate('tenant-2');
        (0, globals_1.expect)(alerts).toHaveLength(1);
        (0, globals_1.expect)(alerts[0].level).toBe(types_js_2.SLOAlertLevel.BUDGET_EXHAUSTED);
        (0, globals_1.expect)(engine.getBudgetStatus(sloId)?.status).toBe('EXHAUSTED');
    });
});
