"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const engine_js_1 = require("../src/narrative/engine.js");
const psyops_layer_js_1 = require("../src/narrative/psyops-layer.js");
(0, globals_1.describe)('NarrativeSimulationEngine', () => {
    let config;
    let engine;
    const mockEntity = {
        id: 'agent-1',
        name: 'Agent One',
        type: 'actor',
        alignment: 'neutral',
        influence: 0.5,
        sentiment: 0.0,
        volatility: 0.2,
        resilience: 0.5,
        themes: { stability: 0.5 },
        relationships: [{ targetId: 'agent-2', strength: 0.8 }],
    };
    const mockEntity2 = {
        id: 'agent-2',
        name: 'Agent Two',
        type: 'actor',
        alignment: 'neutral',
        influence: 0.5,
        sentiment: 0.0,
        volatility: 0.2,
        resilience: 0.5,
        themes: { stability: 0.5 },
        relationships: [{ targetId: 'agent-1', strength: 0.8 }],
    };
    (0, globals_1.beforeEach)(() => {
        config = {
            id: 'sim-1',
            name: 'Test Sim',
            themes: ['stability'],
            tickIntervalMinutes: 60,
            initialEntities: [mockEntity, mockEntity2],
        };
        engine = new engine_js_1.NarrativeSimulationEngine(config);
    });
    (0, globals_1.it)('applies injected events on tick', async () => {
        engine.injectActorAction('agent-1', 'Signal Boost', {
            intensity: 1.0,
            sentimentShift: 0.6,
        });
        await engine.tick(1);
        const state = engine.getState();
        const agent1 = state.entities['agent-1'];
        (0, globals_1.expect)(agent1.lastUpdatedTick).toBe(1);
        (0, globals_1.expect)(agent1.sentiment).toBeGreaterThan(0);
        (0, globals_1.expect)(state.recentEvents.length).toBeGreaterThan(0);
    });
    (0, globals_1.it)('propagates events to related entities on subsequent ticks', async () => {
        engine.injectActorAction('agent-1', 'Viral Message', {
            intensity: 1.0,
            sentimentShift: 0.5,
        });
        await engine.tick(1);
        await engine.tick(1);
        const state = engine.getState();
        const agent2 = state.entities['agent-2'];
        (0, globals_1.expect)(agent2.lastUpdatedTick).toBeGreaterThan(0);
        (0, globals_1.expect)(agent2.sentiment).not.toBe(0);
    });
    (0, globals_1.it)('applies parameter adjustments from queued events', async () => {
        const event = {
            id: 'evt-1',
            type: 'system',
            theme: 'stability',
            intensity: 0.4,
            description: 'Parameter update',
            parameterAdjustments: [{ name: 'stress', delta: 0.5 }],
        };
        engine.queueEvent(event);
        await engine.tick(1);
        const state = engine.getState();
        (0, globals_1.expect)(state.parameters.stress).toBeDefined();
        (0, globals_1.expect)(state.parameters.stress.value).toBeGreaterThan(0.4);
    });
    (0, globals_1.it)('generates forecasts when entities meet radicalization thresholds', async () => {
        const layer = new psyops_layer_js_1.PredictivePsyOpsLayer(engine);
        engine.injectActorAction('agent-1', 'Radicalization Event', {
            intensity: 1.0,
            sentimentShift: 1.0,
        });
        await engine.tick(1);
        engine.injectActorAction('agent-1', 'Radicalization Event', {
            intensity: 1.0,
            sentimentShift: 1.0,
        });
        await engine.tick(1);
        const forecasts = layer.generateForecast();
        (0, globals_1.expect)(forecasts.length).toBeGreaterThan(0);
        (0, globals_1.expect)(forecasts[0].scenarioId).toContain('radicalization');
    });
});
