"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../index.js");
(0, vitest_1.describe)('ElectionDisruptionEngine', () => {
    (0, vitest_1.it)('should initialize with config', () => {
        const engine = new index_js_1.ElectionDisruptionEngine({
            fusion: { weights: {}, correlationThreshold: 0.7 },
            attribution: { minConfidence: 0.5, methods: ['MULTI_INT_FUSION'] },
            adversarial: { enabled: true, detectionThreshold: 0.8 },
        });
        (0, vitest_1.expect)(engine).toBeDefined();
    });
    (0, vitest_1.it)('should analyze empty signals', async () => {
        const engine = new index_js_1.ElectionDisruptionEngine({
            fusion: { weights: {}, correlationThreshold: 0.7 },
            attribution: { minConfidence: 0.5, methods: ['MULTI_INT_FUSION'] },
            adversarial: { enabled: true, detectionThreshold: 0.8 },
        });
        const result = await engine.analyzeSignals([], {
            electionId: 'test-2024',
            jurisdiction: 'US',
            currentPhase: 'CAMPAIGN',
            daysToElection: 30,
            historicalBaseline: {},
        });
        (0, vitest_1.expect)(result).toHaveProperty('threats');
        (0, vitest_1.expect)(result).toHaveProperty('overallRiskLevel');
        (0, vitest_1.expect)(result).toHaveProperty('recommendations');
    });
});
(0, vitest_1.describe)('MultiModalFusionEngine', () => {
    (0, vitest_1.it)('should fuse empty threat sets', async () => {
        const engine = new index_js_1.MultiModalFusionEngine({
            weights: {},
            correlationThreshold: 0.7,
        });
        const result = await engine.fuse([]);
        (0, vitest_1.expect)(result).toEqual([]);
    });
    (0, vitest_1.it)('should wrap single threat', async () => {
        const engine = new index_js_1.MultiModalFusionEngine({
            weights: {},
            correlationThreshold: 0.7,
        });
        const threat = {
            id: 'test-1',
            type: 'DISINFORMATION_CAMPAIGN',
            confidence: 0.8,
            severity: 'HIGH',
            vectors: ['SOCIAL_MEDIA'],
            temporalContext: {
                phase: 'CAMPAIGN',
                daysToElection: 30,
                timeWindow: { start: new Date(), end: new Date() },
                trendDirection: 'STABLE',
                velocity: 0,
            },
            geospatialContext: {
                jurisdictions: ['US'],
                precincts: [],
                swingIndicator: 0,
                demographicOverlays: [],
                infrastructureDependencies: [],
            },
            attribution: {
                primaryActor: null,
                confidence: 0,
                methodology: 'BEHAVIORAL_ANALYSIS',
                indicators: [],
                alternativeHypotheses: [],
            },
            evidence: [],
            mitigationRecommendations: [],
        };
        const result = await engine.fuse([[threat]]);
        (0, vitest_1.expect)(result).toHaveLength(1);
        (0, vitest_1.expect)(result[0]).toHaveProperty('id');
        (0, vitest_1.expect)(result[0]).toHaveProperty('type');
        (0, vitest_1.expect)(result[0].confidence).toBe(0.8);
    });
});
(0, vitest_1.describe)('CausalAttributionEngine', () => {
    (0, vitest_1.it)('should attribute empty threats', async () => {
        const engine = new index_js_1.CausalAttributionEngine({
            minConfidenceThreshold: 0.5,
            methods: ['MULTI_INT_FUSION'],
            requireMultipleMethods: false,
            historicalDatabase: '',
        });
        const result = await engine.attribute([]);
        (0, vitest_1.expect)(result).toEqual([]);
    });
});
(0, vitest_1.describe)('THREAT_MODELS', () => {
    (0, vitest_1.it)('should have predefined threat models', () => {
        (0, vitest_1.expect)(index_js_1.THREAT_MODELS).toBeDefined();
        (0, vitest_1.expect)(index_js_1.THREAT_MODELS.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('should have required fields in each model', () => {
        for (const model of index_js_1.THREAT_MODELS) {
            (0, vitest_1.expect)(model).toHaveProperty('id');
            (0, vitest_1.expect)(model).toHaveProperty('name');
            (0, vitest_1.expect)(model).toHaveProperty('category');
            (0, vitest_1.expect)(model).toHaveProperty('actors');
            (0, vitest_1.expect)(model).toHaveProperty('objectives');
            (0, vitest_1.expect)(model).toHaveProperty('indicators');
            (0, vitest_1.expect)(model).toHaveProperty('mitigations');
        }
    });
});
