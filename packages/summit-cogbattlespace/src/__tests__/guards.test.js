"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const guards_1 = require("../governance/guards");
describe('enforceAnalyticOnly', () => {
    it('blocks manipulation prompts', () => {
        const result = (0, guards_1.enforceAnalyticOnly)('best message to convince a target audience');
        expect(result.ok).toBe(false);
    });
    it('allows defensive analytics prompts', () => {
        const result = (0, guards_1.enforceAnalyticOnly)('explain why this narrative contradicts an evidence-backed claim');
        expect(result.ok).toBe(true);
    });
});
