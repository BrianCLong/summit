"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const types_js_1 = require("../src/canonical/types.js");
(0, globals_1.describe)('Canonical Data Model', () => {
    (0, globals_1.describe)('Temporal Logic', () => {
        const entity = {
            validFrom: new Date('2023-01-01'),
            validTo: new Date('2023-12-31'),
            observedAt: new Date('2023-01-02'),
            recordedAt: new Date('2023-01-02'),
        };
        test('isValidAt correctly identifies valid periods', () => {
            (0, globals_1.expect)((0, types_js_1.isValidAt)(entity, new Date('2023-06-01'))).toBe(true);
            (0, globals_1.expect)((0, types_js_1.isValidAt)(entity, new Date('2022-12-31'))).toBe(false); // Before validFrom
            (0, globals_1.expect)((0, types_js_1.isValidAt)(entity, new Date('2024-01-01'))).toBe(false); // After validTo
        });
        test('isValidAt handles open-ended validTo', () => {
            const openEntity = { ...entity, validTo: null };
            (0, globals_1.expect)((0, types_js_1.isValidAt)(openEntity, new Date('2025-01-01'))).toBe(true);
        });
        test('wasKnownAt correctly identifies knowledge time', () => {
            (0, globals_1.expect)((0, types_js_1.wasKnownAt)(entity, new Date('2023-01-03'))).toBe(true);
            (0, globals_1.expect)((0, types_js_1.wasKnownAt)(entity, new Date('2023-01-01'))).toBe(false); // Before recordedAt
        });
    });
    (0, globals_1.describe)('Policy Labels', () => {
        // Check if types are importable and structure is correct
        // (Mostly static analysis in TS, but we can check runtime object creation)
        test('Can create object with policy labels', () => {
            const policy = {
                sensitivity: 'top_secret',
                needToKnow: ['operation_omega']
            };
            (0, globals_1.expect)(policy.sensitivity).toBe('top_secret');
        });
    });
});
