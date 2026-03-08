"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const computeMetrics_1 = require("../pipeline/computeMetrics");
describe('computeDivergenceMetrics', () => {
    it('emits divergence score when type is contradicts', () => {
        const asOf = new Date().toISOString();
        const out = (0, computeMetrics_1.computeDivergenceMetrics)([
            {
                id: 'link_1234',
                narrativeId: 'narrative_1',
                claimId: 'claim_1',
                type: 'contradicts',
                score: 0.8,
                observedAt: asOf,
                provenance: { artifactIds: [] },
            },
        ], asOf);
        expect(out[0]?.divergenceScore).toBeCloseTo(0.8);
    });
});
