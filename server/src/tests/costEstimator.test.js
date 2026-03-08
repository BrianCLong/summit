"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const costEstimator_js_1 = require("../nl2cypher/costEstimator.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('cost estimator', () => {
    (0, globals_1.it)('assigns higher cost for filtered queries', () => {
        (0, globals_1.expect)((0, costEstimator_js_1.estimateCost)({ type: 'find', label: 'Person', filter: null })).toBe(1);
        (0, globals_1.expect)((0, costEstimator_js_1.estimateCost)({
            type: 'find',
            label: 'Person',
            filter: { property: 'name', value: 'Alice' },
        })).toBe(2);
        (0, globals_1.expect)((0, costEstimator_js_1.estimateCost)({ type: 'count', label: 'Person', filter: null })).toBe(1);
        (0, globals_1.expect)((0, costEstimator_js_1.estimateCost)({
            type: 'count',
            label: 'Person',
            filter: { property: 'name', value: 'Alice' },
        })).toBe(2);
    });
});
