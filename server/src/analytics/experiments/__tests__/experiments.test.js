"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const ExperimentService_js_1 = require("../ExperimentService.js");
(0, globals_1.describe)('ExperimentService', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        service = new ExperimentService_js_1.ExperimentService({ salt: 'test-salt' });
    });
    const sampleExp = {
        id: 'exp-1',
        owner: 'jules',
        hypothesis: 'dark mode increases retention',
        variants: [
            { id: 'control', name: 'Light Mode', weight: 50 },
            { id: 'treatment', name: 'Dark Mode', weight: 50 },
        ],
        allocation: 100, // 100% of users
        startDate: new Date().toISOString(),
        status: 'active',
    };
    (0, globals_1.it)('should create and retrieve experiment', () => {
        service.createExperiment(sampleExp);
        const retrieved = service.getExperiment('exp-1');
        (0, globals_1.expect)(retrieved).toEqual(sampleExp);
    });
    (0, globals_1.it)('should validate weights sum to 100', () => {
        const invalidExp = { ...sampleExp, id: 'bad', variants: [{ id: 'a', name: 'A', weight: 90 }] };
        (0, globals_1.expect)(() => service.createExperiment(invalidExp)).toThrow('weights must sum to 100');
    });
    (0, globals_1.it)('should deterministically assign variants', () => {
        service.createExperiment(sampleExp);
        const tenantId = 't1';
        const userId = 'u1';
        const assignment1 = service.assign('exp-1', tenantId, userId);
        const assignment2 = service.assign('exp-1', tenantId, userId);
        (0, globals_1.expect)(assignment1.variantId).not.toBeNull();
        (0, globals_1.expect)(assignment1.variantId).toBe(assignment2.variantId);
        (0, globals_1.expect)(assignment1.reason).toBe('allocated');
    });
    (0, globals_1.it)('should respect allocation percentage', () => {
        const partialExp = {
            ...sampleExp,
            id: 'exp-partial',
            allocation: 0, // 0% allocation
        };
        service.createExperiment(partialExp);
        const assignment = service.assign('exp-partial', 't1', 'u1');
        (0, globals_1.expect)(assignment.variantId).toBeNull();
        (0, globals_1.expect)(assignment.reason).toBe('exclusion');
    });
    (0, globals_1.it)('should distribute roughly according to weights', () => {
        service.createExperiment(sampleExp);
        const counts = { control: 0, treatment: 0 };
        const N = 1000;
        for (let i = 0; i < N; i++) {
            const userId = `user-${i}`;
            const assignment = service.assign('exp-1', 't1', userId);
            if (assignment.variantId) {
                counts[assignment.variantId]++;
            }
        }
        // With 50/50 split and 1000 users, expect roughly 500 each.
        // Tolerance: +/- 10% (450-550)
        (0, globals_1.expect)(counts.control).toBeGreaterThan(400);
        (0, globals_1.expect)(counts.control).toBeLessThan(600);
        (0, globals_1.expect)(counts.treatment).toBeGreaterThan(400);
        (0, globals_1.expect)(counts.treatment).toBeLessThan(600);
    });
});
