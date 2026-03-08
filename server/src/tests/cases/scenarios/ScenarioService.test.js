"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Mock dependencies BEFORE importing the service under test
globals_1.jest.mock('../../../services/investigationWorkflowService.js', () => ({
    investigationWorkflowService: {
        getInvestigation: globals_1.jest.fn(),
    },
}));
globals_1.jest.mock('../../../config/logger.js', () => ({
    __esModule: true,
    default: {
        info: globals_1.jest.fn(),
        error: globals_1.jest.fn(),
        child: globals_1.jest.fn().mockReturnThis(),
    },
}));
const ScenarioService_js_1 = require("../../../cases/scenarios/ScenarioService.js");
const investigationWorkflowService_js_1 = require("../../../services/investigationWorkflowService.js");
(0, globals_1.describe)('ScenarioService', () => {
    const mockInvestigationId = 'inv-123';
    (0, globals_1.beforeEach)(() => {
        // Reset state
        globals_1.jest.clearAllMocks();
        // @ts-ignore
        ScenarioService_js_1.scenarioService.scenarios.clear();
        // Mock investigation service response
        // @ts-ignore
        investigationWorkflowService_js_1.investigationWorkflowService.getInvestigation.mockResolvedValue({
            id: mockInvestigationId,
            name: 'Test Investigation',
            status: 'ACTIVE',
            entities: ['e1', 'e2'],
            relationships: ['r1'],
            timeline: [{ id: 't1', title: 'Event 1' }],
            priority: 'HIGH',
            assignedTo: [],
            createdBy: 'user1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: [],
            classification: 'INTERNAL',
            workflow: {},
            evidence: [],
            findings: [],
            collaborators: [],
            permissions: []
        });
    });
    (0, globals_1.it)('should create a scenario', async () => {
        const scenario = await ScenarioService_js_1.scenarioService.createScenario(mockInvestigationId, 'Test Scenario');
        (0, globals_1.expect)(scenario).toBeDefined();
        (0, globals_1.expect)(scenario.investigationId).toBe(mockInvestigationId);
        (0, globals_1.expect)(scenario.name).toBe('Test Scenario');
        (0, globals_1.expect)(scenario.status).toBe('DRAFT');
        (0, globals_1.expect)(scenario.baseStateSnapshot.entities).toEqual(['e1', 'e2']);
    });
    (0, globals_1.it)('should add modifications', async () => {
        const scenario = await ScenarioService_js_1.scenarioService.createScenario(mockInvestigationId, 'Test Scenario');
        const updatedScenario = await ScenarioService_js_1.scenarioService.addModification(scenario.id, 'ADD_ENTITY', { name: 'Suspect X', type: 'Person' });
        (0, globals_1.expect)(updatedScenario.modifications).toHaveLength(1);
        (0, globals_1.expect)(updatedScenario.modifications[0].type).toBe('ADD_ENTITY');
        (0, globals_1.expect)(updatedScenario.modifications[0].data.name).toBe('Suspect X');
    });
    (0, globals_1.it)('should resolve state correctly', async () => {
        const scenario = await ScenarioService_js_1.scenarioService.createScenario(mockInvestigationId, 'Test Scenario');
        // Add entity
        await ScenarioService_js_1.scenarioService.addModification(scenario.id, 'ADD_ENTITY', { name: 'New Entity', type: 'Person' }, 'new-ent-1');
        // Remove entity
        await ScenarioService_js_1.scenarioService.addModification(scenario.id, 'REMOVE_ENTITY', null, 'e1');
        const baseEntities = [
            { id: 'e1', name: 'Entity 1' },
            { id: 'e2', name: 'Entity 2' }
        ];
        const result = ScenarioService_js_1.scenarioService.resolveState(scenario.id, baseEntities, [], []);
        (0, globals_1.expect)(result.finalState.entities).toHaveLength(2); // e2 + new-ent-1
        (0, globals_1.expect)(result.finalState.entities.find((e) => e.id === 'e2')).toBeDefined();
        (0, globals_1.expect)(result.finalState.entities.find((e) => e.id === 'new-ent-1')).toBeDefined();
        (0, globals_1.expect)(result.finalState.entities.find((e) => e.id === 'e1')).toBeUndefined();
    });
});
