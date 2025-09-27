import { WargameResolver } from '../WargameResolver';
import { getNeo4jDriver } from '../../db/neo4j'; // Import the actual driver getter
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Mock Neo4j Driver
jest.mock('../../db/neo4j', () => ({
  getNeo4jDriver: jest.fn(() => ({
    session: jest.fn(() => ({
      run: jest.fn(),
      close: jest.fn(),
    })),
  })),
}));

// Mock axios
jest.mock('axios');

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

describe('WargameResolver', () => {
  let resolver: WargameResolver;
  let mockSessionRun: jest.Mock;
  let mockAxiosPost: jest.Mock;

  beforeEach(() => {
    resolver = new WargameResolver();
    mockSessionRun = (getNeo4jDriver() as any).session().run;
    mockAxiosPost = axios.post as jest.Mock;
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
        { id: 'scenario1', crisisType: 'geo', createdAt: '2023-01-01T00:00:00Z' },
        { id: 'scenario2', crisisType: 'cyber', createdAt: '2023-01-02T00:00:00Z' },
      ];
      mockSessionRun.mockResolvedValueOnce({
        records: mockScenarios.map(s => createMockRecord(s, 's')),
      });

      const result = await resolver.getAllCrisisScenarios({}, {}, {} as any);
      expect(result).toEqual(mockScenarios);
      expect(mockSessionRun).toHaveBeenCalledWith(expect.stringContaining('MATCH (s:CrisisScenario)'));
    });

    it('should fetch a single crisis scenario by ID', async () => {
      const mockScenario = { id: 'scenario1', crisisType: 'geo' };
      mockSessionRun.mockResolvedValueOnce({
        records: [createMockRecord(mockScenario, 's')],
      });

      const result = await resolver.getCrisisScenario({}, { id: 'scenario1' }, {} as any);
      expect(result).toEqual(mockScenario);
      expect(mockSessionRun).toHaveBeenCalledWith(expect.stringContaining('MATCH (s:CrisisScenario {id: $id})'), { id: 'scenario1' });
    });

    it('should return undefined if crisis scenario not found', async () => {
      mockSessionRun.mockResolvedValueOnce({ records: [] });
      const result = await resolver.getCrisisScenario({}, { id: 'nonexistent' }, {} as any);
      expect(result).toBeUndefined();
    });

    it('should fetch crisis telemetry', async () => {
      const mockTelemetry = [{ id: 'tele1', platform: 'X', content: 'test' }];
      mockSessionRun.mockResolvedValueOnce({
        records: mockTelemetry.map(t => createMockRecord(t, 't')),
      });

      const result = await resolver.getCrisisTelemetry({}, { scenarioId: 'scenario1' }, {} as any);
      expect(result).toEqual(mockTelemetry);
      expect(mockSessionRun).toHaveBeenCalledWith(expect.stringContaining('MATCH (s:CrisisScenario {id: $scenarioId})-[:HAS_TELEMETRY]->(t:SocialMediaPost)'), expect.any(Object));
    });

    it('should fetch adversary intent estimates', async () => {
      const mockIntent = [{ id: 'intent1', estimatedIntent: 'disinfo' }];
      mockSessionRun.mockResolvedValueOnce({
        records: mockIntent.map(i => createMockRecord(i, 'i')),
      });

      const result = await resolver.getAdversaryIntentEstimates({}, { scenarioId: 'scenario1' }, {} as any);
      expect(result).toEqual(mockIntent);
      expect(mockSessionRun).toHaveBeenCalledWith(expect.stringContaining('MATCH (s:CrisisScenario {id: $scenarioId})-[:HAS_INTENT_ESTIMATE]->(i:AdversaryIntent)'), expect.any(Object));
    });

    it('should fetch narrative heatmap data', async () => {
      const mockHeatmap = [{ id: 'heatmap1', narrative: 'narrativeA' }];
      mockSessionRun.mockResolvedValueOnce({
        records: mockHeatmap.map(h => createMockRecord(h, 'h')),
      });

      const result = await resolver.getNarrativeHeatmapData({}, { scenarioId: 'scenario1' }, {} as any);
      expect(result).toEqual(mockHeatmap);
      expect(mockSessionRun).toHaveBeenCalledWith(expect.stringContaining('MATCH (s:CrisisScenario {id: $scenarioId})-[:HAS_HEATMAP_DATA]->(h:NarrativeHeatmap)'), expect.any(Object));
    });

    it('should fetch strategic response playbooks', async () => {
      const mockPlaybook = [{ id: 'playbook1', name: 'Playbook A' }];
      mockSessionRun.mockResolvedValueOnce({
        records: mockPlaybook.map(p => createMockRecord(p, 'p')),
      });

      const result = await resolver.getStrategicResponsePlaybooks({}, { scenarioId: 'scenario1' }, {} as any);
      expect(result).toEqual(mockPlaybook);
      expect(mockSessionRun).toHaveBeenCalledWith(expect.stringContaining('MATCH (s:CrisisScenario {id: $scenarioId})-[:HAS_PLAYBOOK]->(p:StrategicPlaybook)'), expect.any(Object));
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

      mockSessionRun.mockResolvedValueOnce({ // For CREATE CrisisScenario
        records: [createMockRecord({ id: 'mock-uuid', ...mockScenarioInput, createdAt: 'now', updatedAt: 'now' }, 's')],
      }).mockResolvedValue({ // For subsequent MERGE operations
        records: [],
      });

      mockAxiosPost.mockImplementation((url: string) => {
        if (url.includes('/analyze-telemetry')) {
          return Promise.resolve({ data: { entities: [], sentiment: 0.5, narratives: ['disinformation'] } });
        }
        if (url.includes('/estimate-intent')) {
          return Promise.resolve({ data: { estimated_intent: 'high', likelihood: 0.9, reasoning: 'test' } });
        }
        if (url.includes('/generate-playbook')) {
          return Promise.resolve({ data: { name: 'Playbook', doctrine_reference: 'JP', description: 'desc', steps: [], metrics_of_effectiveness: [], metrics_of_performance: [] } });
        }
        return Promise.reject(new Error('Unknown API call'));
      });

      const result = await resolver.runWarGameSimulation({}, { input: mockScenarioInput }, {} as any);

      expect(result).toHaveProperty('id', 'mock-uuid');
      expect(mockSessionRun).toHaveBeenCalledTimes(7); // 1 for scenario, 3 for relationships, 3 for data
      expect(mockAxiosPost).toHaveBeenCalledTimes(3); // analyze, intent, playbook
      expect(mockAxiosPost).toHaveBeenCalledWith(expect.stringContaining('/analyze-telemetry'), expect.any(Object));
      expect(mockAxiosPost).toHaveBeenCalledWith(expect.stringContaining('/estimate-intent'), expect.any(Object));
      expect(mockAxiosPost).toHaveBeenCalledWith(expect.stringContaining('/generate-playbook'), expect.any(Object));
    });

    it('should update a crisis scenario', async () => {
      const mockScenarioInput = {
        crisisType: 'updated_conflict',
        targetAudiences: ['neutrals'],
        keyNarratives: ['unity'],
        adversaryProfiles: ['non_state_actor_Y'],
        simulationParameters: { duration: 10 },
      };
      const updatedScenario = { id: 'scenario1', ...mockScenarioInput, updatedAt: 'now' };

      mockSessionRun.mockResolvedValueOnce({
        records: [createMockRecord(updatedScenario, 's')],
      });

      const result = await resolver.updateCrisisScenario({}, { id: 'scenario1', input: mockScenarioInput }, {} as any);
      expect(result).toEqual(expect.objectContaining({ id: 'scenario1', crisisType: 'updated_conflict' }));
      expect(mockSessionRun).toHaveBeenCalledWith(expect.stringContaining('MATCH (s:CrisisScenario {id: $id}) SET s.crisisType = $crisisType'), expect.any(Object));
    });

    it('should delete a crisis scenario', async () => {
      mockSessionRun.mockResolvedValueOnce({
        summary: { counters: { nodesDeleted: 1 } },
      });

      const result = await resolver.deleteCrisisScenario({}, { id: 'scenario1'}, {} as any);
      expect(result).toBe(true);
      expect(mockSessionRun).toHaveBeenCalledWith(expect.stringContaining('MATCH (s:CrisisScenario {id: $id}) DETACH DELETE s'), { id: 'scenario1' });
    });
  });
});
