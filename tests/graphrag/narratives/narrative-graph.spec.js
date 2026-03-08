"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const narratives_1 = require("../../../server/src/graphrag/narratives");
const ontology_1 = require("../../../server/src/graphrag/ontology");
describe('NarrativeGraphStore', () => {
    let store;
    beforeEach(() => {
        store = new narratives_1.NarrativeGraphStore();
    });
    it('should upsert nodes (stub)', async () => {
        const node = {
            id: 'narr-001',
            type: ontology_1.NodeType.Narrative,
            properties: { title: 'Test Narrative' },
        };
        await expect(store.upsertNode(node)).resolves.not.toThrow();
    });
    it('should upsert edges (stub)', async () => {
        const edge = {
            sourceId: 'narr-001',
            targetId: 'claim-001',
            type: ontology_1.EdgeType.REFERENCES,
            properties: {},
        };
        await expect(store.upsertEdge(edge)).resolves.not.toThrow();
    });
    it('should build impact hypothesis (stub)', async () => {
        const hypothesis = await store.buildImpactHypothesis('narr-001');
        expect(hypothesis).toBeDefined();
        expect(hypothesis.narrativeId).toBe('narr-001');
    });
});
