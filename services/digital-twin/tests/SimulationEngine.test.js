"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const SimulationEngine_js_1 = require("../src/simulation/SimulationEngine.js");
(0, globals_1.describe)('SimulationEngine', () => {
    const engine = new SimulationEngine_js_1.SimulationEngine();
    const mockTwin = {
        metadata: {
            id: 'twin-123',
            name: 'Test Twin',
            type: 'SYSTEM',
            version: '1.0.0',
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'test',
            tags: [],
        },
        state: 'ACTIVE',
        currentStateVector: {
            timestamp: new Date(),
            confidence: 0.9,
            source: 'test',
            properties: { value: 100, rate: 0.1 },
        },
        stateHistory: [],
        dataBindings: [],
        relationships: [],
        provenanceChain: [],
    };
    (0, globals_1.describe)('Monte Carlo simulation', () => {
        (0, globals_1.it)('should run Monte Carlo simulation', async () => {
            const result = await engine.runSimulation(mockTwin, {
                twinId: mockTwin.metadata.id,
                config: {
                    engine: 'MONTE_CARLO',
                    timeHorizon: 10,
                    timeStep: 1,
                    iterations: 100,
                    parameters: { value_volatility: 0.05 },
                },
            });
            (0, globals_1.expect)(result.outcomes).toHaveLength(1);
            (0, globals_1.expect)(result.outcomes[0].scenario).toBe('baseline');
            (0, globals_1.expect)(result.outcomes[0].metrics).toHaveProperty('value_mean');
            (0, globals_1.expect)(result.outcomes[0].metrics).toHaveProperty('value_std');
        });
        (0, globals_1.it)('should support multiple scenarios', async () => {
            const result = await engine.runSimulation(mockTwin, {
                twinId: mockTwin.metadata.id,
                config: {
                    engine: 'MONTE_CARLO',
                    timeHorizon: 5,
                    timeStep: 1,
                    iterations: 50,
                    parameters: {},
                },
                scenarios: [
                    { name: 'optimistic', overrides: { value: 150 } },
                    { name: 'pessimistic', overrides: { value: 50 } },
                ],
            });
            (0, globals_1.expect)(result.outcomes).toHaveLength(2);
            (0, globals_1.expect)(result.outcomes[0].scenario).toBe('optimistic');
            (0, globals_1.expect)(result.outcomes[1].scenario).toBe('pessimistic');
        });
    });
    (0, globals_1.describe)('System Dynamics simulation', () => {
        (0, globals_1.it)('should run System Dynamics simulation', async () => {
            const result = await engine.runSimulation(mockTwin, {
                twinId: mockTwin.metadata.id,
                config: {
                    engine: 'SYSTEM_DYNAMICS',
                    timeHorizon: 10,
                    timeStep: 0.5,
                    iterations: 1,
                    parameters: {
                        value_inflow: 5,
                        value_outflow: 3,
                    },
                },
            });
            (0, globals_1.expect)(result.outcomes).toHaveLength(1);
            (0, globals_1.expect)(result.outcomes[0].stateVector.source).toBe('SYSTEM_DYNAMICS_SIMULATION');
        });
    });
    (0, globals_1.describe)('Hybrid simulation', () => {
        (0, globals_1.it)('should combine Monte Carlo and System Dynamics', async () => {
            const result = await engine.runSimulation(mockTwin, {
                twinId: mockTwin.metadata.id,
                config: {
                    engine: 'HYBRID',
                    timeHorizon: 5,
                    timeStep: 1,
                    iterations: 50,
                    parameters: {},
                },
            });
            (0, globals_1.expect)(result.outcomes[0].stateVector.source).toBe('HYBRID_SIMULATION');
            (0, globals_1.expect)(result.outcomes[0].stateVector.confidence).toBe(0.9);
        });
    });
    (0, globals_1.describe)('Insights and recommendations', () => {
        (0, globals_1.it)('should generate insights for multi-scenario runs', async () => {
            const result = await engine.runSimulation(mockTwin, {
                twinId: mockTwin.metadata.id,
                config: {
                    engine: 'MONTE_CARLO',
                    timeHorizon: 5,
                    timeStep: 1,
                    iterations: 20,
                    parameters: {},
                },
                scenarios: [
                    { name: 'a', overrides: { value: 100 } },
                    { name: 'b', overrides: { value: 200 } },
                ],
            });
            (0, globals_1.expect)(result.insights.length).toBeGreaterThan(0);
            (0, globals_1.expect)(result.recommendations.length).toBeGreaterThan(0);
        });
    });
});
