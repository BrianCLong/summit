"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const service_js_1 = require("../service.js");
const budget_manager_js_1 = require("../budget-manager.js");
// Mock dependencies
globals_1.jest.mock('../../MaestroService', () => ({
    maestroService: {
        logAudit: globals_1.jest.fn().mockReturnValue(Promise.resolve(undefined))
    }
}));
(0, globals_1.describe)('Coordination System', () => {
    const schema = {
        version: '1.0',
        name: 'Test Schema',
        roles: ['COORDINATOR', 'WORKER'],
        allowedTransitions: []
    };
    const budget = {
        totalSteps: 5,
        totalTokens: 1000,
        wallClockTimeMs: 10000
    };
    let coordinationId;
    (0, globals_1.beforeEach)(() => {
        // Reset budget manager state if needed, but it's a singleton in-memory map.
        // Ideally we would have a reset method, but for now we rely on new IDs.
    });
    test('should start coordination and initialize budget', () => {
        coordinationId = service_js_1.coordinationService.startCoordination('agent-1', schema, budget);
        (0, globals_1.expect)(coordinationId).toBeDefined();
        const context = budget_manager_js_1.budgetManager.get(coordinationId);
        (0, globals_1.expect)(context).toBeDefined();
        (0, globals_1.expect)(context?.budget).toEqual(budget);
        (0, globals_1.expect)(context?.status).toBe('ACTIVE');
    });
    test('should enforce budget limits (steps)', () => {
        coordinationId = service_js_1.coordinationService.startCoordination('agent-1', schema, budget);
        // Consume up to limit
        service_js_1.coordinationService.consumeBudget(coordinationId, { totalSteps: 4 });
        let check = budget_manager_js_1.budgetManager.checkBudget(coordinationId);
        (0, globals_1.expect)(check.allowed).toBe(true);
        // Exceed limit
        service_js_1.coordinationService.consumeBudget(coordinationId, { totalSteps: 2 });
        check = budget_manager_js_1.budgetManager.checkBudget(coordinationId);
        (0, globals_1.expect)(check.allowed).toBe(false);
        // The reason is 'Context is TERMINATED' because consumeBudget triggers killCoordination
        (0, globals_1.expect)(check.reason).toMatch(/Context is TERMINATED|Step limit exceeded/);
    });
    test('should enforce budget limits (tokens)', () => {
        coordinationId = service_js_1.coordinationService.startCoordination('agent-1', schema, budget);
        // Consume up to limit (1000)
        service_js_1.coordinationService.consumeBudget(coordinationId, { totalTokens: 900 });
        let check = budget_manager_js_1.budgetManager.checkBudget(coordinationId);
        (0, globals_1.expect)(check.allowed).toBe(true);
        // Exceed limit
        service_js_1.coordinationService.consumeBudget(coordinationId, { totalTokens: 200 });
        check = budget_manager_js_1.budgetManager.checkBudget(coordinationId);
        (0, globals_1.expect)(check.allowed).toBe(false);
        (0, globals_1.expect)(check.reason).toMatch(/Context is TERMINATED|Token limit exceeded/);
    });
    test('should kill coordination on budget exhaustion', () => {
        coordinationId = service_js_1.coordinationService.startCoordination('agent-1', schema, budget);
        // Trigger kill by consuming too much via service
        // Note: consumeBudget in service checks AFTER consumption
        service_js_1.coordinationService.consumeBudget(coordinationId, { totalSteps: 6 });
        const context = budget_manager_js_1.budgetManager.get(coordinationId);
        (0, globals_1.expect)(context?.status).toBe('TERMINATED');
        (0, globals_1.expect)(context?.terminationReason).toBe('Step limit exceeded');
    });
    test('should enforce role validation', () => {
        coordinationId = service_js_1.coordinationService.startCoordination('agent-1', schema, budget);
        // agent-1 is COORDINATOR by default
        (0, globals_1.expect)(service_js_1.coordinationService.validateAction(coordinationId, 'agent-1', 'COORDINATOR')).toBe(true);
        (0, globals_1.expect)(service_js_1.coordinationService.validateAction(coordinationId, 'agent-1', 'WORKER')).toBe(false);
    });
    test('should propagate kill switch', () => {
        coordinationId = service_js_1.coordinationService.startCoordination('agent-1', schema, budget);
        service_js_1.coordinationService.killCoordination(coordinationId, 'Manual Stop');
        const context = budget_manager_js_1.budgetManager.get(coordinationId);
        (0, globals_1.expect)(context?.status).toBe('TERMINATED');
        // Further actions should be denied
        const valid = service_js_1.coordinationService.validateAction(coordinationId, 'agent-1', 'COORDINATOR');
        (0, globals_1.expect)(valid).toBe(false);
    });
    test('should prevent invalid role assumption', () => {
        coordinationId = service_js_1.coordinationService.startCoordination('agent-1', schema, budget);
        // Attempt to validate an action for an invalid role 'ROGUE'
        // 'ROGUE' is not in the schema roles ['COORDINATOR', 'WORKER']
        const valid = service_js_1.coordinationService.validateAction(coordinationId, 'rogue-agent', 'ROGUE');
        (0, globals_1.expect)(valid).toBe(false);
        // Verify it wasn't added
        const context = budget_manager_js_1.budgetManager.get(coordinationId);
        (0, globals_1.expect)(context?.roles['rogue-agent']).toBeUndefined();
    });
});
