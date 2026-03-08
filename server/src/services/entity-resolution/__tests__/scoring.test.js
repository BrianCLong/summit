"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const scoring_js_1 = require("../scoring.js");
(0, globals_1.describe)('ScoringEngine', () => {
    let engine;
    (0, globals_1.beforeEach)(() => {
        engine = new scoring_js_1.ScoringEngine();
    });
    (0, globals_1.it)('should return perfect score for identical entities', () => {
        const e1 = {
            id: '1',
            type: 'Person',
            properties: { name: 'John Doe', email: 'john@example.com', ssn: '123' },
            tenantId: 't1'
        };
        const e2 = {
            id: '2',
            type: 'Person',
            properties: { name: 'John Doe', email: 'john@example.com', ssn: '123' },
            tenantId: 't1'
        };
        const result = engine.calculateScore(e1, e2);
        (0, globals_1.expect)(result.score).toBeGreaterThan(0.99);
        (0, globals_1.expect)(result.reasons.length).toBeGreaterThan(0);
    });
    (0, globals_1.it)('should match on Exact ID', () => {
        const e1 = { id: '1', type: 'P', properties: { ssn: 'ABC' }, tenantId: 't1' };
        const e2 = { id: '2', type: 'P', properties: { ssn: 'ABC', name: 'Different' }, tenantId: 't1' };
        const result = engine.calculateScore(e1, e2);
        (0, globals_1.expect)(result.score).toBe(1.0);
        (0, globals_1.expect)(result.features.find(f => f.name === 'exactId')).toBeDefined();
    });
    (0, globals_1.it)('should match on normalized email', () => {
        const e1 = { id: '1', type: 'P', properties: { email: 'JOHN@EXAMPLE.COM' }, tenantId: 't1' };
        const e2 = { id: '2', type: 'P', properties: { email: 'john@example.com' }, tenantId: 't1' };
        const result = engine.calculateScore(e1, e2);
        (0, globals_1.expect)(result.score).toBe(1.0);
        (0, globals_1.expect)(result.features.find(f => f.name === 'email')).toBeDefined();
    });
    (0, globals_1.it)('should handle fuzzy name matching', () => {
        const e1 = { id: '1', type: 'P', properties: { name: 'Jonathan Doe' }, tenantId: 't1' };
        const e2 = { id: '2', type: 'P', properties: { name: 'Jonathon Doe' }, tenantId: 't1' };
        const result = engine.calculateScore(e1, e2);
        (0, globals_1.expect)(result.score).toBeGreaterThan(0.8);
        (0, globals_1.expect)(result.features.find(f => f.name === 'name')).toBeDefined();
    });
    (0, globals_1.it)('should return 0 for totally different entities', () => {
        const e1 = { id: '1', type: 'P', properties: { name: 'Alice', email: 'a@a.com' }, tenantId: 't1' };
        const e2 = { id: '2', type: 'P', properties: { name: 'Bob', email: 'b@b.com' }, tenantId: 't1' };
        const result = engine.calculateScore(e1, e2);
        (0, globals_1.expect)(result.score).toBeLessThan(0.5);
    });
});
