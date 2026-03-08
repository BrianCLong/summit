"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const engine_js_1 = require("../../src/governance/engine.js");
describe('Tool Gate Governance', () => {
    it('should deny by default when score is below threshold', () => {
        const engine = new engine_js_1.GovernanceEngine([{ id: 'mock', effect: 'deny', condition: { minRewardScore: 0.8 } }]);
        const decision = engine.evaluate('test-1', 0.5, 1.0);
        expect(decision.effect).toBe('deny');
    });
});
