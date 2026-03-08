"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const ga_guard_js_1 = require("../ga-guard.js");
(0, globals_1.describe)('GA WebSocket Guard', () => {
    test('BLOCKS messages containing PII', () => {
        const result = (0, ga_guard_js_1.checkCounterGate)({
            type: 'counter',
            pii: true
        });
        (0, globals_1.expect)(result.allowed).toBe(false);
        (0, globals_1.expect)(result.action).toBe('BLOCK');
        (0, globals_1.expect)(result.reason).toContain('PII');
    });
    test('BLOCKS unsafe modes', () => {
        const result = (0, ga_guard_js_1.checkCounterGate)({
            type: 'counter',
            mode: 'attack_mode',
            human_approved: true
        });
        (0, globals_1.expect)(result.allowed).toBe(false);
        (0, globals_1.expect)(result.action).toBe('BLOCK');
        (0, globals_1.expect)(result.reason).toContain('unsafe mode');
    });
    test('HOLDS messages without human approval', () => {
        const result = (0, ga_guard_js_1.checkCounterGate)({
            type: 'counter',
            mode: 'prebunk',
            human_approved: false
        });
        (0, globals_1.expect)(result.allowed).toBe(false);
        (0, globals_1.expect)(result.action).toBe('HOLD');
        (0, globals_1.expect)(result.reason).toContain('needs human approval');
    });
    test('ALLOWS safe mode with human approval', () => {
        const result = (0, ga_guard_js_1.checkCounterGate)({
            type: 'counter',
            mode: 'prebunk',
            human_approved: true
        });
        (0, globals_1.expect)(result.allowed).toBe(true);
    });
    test('ALLOWS valid cred_bridge mode', () => {
        const result = (0, ga_guard_js_1.checkCounterGate)({
            type: 'counter',
            mode: 'cred_bridge',
            human_approved: true
        });
        (0, globals_1.expect)(result.allowed).toBe(true);
    });
    test('ALLOWS valid myth_card mode', () => {
        const result = (0, ga_guard_js_1.checkCounterGate)({
            type: 'counter',
            mode: 'myth_card',
            human_approved: true
        });
        (0, globals_1.expect)(result.allowed).toBe(true);
    });
});
