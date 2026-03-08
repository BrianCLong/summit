"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const microindex_js_1 = require("../microindex.js");
const psid_js_1 = require("../psid.js");
(0, globals_1.describe)('Policy-Compiled Micro-Index', () => {
    const baseSubjectBucket = {
        roles: ['secops', 'analyst'],
        attributes: { region: 'us', clearance: 3 },
    };
    const baseScope = {
        tenant: 't1',
        purpose: 'incident_response',
        policyVersion: 'p1',
        schemaVersion: 's1',
        subjectBucket: baseSubjectBucket,
    };
    const authorized = {
        documents: [
            {
                id: 'doc-1',
                text: 'malware detected in us region',
                embedding: [0.2, 0.1, 0.7],
                metadata: { sensitivity: 'low' },
            },
            {
                id: 'doc-2',
                text: 'incident response playbook for rce',
                embedding: [0.5, 0.5, 0.1],
                metadata: { sensitivity: 'medium' },
            },
        ],
        nodes: [
            { id: 'node-1', embedding: [0.1, 0.3, 0.4], metadata: { type: 'host' } },
            { id: 'node-2', embedding: [0.4, 0.6, 0.2], metadata: { type: 'alert' } },
        ],
        edges: [
            { from: 'doc-1', to: 'node-1', type: 'references' },
            { from: 'node-1', to: 'node-2', type: 'alerts' },
        ],
        redactionProfile: { mode: 'mask', fields: ['user'] },
    };
    const budgets = {
        vectorK: 5,
        lexK: 5,
        maxHops: 2,
        maxExpansions: 10,
    };
    const queryEmbedding = [0.2, 0.2, 0.6];
    (0, globals_1.it)('computes deterministic PSIDs for the same normalized scope', () => {
        const shuffledScope = {
            ...baseScope,
            subjectBucket: {
                roles: ['analyst', 'secops'],
                attributes: { clearance: 3, region: 'us' },
            },
        };
        const first = (0, psid_js_1.computePolicyScopeId)(baseScope);
        const second = (0, psid_js_1.computePolicyScopeId)(shuffledScope);
        const bumpedPolicy = (0, psid_js_1.computePolicyScopeId)({ ...baseScope, policyVersion: 'p2' });
        (0, globals_1.expect)(first).toEqual(second);
        (0, globals_1.expect)(bumpedPolicy).not.toEqual(first);
    });
    (0, globals_1.it)('builds a micro-index with a seal and enforces adjacency-bounded retrieval', () => {
        const microIndex = (0, microindex_js_1.buildMicroIndex)(baseScope, authorized);
        const response = (0, microindex_js_1.queryMicroIndex)(microIndex, 'incident response', queryEmbedding, budgets, 1337, 2);
        (0, globals_1.expect)(response.audit.psid).toEqual((0, psid_js_1.computePolicyScopeId)(baseScope));
        (0, globals_1.expect)(response.audit.seal.objectSetHash).toBeDefined();
        (0, globals_1.expect)(response.evidence.length).toBeGreaterThan(0);
        const traversed = response.evidence.map((item) => item.id);
        (0, globals_1.expect)(traversed.every((id) => microIndex.adjacency.has(id) || microIndex.metadata.has(id))).toBe(true);
    });
    (0, globals_1.it)('applies deltas and preserves deterministic seals', () => {
        const microIndex = (0, microindex_js_1.buildMicroIndex)(baseScope, authorized);
        const deltaIndex = (0, microindex_js_1.applyDelta)(microIndex, {
            operation: 'insert',
            document: {
                id: 'doc-3',
                text: 'graph enrichment guide',
                embedding: [0.3, 0.5, 0.6],
                metadata: { sensitivity: 'low' },
            },
        });
        const response = (0, microindex_js_1.queryMicroIndex)(deltaIndex, 'graph enrichment', [0.3, 0.4, 0.6], budgets, 99, 3);
        (0, globals_1.expect)(deltaIndex.deltaLog).toHaveLength(1);
        (0, globals_1.expect)(deltaIndex.seal.objectSetHash).not.toEqual(microIndex.seal.objectSetHash);
        (0, globals_1.expect)(response.evidence.some((item) => item.id === 'doc-3')).toBe(true);
    });
});
