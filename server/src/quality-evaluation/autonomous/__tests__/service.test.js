"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const service_js_1 = require("../service.js");
const types_js_1 = require("../types.js");
(0, globals_1.describe)('AutonomousEvaluationService', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        service = new service_js_1.AutonomousEvaluationService();
    });
    // Epic 1: Evaluation Capability Taxonomy
    (0, globals_1.it)('should register default capabilities correctly', () => {
        const cap = service.getCapability(types_js_1.EvaluationCapabilityType.TEST_GENERATION);
        (0, globals_1.expect)(cap).toBeDefined();
        (0, globals_1.expect)(cap?.prohibitedActions).toContain(types_js_1.ProhibitedActionType.SELF_APPROVAL);
    });
    // Epic 2: Bounded Self-Testing Harness
    (0, globals_1.it)('should enforce timeout constraints', async () => {
        const request = {
            traceId: 'test-1',
            agentId: 'agent-1',
            capability: types_js_1.EvaluationCapabilityType.STATIC_ANALYSIS,
            target: 'some code',
            criteria: [{
                    id: 'crit-1',
                    description: 'Exists',
                    logic: 'exists',
                    isStatic: true
                }],
            constraints: {
                timeoutMs: 35000, // Exceeds 30s limit
                maxSteps: 10,
                memoryLimitMb: 128
            }
        };
        // The validation happens inside service.evaluate -> schema validation
        await (0, globals_1.expect)(service.evaluate(request)).rejects.toThrow();
    });
    (0, globals_1.it)('should run evaluation and return advisory report', async () => {
        const request = {
            traceId: 'test-2',
            agentId: 'agent-1',
            capability: types_js_1.EvaluationCapabilityType.STATIC_ANALYSIS,
            target: 'some code',
            criteria: [{
                    id: 'crit-1',
                    description: 'Length check',
                    logic: 'maxLength 20',
                    isStatic: true
                }],
            constraints: {
                timeoutMs: 1000,
                maxSteps: 10,
                memoryLimitMb: 128
            }
        };
        const report = await service.evaluate(request);
        (0, globals_1.expect)(report.isAdvisory).toBe(true);
        (0, globals_1.expect)(report.criteriaResults[0].passed).toBe(true);
    });
    // Epic 3: Evaluation Criteria Transparency
    (0, globals_1.it)('should reject requests without criteria', async () => {
        const request = {
            traceId: 'test-3',
            agentId: 'agent-1',
            capability: types_js_1.EvaluationCapabilityType.STATIC_ANALYSIS,
            target: 'some code',
            constraints: { timeoutMs: 1000, maxSteps: 10, memoryLimitMb: 128 }
        };
        await (0, globals_1.expect)(service.evaluate(request)).rejects.toThrow();
    });
    // Epic 5: Threat Modeling
    (0, globals_1.it)('should handle evaluation failures gracefully', async () => {
        // A request that fails the criteria
        const request = {
            traceId: 'test-4',
            agentId: 'agent-1',
            capability: types_js_1.EvaluationCapabilityType.STATIC_ANALYSIS,
            target: 'very long string that exceeds the max length of 10',
            criteria: [{
                    id: 'crit-1',
                    description: 'Length check',
                    logic: 'maxLength 10',
                    isStatic: true
                }],
            constraints: {
                timeoutMs: 1000,
                maxSteps: 10,
                memoryLimitMb: 128
            }
        };
        const report = await service.evaluate(request);
        (0, globals_1.expect)(report.criteriaResults[0].passed).toBe(false);
        (0, globals_1.expect)(report.isAdvisory).toBe(true);
    });
});
