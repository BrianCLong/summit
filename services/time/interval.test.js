"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const interval_js_1 = require("./interval.js");
describe('Temporal interval helpers', () => {
    const a = {
        validFrom: new Date('2024-01-01'),
        validTo: new Date('2024-02-01'),
    };
    const b = {
        validFrom: new Date('2024-02-01'),
        validTo: new Date('2024-03-01'),
    };
    test('non-overlapping intervals', () => {
        expect((0, interval_js_1.overlaps)(a, b)).toBe(false);
        expect((0, interval_js_1.isConsistent)([a], b)).toBe(true);
    });
});
