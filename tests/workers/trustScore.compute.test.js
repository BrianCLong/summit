"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const trustScore_1 = require("../../server/src/workers/trustScore");
describe('computeTrustScore', () => {
    it('penalizes recent high severity signals', () => {
        const now = new Date().toISOString();
        const signals = [
            { severity: 'LOW', created_at: now },
            { severity: 'HIGH', created_at: now },
            { severity: 'CRITICAL', created_at: now },
        ];
        const score = (0, trustScore_1.computeTrustScore)(0.9, signals);
        expect(score).toBeLessThan(0.9);
        expect(score).toBeGreaterThan(0); // bounded
    });
});
