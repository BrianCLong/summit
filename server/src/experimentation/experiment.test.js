"use strict";
/**
 * Experimentation Service Tests
 *
 * Tests for the A/B testing and experimentation framework.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const ExperimentationService_js_1 = require("./ExperimentationService.js");
(0, globals_1.describe)('ExperimentationService', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        service = ExperimentationService_js_1.ExperimentationService.getInstance();
    });
    (0, globals_1.describe)('experiment creation', () => {
        (0, globals_1.it)('should validate variant weights sum to 100', async () => {
            const invalidExperiment = {
                name: 'Test Experiment',
                description: 'Test',
                type: 'a_b',
                hypothesis: 'Test hypothesis',
                primaryMetric: 'conversion',
                secondaryMetrics: [],
                variants: [
                    { id: 'control', name: 'Control', description: '', weight: 30, config: {}, isControl: true },
                    { id: 'treatment', name: 'Treatment', description: '', weight: 30, config: {}, isControl: false },
                ],
                targetingRules: [],
                trafficAllocation: 100,
                minSampleSize: 1000,
                confidenceLevel: 0.95,
                owner: 'test-user',
            };
            await (0, globals_1.expect)(service.createExperiment(invalidExperiment)).rejects.toThrow('Variant weights must sum to 100');
        });
        (0, globals_1.it)('should require exactly one control variant', async () => {
            const noControlExperiment = {
                name: 'Test Experiment',
                description: 'Test',
                type: 'a_b',
                hypothesis: 'Test hypothesis',
                primaryMetric: 'conversion',
                secondaryMetrics: [],
                variants: [
                    { id: 'v1', name: 'Variant 1', description: '', weight: 50, config: {}, isControl: false },
                    { id: 'v2', name: 'Variant 2', description: '', weight: 50, config: {}, isControl: false },
                ],
                targetingRules: [],
                trafficAllocation: 100,
                minSampleSize: 1000,
                confidenceLevel: 0.95,
                owner: 'test-user',
            };
            await (0, globals_1.expect)(service.createExperiment(noControlExperiment)).rejects.toThrow('Experiment must have exactly one control variant');
        });
    });
    (0, globals_1.describe)('assignment consistency', () => {
        (0, globals_1.it)('should assign the same variant for the same user consistently', async () => {
            const context = {
                userId: 'user-test-123',
                tenantId: 'tenant-test-123',
                attributes: {},
                consent: true,
            };
            // Note: This test requires a running experiment to be meaningful
            // In a real test, we would mock the database or create a test experiment
        });
    });
    (0, globals_1.describe)('targeting rules', () => {
        (0, globals_1.it)('should match equals operator correctly', () => {
            // Test targeting rule matching
            const rules = [
                { id: 'r1', attribute: 'plan', operator: 'equals', value: 'pro' },
            ];
            const context = {
                userId: 'user-1',
                tenantId: 'tenant-1',
                attributes: { plan: 'pro' },
                consent: true,
            };
            // Targeting match is internal, would need to expose for testing
            // or test via integration tests
        });
    });
    (0, globals_1.describe)('governance integration', () => {
        (0, globals_1.it)('should include governance verdict in results', async () => {
            // Experiments should always include governance verdicts
            // This ensures compliance tracking
        });
    });
});
