"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const StochasticActorAwareness_1 = require("../../src/services/StochasticActorAwareness");
const mlAnalysisService_1 = require("../../src/services/mlAnalysisService");
const globals_1 = require("@jest/globals");
class StubAwareness extends StochasticActorAwareness_1.StochasticActorAwareness {
    stubResults;
    stubSummary;
    receivedSignals = [];
    receivedOptions;
    constructor(stubResults, stubSummary) {
        super(() => 0.5);
        this.stubResults = stubResults;
        this.stubSummary = stubSummary;
    }
    runSimulation(signals, options = {}) {
        this.receivedSignals = signals;
        this.receivedOptions = options;
        return this.stubResults;
    }
    buildSummary(_results, _limit = 3) {
        return this.stubSummary;
    }
}
(0, globals_1.describe)('MLAnalysisService.generateStochasticActorAwareness', () => {
    (0, globals_1.it)('delegates to the stochastic awareness engine and returns a summary', () => {
        const stubResults = [
            {
                actor: 'APT29',
                probability: 0.7,
                meanScore: 0.6,
                volatility: 0.1,
                baseWeight: 0.55,
                awarenessScore: 0.64,
                confidence: 0.9,
                dominanceCount: 70,
            },
            {
                actor: 'FIN7',
                probability: 0.2,
                meanScore: 0.4,
                volatility: 0.08,
                baseWeight: 0.3,
                awarenessScore: 0.32,
                confidence: 0.7,
                dominanceCount: 20,
            },
        ];
        const stubAwareness = new StubAwareness(stubResults, 'Top actor APT29');
        const service = new mlAnalysisService_1.MLAnalysisService({ actorAwareness: stubAwareness });
        const signals = [
            { actor: 'APT29', sightings: 12, recencyDays: 2, confidence: 0.95 },
            { actor: 'FIN7', sightings: 4, recencyDays: 7, confidence: 0.7 },
        ];
        const response = service.generateStochasticActorAwareness(signals, {
            sampleCount: 200,
            summaryLimit: 2,
        });
        (0, globals_1.expect)(stubAwareness.receivedSignals).toEqual(signals);
        (0, globals_1.expect)(stubAwareness.receivedOptions).toEqual({
            sampleCount: 200,
            summaryLimit: 2,
        });
        (0, globals_1.expect)(response.actors).toEqual(stubResults);
        (0, globals_1.expect)(response.summary).toBe('Top actor APT29');
        (0, globals_1.expect)(response.sampleCount).toBe(200);
        (0, globals_1.expect)(response.dominantActor).toEqual(stubResults[0]);
    });
    (0, globals_1.it)('returns an empty summary when no signals are supplied', () => {
        const stubAwareness = new StubAwareness([], 'unused');
        const service = new mlAnalysisService_1.MLAnalysisService({ actorAwareness: stubAwareness });
        const response = service.generateStochasticActorAwareness([]);
        (0, globals_1.expect)(response.actors).toEqual([]);
        (0, globals_1.expect)(response.summary).toBe('No actor signals provided for awareness simulation.');
        (0, globals_1.expect)(response.sampleCount).toBe(0);
        (0, globals_1.expect)(response.dominantActor).toBeNull();
    });
});
