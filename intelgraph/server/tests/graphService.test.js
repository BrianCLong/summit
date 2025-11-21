// intelgraph/server/tests/graphService.test.js
const GraphService = require('../src/services/GraphService');
const { getNeo4jDriver } = require('../src/config/database');

// Mock Neo4j Driver and Session
jest.mock('../src/config/database', () => ({
  getNeo4jDriver: jest.fn(),
  connectNeo4j: jest.fn(),
  connectPostgres: jest.fn(),
  connectRedis: jest.fn(),
  closeConnections: jest.fn(),
}));

describe('GraphService', () => {
  let graphService;
  let mockSession;
  let mockRun;
  let mockClose;

  beforeEach(() => {
    mockRun = jest.fn();
    mockClose = jest.fn();
    mockSession = {
      run: mockRun,
      close: mockClose,
    };

    getNeo4jDriver.mockReturnValue({
      session: jest.fn(() => mockSession),
    });

    graphService = new GraphService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInvestigationGraph', () => {
    it('should return nodes and edges', async () => {
      const mockRecords = [
        {
          get: (key) => {
            if (key === 'e') return { properties: { id: '1', type: 'Entity' }, labels: ['Entity'] };
            if (key === 'e2') return { properties: { id: '2', type: 'Entity' }, labels: ['Entity'] };
            if (key === 'r') return { properties: { id: 'r1' }, type: 'RELATIONSHIP' };
            return null;
          },
        },
      ];

      mockRun.mockResolvedValue({ records: mockRecords });

      const result = await graphService.getInvestigationGraph('inv1');

      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(1);
      expect(result.metadata.nodeCount).toBe(2);
      expect(result.metadata.edgeCount).toBe(1);
      expect(mockRun).toHaveBeenCalledWith(expect.any(String), { investigationId: 'inv1', limit: 1000 });
    });
  });

  describe('createDecision', () => {
    it('should create a decision with provenance', async () => {
      const mockDecision = {
        id: 'd1',
        title: 'Decision 1',
        rationale: 'Because',
        status: 'PENDING'
      };

      mockRun.mockResolvedValue({
        records: [{
          get: () => ({ properties: mockDecision })
        }]
      });

      const result = await graphService.createDecision({
        investigationId: 'inv1',
        title: 'Decision 1',
        rationale: 'Because',
        evidenceIds: ['e1', 'e2'],
        userId: 'user1'
      });

      expect(result).toEqual(mockDecision);
      expect(mockRun).toHaveBeenCalledWith(expect.stringContaining('CREATE (d:Decision'), expect.objectContaining({
          investigationId: 'inv1',
          title: 'Decision 1',
          evidenceIds: ['e1', 'e2']
      }));
    });
  });
});
