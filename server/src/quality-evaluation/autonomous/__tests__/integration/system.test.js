"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const service_js_1 = require("../../service.js");
const types_js_1 = require("../../types.js");
(0, globals_1.describe)('Autonomous Evaluation System Integration', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        service = new service_js_1.AutonomousEvaluationService();
    });
    (0, globals_1.it)('should complete a full evaluation lifecycle', async () => {
        // 1. Agent requests evaluation
        const request = {
            traceId: 'int-1',
            agentId: 'agent-1',
            capability: types_js_1.EvaluationCapabilityType.STATIC_ANALYSIS,
            target: 'const x = 1;',
            criteria: [
                {
                    id: 'c1',
                    description: 'Contains variable declaration',
                    logic: 'contains const',
                    isStatic: true
                },
                {
                    id: 'c2',
                    description: 'Short length',
                    logic: 'maxLength 50',
                    isStatic: true
                }
            ],
            constraints: {
                timeoutMs: 5000,
                maxSteps: 50,
                memoryLimitMb: 128
            }
        };
        // 2. Service processes request
        const report = await service.evaluate(request);
        // 3. Verify Report Structure (Epic 4)
        (0, globals_1.expect)(report.id).toBeDefined();
        (0, globals_1.expect)(report.isAdvisory).toBe(true);
        (0, globals_1.expect)(report.agentId).toBe('agent-1');
        (0, globals_1.expect)(report.criteriaResults).toHaveLength(2);
        // 4. Verify Results
        (0, globals_1.expect)(report.criteriaResults.find(r => r.criteriaId === 'c1')?.passed).toBe(true);
        (0, globals_1.expect)(report.criteriaResults.find(r => r.criteriaId === 'c2')?.passed).toBe(true);
        // 5. Verify Stats (Epic 2)
        (0, globals_1.expect)(report.executionStats.durationMs).toBeGreaterThan(0);
    });
});
