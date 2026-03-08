"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ConfidenceScorer_js_1 = require("../confidence/ConfidenceScorer.js");
(0, vitest_1.describe)('ConfidenceScorer', () => {
    let scorer;
    (0, vitest_1.beforeEach)(() => {
        scorer = new ConfidenceScorer_js_1.ConfidenceScorer();
    });
    (0, vitest_1.describe)('generateReport', () => {
        (0, vitest_1.it)('should generate confidence report with factors', () => {
            const fusionResult = {
                id: 'fusion-1',
                sourceRecords: [
                    { sourceId: 'src1', recordId: '1', data: { name: 'John' } },
                ],
                fusedRecord: { name: 'John' },
                confidenceScore: 0.9,
                strategyUsed: 'fuzzy_match',
                conflictsResolved: [],
                lineage: {
                    createdAt: new Date(),
                    sources: ['src1'],
                    transformations: ['fusion:fuzzy_match'],
                },
            };
            const profiles = new Map();
            const sources = new Map();
            sources.set('src1', {
                id: 'src1',
                name: 'test',
                type: 'database',
                connectionUri: 'test',
                status: 'ready',
                discoveredAt: new Date(),
                confidenceScore: 0.9,
                tags: [],
                autoIngestEnabled: false,
            });
            const report = scorer.generateReport(fusionResult, profiles, sources);
            (0, vitest_1.expect)(report.overallScore).toBeGreaterThan(0);
            (0, vitest_1.expect)(report.factors).toHaveLength(5);
            (0, vitest_1.expect)(report.verifiableReferences).toHaveLength(1);
        });
        (0, vitest_1.it)('should add recommendations for low scores', () => {
            const fusionResult = {
                id: 'fusion-1',
                sourceRecords: [
                    { sourceId: 'src1', recordId: '1', data: { name: 'John' } },
                    { sourceId: 'src2', recordId: '2', data: { name: 'Jon' } },
                ],
                fusedRecord: { name: 'John' },
                confidenceScore: 0.5,
                strategyUsed: 'fuzzy_match',
                conflictsResolved: [
                    { field: 'name', values: ['John', 'Jon'], resolvedValue: 'John', resolutionMethod: 'most_complete' },
                ],
                lineage: {
                    createdAt: new Date(),
                    sources: ['src1', 'src2'],
                    transformations: ['fusion:fuzzy_match'],
                },
            };
            const report = scorer.generateReport(fusionResult, new Map(), new Map());
            (0, vitest_1.expect)(report.recommendations.length).toBeGreaterThan(0);
        });
    });
    (0, vitest_1.describe)('formatScore', () => {
        (0, vitest_1.it)('should format scores correctly', () => {
            (0, vitest_1.expect)(scorer.formatScore(0.95)).toBe('Very High');
            (0, vitest_1.expect)(scorer.formatScore(0.75)).toBe('High');
            (0, vitest_1.expect)(scorer.formatScore(0.55)).toBe('Medium');
            (0, vitest_1.expect)(scorer.formatScore(0.35)).toBe('Low');
            (0, vitest_1.expect)(scorer.formatScore(0.15)).toBe('Very Low');
        });
    });
    (0, vitest_1.describe)('generateVisualization', () => {
        (0, vitest_1.it)('should generate visualization data', () => {
            const report = {
                overallScore: 0.8,
                factors: [
                    { factor: 'test', weight: 0.5, score: 0.8, explanation: 'test' },
                ],
                recommendations: [],
                verifiableReferences: [],
            };
            const viz = scorer.generateVisualization(report);
            (0, vitest_1.expect)(viz).toHaveProperty('type', 'confidence_chart');
            (0, vitest_1.expect)(viz).toHaveProperty('data');
        });
    });
});
