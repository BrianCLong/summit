"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hub_penalty_1 = require("../../../src/subsumption/claim_level/hub_penalty");
describe('Hub Penalty', () => {
    test('should return 0 penalty for low degree nodes', () => {
        expect((0, hub_penalty_1.calculateHubPenalty)(50, 100)).toBe(0);
        expect((0, hub_penalty_1.calculateHubPenalty)(100, 100)).toBe(0);
    });
    test('should return positive penalty for high degree nodes', () => {
        expect((0, hub_penalty_1.calculateHubPenalty)(110, 100)).toBe(1); // log10(10) = 1
        expect((0, hub_penalty_1.calculateHubPenalty)(1000, 0)).toBe(3); // log10(1000) = 3
    });
    test('should rerank candidates based on penalty', () => {
        const candidates = [
            { id: 'hub', score: 0.9, degree: 1000 }, // Penalty ~3 -> -2.1
            { id: 'leaf', score: 0.8, degree: 10 } // Penalty 0 -> 0.8
        ];
        const reranked = (0, hub_penalty_1.rerankEvidence)(candidates, 1.0);
        expect(reranked[0].id).toBe('leaf');
        expect(reranked[1].id).toBe('hub');
    });
});
