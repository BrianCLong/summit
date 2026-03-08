"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DeliberationEngine_js_1 = require("../DeliberationEngine.js");
const answering_js_1 = require("../../policies/answering.js");
describe('Deliberation & Answering', () => {
    const mockExplanation = (id) => ({
        id,
        seedEntities: ['s1'],
        discoverySubgraphRef: 'ref',
        rationale: 'test'
    });
    const mockProof = (edgeCount, divCount) => ({
        nodes: Array.from({ length: divCount }, (_, i) => ({
            id: `n${i}`,
            labels: ['Entity'],
            properties: {},
            provenance: `EVID-${i}`
        })),
        edges: Array.from({ length: edgeCount }, (_, i) => ({
            type: 'LINK',
            sourceId: 's',
            targetId: 't',
            properties: {}
        }))
    });
    test('DeliberationEngine should select most robust explanation', () => {
        const c1 = { explanation: mockExplanation('c1'), proof: mockProof(5, 2) }; // robust
        const c2 = { explanation: mockExplanation('c2'), proof: mockProof(1, 1) }; // weak
        const result = DeliberationEngine_js_1.DeliberationEngine.deliberate([c1, c2]);
        expect(result.selectedExplanation.id).toBe('c1');
        expect(result.rejectedExplanations.length).toBe(1);
        expect(result.rejectedExplanations[0].explanation.id).toBe('c2');
    });
    test('AnsweringPolicy should refuse if robustness is too low', () => {
        const policy = new answering_js_1.AnsweringPolicy({ minRobustness: 10, minEvidenceDiversity: 2 });
        const weakResult = DeliberationEngine_js_1.DeliberationEngine.deliberate([
            { explanation: mockExplanation('weak'), proof: mockProof(1, 1) }
        ]);
        const decision = policy.shouldRefuse(weakResult);
        expect(decision.refuse).toBe(true);
        expect(decision.reason).toContain('Insufficient robustness');
    });
    test('AnsweringPolicy should allow if criteria are met', () => {
        const policy = new answering_js_1.AnsweringPolicy({ minRobustness: 0.5, minEvidenceDiversity: 1 });
        const strongResult = DeliberationEngine_js_1.DeliberationEngine.deliberate([
            { explanation: mockExplanation('strong'), proof: mockProof(10, 5) }
        ]);
        const decision = policy.shouldRefuse(strongResult);
        expect(decision.refuse).toBe(false);
    });
});
