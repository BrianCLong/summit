"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const policy_1 = require("../src/policy");
describe('UI Automation Policy', () => {
    it('should validate default policy', () => {
        expect((0, policy_1.validatePolicy)(policy_1.DEFAULT_POLICY)).toBe(true);
    });
});
