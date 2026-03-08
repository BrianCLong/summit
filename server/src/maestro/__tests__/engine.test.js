"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const dsl_js_1 = require("../dsl.js");
(0, globals_1.describe)('MaestroDSL', () => {
    (0, globals_1.it)('should validate a simple DAG', () => {
        const spec = {
            nodes: [
                { id: '1', kind: 'task', ref: 'a' },
                { id: '2', kind: 'task', ref: 'b' }
            ],
            edges: [
                { from: '1', to: '2' }
            ]
        };
        (0, globals_1.expect)(dsl_js_1.MaestroDSL.validate(spec).valid).toBe(true);
    });
    (0, globals_1.it)('should detect cycles', () => {
        const spec = {
            nodes: [
                { id: '1', kind: 'task', ref: 'a' },
                { id: '2', kind: 'task', ref: 'b' }
            ],
            edges: [
                { from: '1', to: '2' },
                { from: '2', to: '1' }
            ]
        };
        (0, globals_1.expect)(dsl_js_1.MaestroDSL.validate(spec).valid).toBe(false);
    });
});
