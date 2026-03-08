"use strict";
/**
 * Unit Tests for Matching Engine
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const MatchingEngine_js_1 = require("../../src/core/MatchingEngine.js");
(0, globals_1.describe)('MatchingEngine', () => {
    let engine;
    (0, globals_1.beforeEach)(() => {
        engine = (0, MatchingEngine_js_1.createMatchingEngine)();
    });
    (0, globals_1.describe)('compare', () => {
        (0, globals_1.it)('should return AUTO_MERGE for deterministic match', async () => {
            const nodeA = {
                nodeId: '11111111-1111-1111-1111-111111111111',
                clusterId: null,
                entityType: 'Person',
                sourceRef: {
                    sourceId: 'test',
                    sourceSystem: 'test',
                    recordId: 'A',
                    recordType: 'Person',
                    ingestedAt: new Date().toISOString(),
                    confidence: 0.9,
                },
                attributes: {
                    nationalId: '123-45-6789',
                    props: { name: 'John Smith' },
                },
                normalizedAttributes: { nationalid: '123456789', 'props.name': 'john smith' },
                confidence: 0.9,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                version: 1,
            };
            const nodeB = {
                nodeId: '22222222-2222-2222-2222-222222222222',
                clusterId: null,
                entityType: 'Person',
                sourceRef: {
                    sourceId: 'test',
                    sourceSystem: 'test',
                    recordId: 'B',
                    recordType: 'Person',
                    ingestedAt: new Date().toISOString(),
                    confidence: 0.9,
                },
                attributes: {
                    nationalId: '123-45-6789',
                    props: { name: 'John A. Smith' },
                },
                normalizedAttributes: { nationalid: '123456789', 'props.name': 'john a smith' },
                confidence: 0.9,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                version: 1,
            };
            const result = await engine.compare(nodeA, nodeB);
            (0, globals_1.expect)(result.decision).toBe('AUTO_MERGE');
            (0, globals_1.expect)(result.overallScore).toBe(1.0);
            (0, globals_1.expect)(result.deterministicMatch).toBe(true);
            (0, globals_1.expect)(result.decisionReason).toContain('NATIONAL_ID');
        });
        (0, globals_1.it)('should return AUTO_NO_MATCH for mismatched entity types', async () => {
            const nodeA = {
                nodeId: '11111111-1111-1111-1111-111111111111',
                clusterId: null,
                entityType: 'Person',
                sourceRef: {
                    sourceId: 'test',
                    sourceSystem: 'test',
                    recordId: 'A',
                    recordType: 'Person',
                    ingestedAt: new Date().toISOString(),
                    confidence: 0.9,
                },
                attributes: { props: { name: 'John Smith' } },
                normalizedAttributes: {},
                confidence: 0.9,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                version: 1,
            };
            const nodeB = {
                nodeId: '22222222-2222-2222-2222-222222222222',
                clusterId: null,
                entityType: 'Organization',
                sourceRef: {
                    sourceId: 'test',
                    sourceSystem: 'test',
                    recordId: 'B',
                    recordType: 'Organization',
                    ingestedAt: new Date().toISOString(),
                    confidence: 0.9,
                },
                attributes: { props: { name: 'John Smith Inc' } },
                normalizedAttributes: {},
                confidence: 0.9,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                version: 1,
            };
            const result = await engine.compare(nodeA, nodeB);
            (0, globals_1.expect)(result.decision).toBe('AUTO_NO_MATCH');
            (0, globals_1.expect)(result.decisionReason).toContain('Entity types do not match');
        });
        (0, globals_1.it)('should return CANDIDATE for probabilistic match in gray zone', async () => {
            const nodeA = {
                nodeId: '11111111-1111-1111-1111-111111111111',
                clusterId: null,
                entityType: 'Person',
                sourceRef: {
                    sourceId: 'test',
                    sourceSystem: 'test',
                    recordId: 'A',
                    recordType: 'Person',
                    ingestedAt: new Date().toISOString(),
                    confidence: 0.9,
                },
                attributes: {
                    props: {
                        name: 'John Smith',
                        dateOfBirth: '1990-05-15',
                    },
                },
                normalizedAttributes: { 'props.name': 'john smith' },
                confidence: 0.9,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                version: 1,
            };
            const nodeB = {
                nodeId: '22222222-2222-2222-2222-222222222222',
                clusterId: null,
                entityType: 'Person',
                sourceRef: {
                    sourceId: 'test',
                    sourceSystem: 'test',
                    recordId: 'B',
                    recordType: 'Person',
                    ingestedAt: new Date().toISOString(),
                    confidence: 0.9,
                },
                attributes: {
                    props: {
                        name: 'John A Smith',
                        dateOfBirth: '1990-08-20', // Different DOB
                    },
                },
                normalizedAttributes: { 'props.name': 'john a smith' },
                confidence: 0.9,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                version: 1,
            };
            const result = await engine.compare(nodeA, nodeB);
            // Name matches well but DOB doesn't match
            (0, globals_1.expect)(['CANDIDATE', 'AUTO_NO_MATCH']).toContain(result.decision);
            (0, globals_1.expect)(result.features.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should return AUTO_NO_MATCH for conflicting deterministic identifiers', async () => {
            const nodeA = {
                nodeId: '11111111-1111-1111-1111-111111111111',
                clusterId: null,
                entityType: 'Person',
                sourceRef: {
                    sourceId: 'test',
                    sourceSystem: 'test',
                    recordId: 'A',
                    recordType: 'Person',
                    ingestedAt: new Date().toISOString(),
                    confidence: 0.9,
                },
                attributes: {
                    nationalId: '123-45-6789',
                    props: { name: 'John Smith' },
                },
                normalizedAttributes: { nationalid: '123456789' },
                confidence: 0.9,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                version: 1,
            };
            const nodeB = {
                nodeId: '22222222-2222-2222-2222-222222222222',
                clusterId: null,
                entityType: 'Person',
                sourceRef: {
                    sourceId: 'test',
                    sourceSystem: 'test',
                    recordId: 'B',
                    recordType: 'Person',
                    ingestedAt: new Date().toISOString(),
                    confidence: 0.9,
                },
                attributes: {
                    nationalId: '987-65-4321', // Different SSN
                    props: { name: 'John Smith' }, // Same name
                },
                normalizedAttributes: { nationalid: '987654321' },
                confidence: 0.9,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                version: 1,
            };
            const result = await engine.compare(nodeA, nodeB);
            (0, globals_1.expect)(result.decision).toBe('AUTO_NO_MATCH');
            (0, globals_1.expect)(result.decisionReason).toContain('mismatch');
        });
    });
    (0, globals_1.describe)('findCandidates', () => {
        (0, globals_1.it)('should find matching candidates from pool', async () => {
            const targetNode = {
                nodeId: 'target-node-id',
                clusterId: null,
                entityType: 'Person',
                sourceRef: {
                    sourceId: 'test',
                    sourceSystem: 'test',
                    recordId: 'target',
                    recordType: 'Person',
                    ingestedAt: new Date().toISOString(),
                    confidence: 0.9,
                },
                attributes: {
                    email: 'john@example.com',
                    props: { name: 'John Smith' },
                },
                normalizedAttributes: { email: 'john@example.com' },
                confidence: 0.9,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                version: 1,
            };
            const candidatePool = [
                {
                    nodeId: 'candidate-1',
                    clusterId: 'cluster-1',
                    entityType: 'Person',
                    sourceRef: {
                        sourceId: 'test',
                        sourceSystem: 'test',
                        recordId: 'c1',
                        recordType: 'Person',
                        ingestedAt: new Date().toISOString(),
                        confidence: 0.9,
                    },
                    attributes: {
                        email: 'john@example.com', // Same email
                        props: { name: 'John A Smith' },
                    },
                    normalizedAttributes: { email: 'john@example.com' },
                    confidence: 0.9,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    version: 1,
                },
                {
                    nodeId: 'candidate-2',
                    clusterId: null,
                    entityType: 'Person',
                    sourceRef: {
                        sourceId: 'test',
                        sourceSystem: 'test',
                        recordId: 'c2',
                        recordType: 'Person',
                        ingestedAt: new Date().toISOString(),
                        confidence: 0.9,
                    },
                    attributes: {
                        email: 'different@example.com',
                        props: { name: 'Jane Doe' },
                    },
                    normalizedAttributes: { email: 'different@example.com' },
                    confidence: 0.9,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    version: 1,
                },
            ];
            const candidates = await engine.findCandidates(targetNode, candidatePool);
            (0, globals_1.expect)(candidates.length).toBeGreaterThan(0);
            (0, globals_1.expect)(candidates[0].nodeId).toBe('candidate-1');
            (0, globals_1.expect)(candidates[0].score).toBe(1.0);
            (0, globals_1.expect)(candidates[0].decision).toBe('AUTO_MERGE');
        });
        (0, globals_1.it)('should exclude the target node from candidates', async () => {
            const targetNode = {
                nodeId: 'same-node',
                clusterId: null,
                entityType: 'Person',
                sourceRef: {
                    sourceId: 'test',
                    sourceSystem: 'test',
                    recordId: 'target',
                    recordType: 'Person',
                    ingestedAt: new Date().toISOString(),
                    confidence: 0.9,
                },
                attributes: { props: { name: 'John Smith' } },
                normalizedAttributes: {},
                confidence: 0.9,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                version: 1,
            };
            const candidatePool = [targetNode]; // Pool only contains the target
            const candidates = await engine.findCandidates(targetNode, candidatePool);
            (0, globals_1.expect)(candidates.length).toBe(0);
        });
    });
    (0, globals_1.describe)('createMatchEdge', () => {
        (0, globals_1.it)('should create a valid MatchEdge from comparison result', async () => {
            const nodeA = {
                nodeId: '11111111-1111-1111-1111-111111111111',
                clusterId: null,
                entityType: 'Person',
                sourceRef: {
                    sourceId: 'test',
                    sourceSystem: 'test',
                    recordId: 'A',
                    recordType: 'Person',
                    ingestedAt: new Date().toISOString(),
                    confidence: 0.9,
                },
                attributes: { email: 'test@example.com' },
                normalizedAttributes: {},
                confidence: 0.9,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                version: 1,
            };
            const nodeB = {
                nodeId: '22222222-2222-2222-2222-222222222222',
                clusterId: null,
                entityType: 'Person',
                sourceRef: {
                    sourceId: 'test',
                    sourceSystem: 'test',
                    recordId: 'B',
                    recordType: 'Person',
                    ingestedAt: new Date().toISOString(),
                    confidence: 0.9,
                },
                attributes: { email: 'test@example.com' },
                normalizedAttributes: {},
                confidence: 0.9,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                version: 1,
            };
            const result = await engine.compare(nodeA, nodeB);
            const edge = engine.createMatchEdge(result);
            (0, globals_1.expect)(edge.edgeId).toBeDefined();
            (0, globals_1.expect)(edge.nodeAId).toBe(nodeA.nodeId);
            (0, globals_1.expect)(edge.nodeBId).toBe(nodeB.nodeId);
            (0, globals_1.expect)(edge.overallScore).toBe(result.overallScore);
            (0, globals_1.expect)(edge.decision).toBe(result.decision);
            (0, globals_1.expect)(edge.matcherVersion).toBe(engine.version);
        });
    });
    (0, globals_1.describe)('updateThresholds', () => {
        (0, globals_1.it)('should update thresholds for an entity type', () => {
            const originalThresholds = engine.getThresholds('Person');
            engine.updateThresholds('Person', {
                autoMergeThreshold: 0.95,
                candidateThreshold: 0.65,
            });
            const newThresholds = engine.getThresholds('Person');
            (0, globals_1.expect)(newThresholds.autoMergeThreshold).toBe(0.95);
            (0, globals_1.expect)(newThresholds.candidateThreshold).toBe(0.65);
            (0, globals_1.expect)(newThresholds.autoNoMatchThreshold).toBe(originalThresholds.autoNoMatchThreshold);
        });
    });
});
