import { describe, it, expect, beforeEach, beforeAll, jest } from '@jest/globals';

jest.unstable_mockModule(
  new URL(
    '../../../services/investigationWorkflowService.ts',
    import.meta.url,
  ).pathname,
  () => ({
    investigationWorkflowService: {
      getInvestigation: jest.fn(),
    },
  }),
);

jest.unstable_mockModule(
  new URL('../../../config/logger.ts', import.meta.url).pathname,
  () => ({
    __esModule: true,
    default: {
      info: jest.fn(),
      error: jest.fn(),
      child: jest.fn().mockReturnThis(),
    },
  }),
);

let scenarioService: typeof import('../../../cases/scenarios/ScenarioService.js').scenarioService;
let investigationWorkflowService: {
  getInvestigation: jest.Mock;
};

describe('ScenarioService', () => {
    const mockInvestigationId = 'inv-123';

    beforeAll(async () => {
        ({ scenarioService } = await import('../../../cases/scenarios/ScenarioService.js'));
        ({ investigationWorkflowService } = await import(
          '../../../services/investigationWorkflowService.js'
        ));
    });

    beforeEach(() => {
        // Reset state
        jest.clearAllMocks();
        // @ts-ignore
        scenarioService.scenarios.clear();

        // Mock investigation service response
        // @ts-ignore
        (investigationWorkflowService.getInvestigation as jest.Mock).mockResolvedValue({
            id: mockInvestigationId,
            name: 'Test Investigation',
            status: 'ACTIVE',
            entities: ['e1', 'e2'],
            relationships: ['r1'],
            timeline: [{ id: 't1', title: 'Event 1' } as any],
            priority: 'HIGH',
            assignedTo: [],
            createdBy: 'user1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: [],
            classification: 'INTERNAL',
            workflow: {} as any,
            evidence: [],
            findings: [],
            collaborators: [],
            permissions: []
        });
    });

    it('should create a scenario', async () => {
        const scenario = await scenarioService.createScenario(mockInvestigationId, 'Test Scenario');
        expect(scenario).toBeDefined();
        expect(scenario.investigationId).toBe(mockInvestigationId);
        expect(scenario.name).toBe('Test Scenario');
        expect(scenario.status).toBe('DRAFT');
        expect(scenario.baseStateSnapshot.entities).toEqual(['e1', 'e2']);
    });

    it('should add modifications', async () => {
        const scenario = await scenarioService.createScenario(mockInvestigationId, 'Test Scenario');

        const updatedScenario = await scenarioService.addModification(
            scenario.id,
            'ADD_ENTITY',
            { name: 'Suspect X', type: 'Person' }
        );

        expect(updatedScenario.modifications).toHaveLength(1);
        expect(updatedScenario.modifications[0].type).toBe('ADD_ENTITY');
        expect(updatedScenario.modifications[0].data.name).toBe('Suspect X');
    });

    it('should resolve state correctly', async () => {
        const scenario = await scenarioService.createScenario(mockInvestigationId, 'Test Scenario');

        // Add entity
        await scenarioService.addModification(
            scenario.id,
            'ADD_ENTITY',
            { name: 'New Entity', type: 'Person' },
            'new-ent-1'
        );

        // Remove entity
        await scenarioService.addModification(
            scenario.id,
            'REMOVE_ENTITY',
            null,
            'e1'
        );

        const baseEntities = [
            { id: 'e1', name: 'Entity 1' },
            { id: 'e2', name: 'Entity 2' }
        ];

        const result = scenarioService.resolveState(scenario.id, baseEntities, [], []);

        expect(result.finalState.entities).toHaveLength(2); // e2 + new-ent-1
        expect(result.finalState.entities.find((e: any) => e.id === 'e2')).toBeDefined();
        expect(result.finalState.entities.find((e: any) => e.id === 'new-ent-1')).toBeDefined();
        expect(result.finalState.entities.find((e: any) => e.id === 'e1')).toBeUndefined();
    });
});
