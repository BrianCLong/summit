"use strict";
/**
 * Tests for Explainable Defense AI Service
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const ExplainableDefenseAI_js_1 = require("../ExplainableDefenseAI.js");
(0, globals_1.describe)('ExplainableDefenseAI', () => {
    let xai;
    (0, globals_1.beforeEach)(() => {
        xai = new ExplainableDefenseAI_js_1.ExplainableDefenseAI('test-service');
    });
    (0, globals_1.describe)('Data Ingest', () => {
        (0, globals_1.it)('should ingest data with provenance tracking', async () => {
            const source = {
                id: 'src-001',
                name: 'Test Source',
                type: 'OSINT',
                classification: 'UNCLASSIFIED',
                reliability: 'B',
                credibility: 2,
                timestamp: new Date(),
            };
            const evidence = [
                { sourceId: 'src-001', content: 'Test evidence', extractedAt: new Date(), confidence: 0.85, metadata: {} },
            ];
            const result = await xai.ingestData(source, { raw: 'data' }, evidence);
            (0, globals_1.expect)(result.evidenceItems).toHaveLength(1);
            (0, globals_1.expect)(result.evidenceItems[0].contentHash).toBeDefined();
            (0, globals_1.expect)(result.chainNode.nodeType).toBe('INGEST');
            (0, globals_1.expect)(result.chainNode.signature).toBeDefined();
        });
    });
    (0, globals_1.describe)('Analysis with Explainability', () => {
        (0, globals_1.it)('should produce reasoning steps and feature contributions', async () => {
            const evidence = [
                { id: 'e1', sourceId: 's1', content: 'Evidence 1', contentHash: 'h1', extractedAt: new Date(), confidence: 0.9, metadata: {} },
                { id: 'e2', sourceId: 's2', content: 'Evidence 2', contentHash: 'h2', extractedAt: new Date(), confidence: 0.8, metadata: {} },
            ];
            const analysisFn = async (inputs) => ({
                result: { score: 0.85 },
                features: inputs.map((e, i) => ({
                    feature: `feature_${i}`,
                    value: e.confidence,
                    weight: 0.5,
                    contribution: e.confidence * 0.5,
                    direction: 'positive',
                    explanation: `Feature ${i} explanation`,
                })),
            });
            const result = await xai.analyzeWithExplanation('RISK_ASSESSMENT', evidence, analysisFn);
            (0, globals_1.expect)(result.explanation.decisionType).toBe('RISK_ASSESSMENT');
            (0, globals_1.expect)(result.explanation.reasoning.length).toBeGreaterThan(0);
            (0, globals_1.expect)(result.explanation.featureContributions.length).toBe(2);
            (0, globals_1.expect)(result.explanation.humanReadableSummary).toBeDefined();
            (0, globals_1.expect)(result.chainNode.nodeType).toBe('ANALYZE');
        });
        (0, globals_1.it)('should identify limitations when evidence is sparse', async () => {
            const evidence = [
                { id: 'e1', sourceId: 's1', content: 'Single evidence', contentHash: 'h1', extractedAt: new Date(), confidence: 0.6, metadata: {} },
            ];
            const analysisFn = async () => ({
                result: { score: 0.6 },
                features: [{ feature: 'f1', value: 0.6, weight: 1, contribution: 0.6, direction: 'neutral', explanation: 'Test' }],
            });
            const result = await xai.analyzeWithExplanation('ANOMALY_DETECTION', evidence, analysisFn);
            (0, globals_1.expect)(result.explanation.limitations).toContain('Limited source diversity - fewer than 3 independent sources');
        });
    });
    (0, globals_1.describe)('Prioritization', () => {
        (0, globals_1.it)('should rank items with justifications', async () => {
            const items = [
                { id: 'item-1', data: { urgency: 0.9, impact: 0.8 }, evidence: [] },
                { id: 'item-2', data: { urgency: 0.5, impact: 0.9 }, evidence: [] },
                { id: 'item-3', data: { urgency: 0.3, impact: 0.4 }, evidence: [] },
            ];
            const criteria = [
                { name: 'Urgency', weight: 0.6, evaluator: (item) => item.urgency },
                { name: 'Impact', weight: 0.4, evaluator: (item) => item.impact },
            ];
            const result = await xai.prioritizeWithJustification(items, criteria);
            (0, globals_1.expect)(result.ranked).toHaveLength(3);
            (0, globals_1.expect)(result.ranked[0].rank).toBe(1);
            (0, globals_1.expect)(result.ranked[0].id).toBe('item-1'); // Highest combined score
            (0, globals_1.expect)(result.ranked[0].justification).toContain('Urgency');
            (0, globals_1.expect)(result.explanation.decisionType).toBe('PRIORITIZATION');
        });
    });
    (0, globals_1.describe)('Intelligence Fusion', () => {
        (0, globals_1.it)('should fuse multiple sources with chain of trust', async () => {
            const sources = [
                {
                    source: {
                        id: 'sigint-1',
                        name: 'SIGINT Source',
                        type: 'SIGINT',
                        classification: 'SECRET',
                        reliability: 'A',
                        credibility: 1,
                        timestamp: new Date(),
                    },
                    evidence: [
                        { id: 'e1', sourceId: 'sigint-1', content: 'SIGINT data', contentHash: 'h1', extractedAt: new Date(), confidence: 0.95, metadata: {} },
                    ],
                },
                {
                    source: {
                        id: 'humint-1',
                        name: 'HUMINT Source',
                        type: 'HUMINT',
                        classification: 'CONFIDENTIAL',
                        reliability: 'B',
                        credibility: 2,
                        timestamp: new Date(),
                    },
                    evidence: [
                        { id: 'e2', sourceId: 'humint-1', content: 'HUMINT data', contentHash: 'h2', extractedAt: new Date(), confidence: 0.80, metadata: {} },
                    ],
                },
            ];
            const product = await xai.fuseIntelligence(sources, 'WEIGHTED_CONSENSUS');
            (0, globals_1.expect)(product.id).toBeDefined();
            (0, globals_1.expect)(product.classification).toBe('SECRET'); // Highest classification
            (0, globals_1.expect)(product.chainOfTrust.length).toBe(3); // TRANSFORM, FUSE, OUTPUT
            (0, globals_1.expect)(product.explanation.decisionType).toBe('FUSION');
            (0, globals_1.expect)(product.confidence).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('Chain of Trust Verification', () => {
        (0, globals_1.it)('should verify valid chain', async () => {
            const sources = [
                {
                    source: {
                        id: 'test-src',
                        name: 'Test',
                        type: 'OSINT',
                        classification: 'UNCLASSIFIED',
                        reliability: 'C',
                        credibility: 3,
                        timestamp: new Date(),
                    },
                    evidence: [
                        { id: 'e1', sourceId: 'test-src', content: 'Data', contentHash: 'h1', extractedAt: new Date(), confidence: 0.7, metadata: {} },
                    ],
                },
            ];
            const product = await xai.fuseIntelligence(sources, 'MAJORITY_VOTE');
            const verification = xai.verifyChainOfTrust(product.id);
            (0, globals_1.expect)(verification.valid).toBe(true);
            (0, globals_1.expect)(verification.issues).toHaveLength(0);
            (0, globals_1.expect)(verification.verificationReport).toContain('verified');
        });
        (0, globals_1.it)('should detect missing chain', () => {
            const verification = xai.verifyChainOfTrust('nonexistent-id');
            (0, globals_1.expect)(verification.valid).toBe(false);
            (0, globals_1.expect)(verification.issues).toContain('Chain not found');
        });
    });
    (0, globals_1.describe)('Audit Trail', () => {
        (0, globals_1.it)('should maintain audit records', async () => {
            const source = {
                id: 'audit-test',
                name: 'Audit Test',
                type: 'OSINT',
                classification: 'UNCLASSIFIED',
                reliability: 'C',
                credibility: 3,
                timestamp: new Date(),
            };
            await xai.ingestData(source, {}, []);
            const audit = xai.getAuditTrail();
            (0, globals_1.expect)(audit.length).toBeGreaterThan(0);
            (0, globals_1.expect)(audit[0].action).toBe('DATA_INGEST');
        });
        (0, globals_1.it)('should export audit manifest with merkle root', async () => {
            const source = {
                id: 'manifest-test',
                name: 'Manifest Test',
                type: 'OSINT',
                classification: 'UNCLASSIFIED',
                reliability: 'C',
                credibility: 3,
                timestamp: new Date(),
            };
            await xai.ingestData(source, {}, []);
            const manifest = xai.exportAuditManifest();
            (0, globals_1.expect)(manifest.merkleRoot).toBeDefined();
            (0, globals_1.expect)(manifest.signature).toBeDefined();
            (0, globals_1.expect)(manifest.exportedAt).toBeInstanceOf(Date);
        });
    });
    (0, globals_1.describe)('Human-Readable Reports', () => {
        (0, globals_1.it)('should generate readable report from explanation', async () => {
            const evidence = [
                { id: 'e1', sourceId: 's1', content: 'Test', contentHash: 'h1', extractedAt: new Date(), confidence: 0.9, metadata: {} },
            ];
            const analysisFn = async () => ({
                result: { score: 0.9 },
                features: [{
                        feature: 'test_feature',
                        value: 0.9,
                        weight: 1,
                        contribution: 0.9,
                        direction: 'positive',
                        explanation: 'High test feature',
                    }],
            });
            const { explanation } = await xai.analyzeWithExplanation('RISK_ASSESSMENT', evidence, analysisFn);
            const report = xai.generateHumanReadableReport(explanation);
            (0, globals_1.expect)(report).toContain('## RISK_ASSESSMENT Decision Report');
            (0, globals_1.expect)(report).toContain('### Reasoning Chain');
            (0, globals_1.expect)(report).toContain('### Key Contributing Factors');
        });
    });
});
