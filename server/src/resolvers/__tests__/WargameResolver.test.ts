import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';

// Mock Neo4j Driver
jest.unstable_mockModule('../../db/neo4j.js', () => ({
  getNeo4jDriver: jest.fn(() => ({
    session: jest.fn(() => ({
      run: jest.fn(),
      close: jest.fn(),
    })),
  })),
}));

// Mock axios
jest.unstable_mockModule('axios', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

// Mock node:crypto
jest.unstable_mockModule('node:crypto', () => ({
  randomUUID: jest.fn(),
}));

describe('WargameResolver', () => {
  let WargameResolver: typeof import('../WargameResolver.js').WargameResolver;
  let getNeo4jDriver: jest.Mock;
  let axios: typeof import('axios').default;
  let uuidv4: jest.Mock;
  let resolver: WargameResolver;
  let mockSessionRun: jest.MockedFunction<(...args: any[]) => Promise<any>>;
  let mockAxiosPost: jest.MockedFunction<(...args: any[]) => Promise<any>>;

  beforeAll(async () => {
    ({ WargameResolver } = await import('../WargameResolver.js'));
    ({ getNeo4jDriver } = await import('../../db/neo4j.js'));
    axios = (await import('axios')).default;
    ({ randomUUID: uuidv4 } = await import('node:crypto'));
  });

  beforeEach(() => {
    mockSessionRun = jest.fn() as jest.MockedFunction<
      (...args: any[]) => Promise<any>
    >;
    const mockSession = {
      run: mockSessionRun,
      close: jest.fn(),
    };
    const mockDriver = {
      session: jest.fn(() => mockSession),
    };
    (getNeo4jDriver as jest.Mock).mockReturnValue(mockDriver);

    resolver = new WargameResolver();

    const mockedAxios = axios as jest.Mocked<typeof axios>;
    mockAxiosPost = mockedAxios.post as jest.MockedFunction<
      (...args: any[]) => Promise<any>
    >;
    (uuidv4 as jest.Mock).mockReturnValue('mock-uuid');

    // Reset mocks before each test
    mockSessionRun.mockReset();
    mockAxiosPost.mockReset();
  });

  // Helper to create a mock Neo4j result record
  const createMockRecord = (properties: any, type: string = 'node') => ({
    get: jest.fn((key: string) => {
      if (key === type) {
        return { properties };
      }
      return undefined;
    }),
  });

  describe('Query Resolvers', () => {
    it('should fetch all crisis scenarios', async () => {
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
      } as any);

      const result = await resolver.getAllCrisisScenarios({}, {}, {} as any);
      expect(result).toEqual(mockScenarios);
      expect(mockSessionRun).toHaveBeenCalledWith(
        expect.stringContaining('MATCH (s:CrisisScenario)'),
      );
    });

    it('should fetch a single crisis scenario by ID', async () => {
      const mockScenario = { id: 'scenario1', crisisType: 'geo' };
      mockSessionRun.mockResolvedValueOnce({
        records: [createMockRecord(mockScenario, 's')],
      } as any);

      const result = await resolver.getCrisisScenario(
        {},
        { id: 'scenario1' },
        {} as any,
      );
      expect(result).toEqual(mockScenario);
      expect(mockSessionRun).toHaveBeenCalledWith(
        expect.stringContaining('MATCH (s:CrisisScenario {id: $id})'),
        { id: 'scenario1' },
      );
    });

    it('should return undefined if crisis scenario not found', async () => {
      mockSessionRun.mockResolvedValueOnce({ records: [] } as any);
      const result = await resolver.getCrisisScenario(
        {},
        { id: 'nonexistent' },
        {} as any,
      );
      expect(result).toBeUndefined();
    });

    it('should fetch crisis telemetry', async () => {
      const mockTelemetry = [{ id: 'tele1', platform: 'X', content: 'test' }];
      mockSessionRun.mockResolvedValueOnce({
        records: mockTelemetry.map((t) => createMockRecord(t, 't')),
      } as any);

      const result = await resolver.getCrisisTelemetry(
        {},
        { scenarioId: 'scenario1' },
        {} as any,
      );
      expect(result).toEqual(mockTelemetry);
      expect(mockSessionRun).toHaveBeenCalledWith(
        expect.stringContaining(
          'MATCH (s:CrisisScenario {id: $scenarioId})-[:HAS_TELEMETRY]->(t:SocialMediaPost)',
        ),
        expect.any(Object),
      );
    });

    it('should fetch adversary intent estimates', async () => {
      const mockIntent = [{ id: 'intent1', estimatedIntent: 'disinfo' }];
      mockSessionRun.mockResolvedValueOnce({
        records: mockIntent.map((i) => createMockRecord(i, 'i')),
      } as any);

      const result = await resolver.getAdversaryIntentEstimates(
        {},
        { scenarioId: 'scenario1' },
        {} as any,
      );
      expect(result).toEqual(mockIntent);
      expect(mockSessionRun).toHaveBeenCalledWith(
        expect.stringContaining(
          'MATCH (s:CrisisScenario {id: $scenarioId})-[:HAS_INTENT_ESTIMATE]->(i:AdversaryIntent)',
        ),
        expect.any(Object),
      );
    });

    it('should fetch narrative heatmap data', async () => {
      const mockHeatmap = [{ id: 'heatmap1', narrative: 'narrativeA' }];
      mockSessionRun.mockResolvedValueOnce({
        records: mockHeatmap.map((h) => createMockRecord(h, 'h')),
      } as any);

      const result = await resolver.getNarrativeHeatmapData(
        {},
        { scenarioId: 'scenario1' },
        {} as any,
      );
      expect(result).toEqual(mockHeatmap);
      expect(mockSessionRun).toHaveBeenCalledWith(
        expect.stringContaining(
          'MATCH (s:CrisisScenario {id: $scenarioId})-[:HAS_HEATMAP_DATA]->(h:NarrativeHeatmap)',
        ),
        expect.any(Object),
      );
    });

    it('should fetch strategic response playbooks', async () => {
      const mockPlaybook = [{ id: 'playbook1', name: 'Playbook A' }];
      mockSessionRun.mockResolvedValueOnce({
        records: mockPlaybook.map((p) => createMockRecord(p, 'p')),
      } as any);

      const result = await resolver.getStrategicResponsePlaybooks(
        {},
        { scenarioId: 'scenario1' },
        {} as any,
      );
      expect(result).toEqual(mockPlaybook);
      expect(mockSessionRun).toHaveBeenCalledWith(
        expect.stringContaining(
          'MATCH (s:CrisisScenario {id: $scenarioId})-[:HAS_PLAYBOOK]->(p:StrategicPlaybook)',
        ),
        expect.any(Object),
      );
    });
  });

  describe('Mutation Resolvers', () => {
    it('should run a war-game simulation and store data', async () => {
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
            createMockRecord(
              {
                id: 'mock-uuid',
                ...mockScenarioInput,
                createdAt: 'now',
                updatedAt: 'now',
              },
              's',
            ),
          ],
        } as any)
        .mockResolvedValueOnce({ records: [] } as any);

      const result = await resolver.runWarGameSimulation(
        {},
        { input: mockScenarioInput },
        {} as any,
      );

      expect(result).toHaveProperty('id', 'mock-uuid');
      expect(mockSessionRun).toHaveBeenCalledTimes(1);
      expect(mockAxiosPost).not.toHaveBeenCalled();
    });

    it('should update a crisis scenario', async () => {
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
      } as any);

      const result = await resolver.updateCrisisScenario(
        {},
        { id: 'scenario1', input: mockScenarioInput },
        {} as any,
      );
      expect(result).toEqual(
        expect.objectContaining({
          id: 'scenario1',
          crisisType: 'updated_conflict',
        }),
      );
      expect(mockSessionRun).toHaveBeenCalledWith(
        expect.stringContaining('MATCH (s:CrisisScenario {id: $id})'),
        expect.objectContaining({
          id: 'scenario1',
          crisisType: 'updated_conflict',
        }),
      );
    });

    it('should delete a crisis scenario', async () => {
      mockSessionRun.mockResolvedValueOnce({
        summary: { counters: { nodesDeleted: 1 } },
      } as any);

      const result = await resolver.deleteCrisisScenario(
        {},
        { id: 'scenario1' },
        {} as any,
      );
      expect(result).toBe(true);
      expect(mockSessionRun).toHaveBeenCalledWith(
        expect.stringContaining(
          'MATCH (s:CrisisScenario {id: $id}) DETACH DELETE s',
        ),
        { id: 'scenario1' },
      );
    });
  });
});
