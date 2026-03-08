"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const engine_js_1 = require("../../src/governance/engine.js");
describe('Reward Hacking Mitigation', () => {
    it('should block high score if coverage is low', () => {
        const engine = new engine_js_1.GovernanceEngine([{ id: 'mock', effect: 'deny', condition: { minRubricCoverage: 0.9 } }]);
        const decision = engine.evaluate('test-2', 0.99, 0.5);
        expect(decision.effect).toBe('deny');
    });
});
