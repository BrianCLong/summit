"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const StochasticActorAwareness_1 = require("../../src/services/StochasticActorAwareness");
(0, globals_1.describe)('StochasticActorAwareness', () => {
    (0, globals_1.it)('returns stable probabilities when noise is disabled', () => {
        const deterministic = new StochasticActorAwareness_1.StochasticActorAwareness(() => 0.5);
        const signals = [
            { actor: 'APT29', sightings: 12, recencyDays: 2, confidence: 0.95, severity: 0.8 },
            { actor: 'FIN7', sightings: 5, recencyDays: 6, confidence: 0.7, severity: 0.6 },
            {
                actor: 'Scattered Spider',
                sightings: 1,
                recencyDays: 20,
                confidence: 0.5,
                severity: 0.55,
            },
        ];
        const results = deterministic.runSimulation(signals, {
            sampleCount: 10,
            noiseFloor: 0,
            explorationWeight: 0,
        });
        (0, globals_1.expect)(results.map((r) => r.actor)).toEqual([
            'APT29',
            'FIN7',
            'Scattered Spider',
        ]);
        const totalProbability = results.reduce((sum, entry) => sum + entry.probability, 0);
        (0, globals_1.expect)(totalProbability).toBeCloseTo(1, 5);
        (0, globals_1.expect)(results[0].probability).toBe(1);
        (0, globals_1.expect)(results[0].baseWeight).toBeGreaterThan(results[1].baseWeight);
        (0, globals_1.expect)(results[0].dominanceCount).toBe(10);
    });
    (0, globals_1.it)('summarizes top actors with awareness and probability signals', () => {
        const awareness = new StochasticActorAwareness_1.StochasticActorAwareness(() => 0.5);
        const summary = awareness.buildSummary([
            {
                actor: 'APT29',
                probability: 0.68,
                meanScore: 0.57,
                volatility: 0.08,
                baseWeight: 0.51,
                awarenessScore: 0.62,
                confidence: 0.9,
                dominanceCount: 68,
            },
            {
                actor: 'FIN7',
                probability: 0.22,
                meanScore: 0.41,
                volatility: 0.06,
                baseWeight: 0.32,
                awarenessScore: 0.37,
                confidence: 0.7,
                dominanceCount: 22,
            },
        ]);
        (0, globals_1.expect)(summary).toContain('APT29');
        (0, globals_1.expect)(summary).toContain('FIN7');
        (0, globals_1.expect)(summary).toContain('awareness score');
    });
});
