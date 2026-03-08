"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const store_1 = require("./store");
describe('hypothesis store', () => {
    it('updates with evidence weight', () => {
        const store = (0, store_1.createHypothesisStore)();
        store.addHypothesis({
            id: 'h1',
            text: 'test',
            prior: 0.5,
            evidence: [],
            residualUnknowns: [],
            dissent: [],
        });
        store.addEvidence('h1', {
            id: 'e1',
            description: 'supporting',
            cited: true,
            weight: 3,
        });
        expect(store.hypotheses[0].posterior).toBeCloseTo(0.75, 5);
    });
});
