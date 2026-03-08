"use strict";
/**
 * Simulation Engine Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const SimulationEngine_js_1 = require("../simulation/SimulationEngine.js");
const digitalTwin_js_1 = require("../types/digitalTwin.js");
(0, globals_1.describe)('SimulationEngine', () => {
    let engine;
    let testAssets;
    (0, globals_1.beforeEach)(() => {
        engine = new SimulationEngine_js_1.SimulationEngine({ maxIterations: 100 });
        testAssets = [
            {
                id: 'asset-1',
                name: 'Test Building',
                type: digitalTwin_js_1.AssetType.BUILDING,
                geometry: { type: 'Point', coordinates: [0, 0] },
                metadata: { constructionDate: new Date('2000-01-01') },
                sensorBindings: [],
                lastSync: new Date(),
                syncState: digitalTwin_js_1.TwinSyncState.SYNCED,
                healthStatus: digitalTwin_js_1.HealthStatus.GOOD,
                healthScore: 80,
                tags: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'asset-2',
                name: 'Test Bridge',
                type: digitalTwin_js_1.AssetType.BRIDGE,
                geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
                metadata: { constructionDate: new Date('1990-01-01') },
                sensorBindings: [],
                lastSync: new Date(),
                syncState: digitalTwin_js_1.TwinSyncState.SYNCED,
                healthStatus: digitalTwin_js_1.HealthStatus.FAIR,
                healthScore: 55,
                tags: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ];
    });
    (0, globals_1.describe)('createScenario', () => {
        (0, globals_1.it)('should create a disaster simulation scenario', async () => {
            const scenario = await engine.createScenario('Earthquake Test', digitalTwin_js_1.ScenarioType.DISASTER, { duration: 3600, timeStep: 60, intensity: 6.5 }, digitalTwin_js_1.DisasterSubtype.EARTHQUAKE);
            (0, globals_1.expect)(scenario.id).toBeDefined();
            (0, globals_1.expect)(scenario.name).toBe('Earthquake Test');
            (0, globals_1.expect)(scenario.type).toBe(digitalTwin_js_1.ScenarioType.DISASTER);
            (0, globals_1.expect)(scenario.subtype).toBe(digitalTwin_js_1.DisasterSubtype.EARTHQUAKE);
            (0, globals_1.expect)(scenario.status).toBe('PENDING');
        });
        (0, globals_1.it)('should create an urban planning scenario', async () => {
            const scenario = await engine.createScenario('Density Analysis', digitalTwin_js_1.ScenarioType.URBAN_PLANNING, { duration: 86400, timeStep: 3600 });
            (0, globals_1.expect)(scenario.type).toBe(digitalTwin_js_1.ScenarioType.URBAN_PLANNING);
        });
    });
    (0, globals_1.describe)('runSimulation', () => {
        (0, globals_1.it)('should run a disaster simulation and return results', async () => {
            const scenario = await engine.createScenario('Flood Simulation', digitalTwin_js_1.ScenarioType.DISASTER, { duration: 3600, timeStep: 60, intensity: 3 }, digitalTwin_js_1.DisasterSubtype.FLOOD);
            const result = await engine.runSimulation(scenario.id, testAssets);
            (0, globals_1.expect)(result.timestamp).toBeInstanceOf(Date);
            (0, globals_1.expect)(result.affectedAssets).toBeDefined();
            (0, globals_1.expect)(result.metrics).toBeDefined();
            (0, globals_1.expect)(result.confidenceScore).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(result.confidenceScore).toBeLessThanOrEqual(1);
        });
        (0, globals_1.it)('should run a maintenance simulation', async () => {
            const scenario = await engine.createScenario('Maintenance Forecast', digitalTwin_js_1.ScenarioType.MAINTENANCE, { duration: 86400 * 365, timeStep: 86400 });
            const result = await engine.runSimulation(scenario.id, testAssets);
            (0, globals_1.expect)(result.predictions).toBeDefined();
            (0, globals_1.expect)(result.predictions.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should throw for non-existent scenario', async () => {
            await (0, globals_1.expect)(engine.runSimulation('fake-id', testAssets))
                .rejects.toThrow('Scenario not found');
        });
    });
    (0, globals_1.describe)('getScenario', () => {
        (0, globals_1.it)('should retrieve scenario by id', async () => {
            const created = await engine.createScenario('Test Scenario', digitalTwin_js_1.ScenarioType.TRAFFIC, { duration: 3600, timeStep: 60 });
            const retrieved = await engine.getScenario(created.id);
            (0, globals_1.expect)(retrieved?.name).toBe('Test Scenario');
        });
        (0, globals_1.it)('should return null for non-existent scenario', async () => {
            const result = await engine.getScenario('non-existent');
            (0, globals_1.expect)(result).toBeNull();
        });
    });
});
