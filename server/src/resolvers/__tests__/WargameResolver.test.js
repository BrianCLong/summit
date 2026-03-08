"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Mock Neo4j Driver
globals_1.jest.unstable_mockModule('../../db/neo4j.js', () => ({
    getNeo4jDriver: globals_1.jest.fn(() => ({
        session: globals_1.jest.fn(() => ({
            run: globals_1.jest.fn(),
            close: globals_1.jest.fn(),
        })),
    })),
}));
// Mock axios
globals_1.jest.unstable_mockModule('axios', () => ({
    __esModule: true,
    default: {
        post: globals_1.jest.fn(),
    },
}));
// Mock node:crypto
globals_1.jest.unstable_mockModule('node:crypto', () => ({
    randomUUID: globals_1.jest.fn(),
}));
(0, globals_1.describe)('WargameResolver', () => {
    let WargameResolver;
    let getNeo4jDriver;
    let axios;
    let uuidv4;
    let resolver;
    let mockSessionRun;
    let mockAxiosPost;
    (0, globals_1.beforeAll)(async () => {
        ({ WargameResolver } = await Promise.resolve().then(() => __importStar(require('../WargameResolver.js'))));
        ({ getNeo4jDriver } = await Promise.resolve().then(() => __importStar(require('../../db/neo4j.js'))));
        axios = (await Promise.resolve().then(() => __importStar(require('axios')))).default;
        ({ randomUUID: uuidv4 } = await Promise.resolve().then(() => __importStar(require('node:crypto'))));
    });
    (0, globals_1.beforeEach)(() => {
        mockSessionRun = globals_1.jest.fn();
        const mockSession = {
            run: mockSessionRun,
            close: globals_1.jest.fn(),
        };
        const mockDriver = {
            session: globals_1.jest.fn(() => mockSession),
        };
        getNeo4jDriver.mockReturnValue(mockDriver);
        resolver = new WargameResolver();
        const mockedAxios = axios;
        mockAxiosPost = mockedAxios.post;
        uuidv4.mockReturnValue('mock-uuid');
        // Reset mocks before each test
        mockSessionRun.mockReset();
        mockAxiosPost.mockReset();
    });
    // Helper to create a mock Neo4j result record
    const createMockRecord = (properties, type = 'node') => ({
        get: globals_1.jest.fn((key) => {
            if (key === type) {
                return { properties };
            }
            return undefined;
        }),
    });
    (0, globals_1.describe)('Query Resolvers', () => {
        (0, globals_1.it)('should fetch all crisis scenarios', async () => {
            const mockScenarios = [
                {
                    id: 'scenario1',
                    crisisType: 'geo',
                    createdAt: '2023-01-01T00:00:00Z',
                },
                {
                    id: 'scenario2',
                    crisisType: 'cyber',
                    createdAt: '2023-01-02T00:00:00Z',
                },
            ];
            mockSessionRun.mockResolvedValueOnce({
                records: mockScenarios.map((s) => createMockRecord(s, 's')),
            });
            const result = await resolver.getAllCrisisScenarios({}, {}, {});
            (0, globals_1.expect)(result).toEqual(mockScenarios);
            (0, globals_1.expect)(mockSessionRun).toHaveBeenCalledWith(globals_1.expect.stringContaining('MATCH (s:CrisisScenario)'));
        });
        (0, globals_1.it)('should fetch a single crisis scenario by ID', async () => {
            const mockScenario = { id: 'scenario1', crisisType: 'geo' };
            mockSessionRun.mockResolvedValueOnce({
                records: [createMockRecord(mockScenario, 's')],
            });
            const result = await resolver.getCrisisScenario({}, { id: 'scenario1' }, {});
            (0, globals_1.expect)(result).toEqual(mockScenario);
            (0, globals_1.expect)(mockSessionRun).toHaveBeenCalledWith(globals_1.expect.stringContaining('MATCH (s:CrisisScenario {id: $id})'), { id: 'scenario1' });
        });
        (0, globals_1.it)('should return undefined if crisis scenario not found', async () => {
            mockSessionRun.mockResolvedValueOnce({ records: [] });
            const result = await resolver.getCrisisScenario({}, { id: 'nonexistent' }, {});
            (0, globals_1.expect)(result).toBeUndefined();
        });
        (0, globals_1.it)('should fetch crisis telemetry', async () => {
            const mockTelemetry = [{ id: 'tele1', platform: 'X', content: 'test' }];
            mockSessionRun.mockResolvedValueOnce({
                records: mockTelemetry.map((t) => createMockRecord(t, 't')),
            });
            const result = await resolver.getCrisisTelemetry({}, { scenarioId: 'scenario1' }, {});
            (0, globals_1.expect)(result).toEqual(mockTelemetry);
            (0, globals_1.expect)(mockSessionRun).toHaveBeenCalledWith(globals_1.expect.stringContaining('MATCH (s:CrisisScenario {id: $scenarioId})-[:HAS_TELEMETRY]->(t:SocialMediaPost)'), globals_1.expect.any(Object));
        });
        (0, globals_1.it)('should fetch adversary intent estimates', async () => {
            const mockIntent = [{ id: 'intent1', estimatedIntent: 'disinfo' }];
            mockSessionRun.mockResolvedValueOnce({
                records: mockIntent.map((i) => createMockRecord(i, 'i')),
            });
            const result = await resolver.getAdversaryIntentEstimates({}, { scenarioId: 'scenario1' }, {});
            (0, globals_1.expect)(result).toEqual(mockIntent);
            (0, globals_1.expect)(mockSessionRun).toHaveBeenCalledWith(globals_1.expect.stringContaining('MATCH (s:CrisisScenario {id: $scenarioId})-[:HAS_INTENT_ESTIMATE]->(i:AdversaryIntent)'), globals_1.expect.any(Object));
        });
        (0, globals_1.it)('should fetch narrative heatmap data', async () => {
            const mockHeatmap = [{ id: 'heatmap1', narrative: 'narrativeA' }];
            mockSessionRun.mockResolvedValueOnce({
                records: mockHeatmap.map((h) => createMockRecord(h, 'h')),
            });
            const result = await resolver.getNarrativeHeatmapData({}, { scenarioId: 'scenario1' }, {});
            (0, globals_1.expect)(result).toEqual(mockHeatmap);
            (0, globals_1.expect)(mockSessionRun).toHaveBeenCalledWith(globals_1.expect.stringContaining('MATCH (s:CrisisScenario {id: $scenarioId})-[:HAS_HEATMAP_DATA]->(h:NarrativeHeatmap)'), globals_1.expect.any(Object));
        });
        (0, globals_1.it)('should fetch strategic response playbooks', async () => {
            const mockPlaybook = [{ id: 'playbook1', name: 'Playbook A' }];
            mockSessionRun.mockResolvedValueOnce({
                records: mockPlaybook.map((p) => createMockRecord(p, 'p')),
            });
            const result = await resolver.getStrategicResponsePlaybooks({}, { scenarioId: 'scenario1' }, {});
            (0, globals_1.expect)(result).toEqual(mockPlaybook);
            (0, globals_1.expect)(mockSessionRun).toHaveBeenCalledWith(globals_1.expect.stringContaining('MATCH (s:CrisisScenario {id: $scenarioId})-[:HAS_PLAYBOOK]->(p:StrategicPlaybook)'), globals_1.expect.any(Object));
        });
    });
    (0, globals_1.describe)('Mutation Resolvers', () => {
        (0, globals_1.it)('should run a war-game simulation and store data', async () => {
            const mockScenarioInput = {
                crisisType: 'geopolitical_conflict',
                targetAudiences: ['allies'],
                keyNarratives: ['disinformation'],
                adversaryProfiles: ['state_actor_X'],
                simulationParameters: { duration: 7 },
            };
            mockSessionRun
                .mockResolvedValueOnce({
                // For CREATE CrisisScenario
                records: [
                    createMockRecord({
                        id: 'mock-uuid',
                        ...mockScenarioInput,
                        createdAt: 'now',
                        updatedAt: 'now',
                    }, 's'),
                ],
            })
                .mockResolvedValueOnce({ records: [] });
            const result = await resolver.runWarGameSimulation({}, { input: mockScenarioInput }, {});
            (0, globals_1.expect)(result).toHaveProperty('id', 'mock-uuid');
            (0, globals_1.expect)(mockSessionRun).toHaveBeenCalledTimes(1);
            (0, globals_1.expect)(mockAxiosPost).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should update a crisis scenario', async () => {
            const mockScenarioInput = {
                crisisType: 'updated_conflict',
                targetAudiences: ['neutrals'],
                keyNarratives: ['unity'],
                adversaryProfiles: ['non_state_actor_Y'],
                simulationParameters: { duration: 10 },
            };
            const updatedScenario = {
                id: 'scenario1',
                ...mockScenarioInput,
                updatedAt: 'now',
            };
            mockSessionRun.mockResolvedValueOnce({
                records: [createMockRecord(updatedScenario, 's')],
            });
            const result = await resolver.updateCrisisScenario({}, { id: 'scenario1', input: mockScenarioInput }, {});
            (0, globals_1.expect)(result).toEqual(globals_1.expect.objectContaining({
                id: 'scenario1',
                crisisType: 'updated_conflict',
            }));
            (0, globals_1.expect)(mockSessionRun).toHaveBeenCalledWith(globals_1.expect.stringContaining('MATCH (s:CrisisScenario {id: $id})'), globals_1.expect.objectContaining({
                id: 'scenario1',
                crisisType: 'updated_conflict',
            }));
        });
        (0, globals_1.it)('should delete a crisis scenario', async () => {
            mockSessionRun.mockResolvedValueOnce({
                summary: { counters: { nodesDeleted: 1 } },
            });
            const result = await resolver.deleteCrisisScenario({}, { id: 'scenario1' }, {});
            (0, globals_1.expect)(result).toBe(true);
            (0, globals_1.expect)(mockSessionRun).toHaveBeenCalledWith(globals_1.expect.stringContaining('MATCH (s:CrisisScenario {id: $id}) DETACH DELETE s'), { id: 'scenario1' });
        });
    });
});
