"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const types_1 = require("../../src/types");
const scorer_1 = require("../../src/scoring/scorer");
(0, globals_1.describe)('ER explanation utilities', () => {
    const features = {
        nameSimilarity: 0.82,
        nameJaccard: 0.7,
        nameLevenshtein: 0.2,
        phoneticSimilarity: 1,
        aliasSimilarity: 0.45,
        typeMatch: true,
        propertyOverlap: 0.4,
        semanticSimilarity: 0.6,
        geographicProximity: 0.2,
        temporalCoOccurrence: 0.1,
        locationOverlap: 0.3,
        deviceIdMatch: 1,
        accountIdMatch: 0.5,
        ipAddressOverlap: 0.1,
        editDistance: 2,
    };
    (0, globals_1.it)('builds normalized feature contributions', () => {
        const contributions = (0, scorer_1.buildFeatureContributions)(features, types_1.DEFAULT_SCORING_CONFIG.weights);
        (0, globals_1.expect)(contributions).toHaveLength(Object.keys(types_1.DEFAULT_SCORING_CONFIG.weights).length);
        (0, globals_1.expect)(contributions[0].contribution).toBeGreaterThanOrEqual(contributions[contributions.length - 1].contribution);
        const totalNormalized = contributions.reduce((sum, entry) => sum + entry.normalizedContribution, 0);
        (0, globals_1.expect)(totalNormalized).toBeCloseTo(1, 5);
    });
    (0, globals_1.it)('validates explain pair schema', () => {
        const request = {
            entityA: {
                id: 'e1',
                type: 'person',
                name: 'Jane Doe',
                tenantId: 'tenant-1',
                attributes: { email: 'jane@example.com' },
            },
            entityB: {
                id: 'e2',
                type: 'person',
                name: 'Janet Doe',
                tenantId: 'tenant-1',
                attributes: { email: 'janet@example.com' },
            },
            method: 'hybrid',
            threshold: 0.7,
        };
        const parsedRequest = types_1.ExplainPairRequestSchema.parse(request);
        (0, globals_1.expect)(parsedRequest.method).toBe('hybrid');
        const contributions = (0, scorer_1.buildFeatureContributions)(features, types_1.DEFAULT_SCORING_CONFIG.weights);
        const response = {
            score: 0.81,
            confidence: 0.77,
            method: 'hybrid',
            threshold: 0.7,
            features,
            rationale: ['Name similarity: 82.0%'],
            featureWeights: types_1.DEFAULT_SCORING_CONFIG.weights,
            featureContributions: contributions,
        };
        const parsedResponse = types_1.ExplainPairResponseSchema.parse(response);
        (0, globals_1.expect)(parsedResponse.featureContributions).toHaveLength(contributions.length);
    });
});
