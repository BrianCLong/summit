import { threatHuntingService } from '../threatHuntingService';

// Mock dependencies
jest.mock('../../config/database', () => ({
  getNeo4jDriver: jest.fn(),
  getPostgresPool: jest.fn()
}));

const { getNeo4jDriver } = require('../../config/database');

describe('CTI Platform Functionality', () => {
  let mockSession: any;
  let mockRun: jest.Mock;

  beforeEach(() => {
    mockRun = jest.fn();
    mockSession = {
      run: mockRun,
      close: jest.fn().mockResolvedValue(undefined)
    };
    (getNeo4jDriver as jest.Mock).mockReturnValue({
      session: jest.fn().mockReturnValue(mockSession)
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should retrieve threat actors from Neo4j', async () => {
    // Mock Neo4j response
    mockRun.mockResolvedValueOnce({
      records: [
        {
          get: (key: string) => ({
            properties: { stix_id: 'actor-123', name: 'APT28', description: 'Fancy Bear' }
          })
        }
      ]
    });

    const actor = await threatHuntingService.getThreatActor('actor-123');

    expect(mockRun).toHaveBeenCalledWith(
      expect.stringContaining('MATCH (n:THREAT_ACTOR)'),
      expect.objectContaining({ id: 'actor-123' })
    );
    expect(actor).toBeDefined();
    expect(actor.name).toBe('APT28');
  });

  test('should fall back to cache if Neo4j fails', async () => {
    mockRun.mockRejectedValueOnce(new Error('Connection failed'));

    // APT29 is in the in-memory cache
    const actor = await threatHuntingService.getThreatActor('actor-1');

    expect(actor).toBeDefined();
    expect(actor.name).toBe('APT29');
  });

  test('should analyze diamond model with Neo4j', async () => {
    // Mock Neo4j response for capabilities
    mockRun.mockResolvedValueOnce({
      records: [
        {
          get: (key: string) => {
            if (key === 'a') return { properties: { stix_id: 'actor-1', name: 'APT29', description: 'SVR' } };
            if (key === 'malware') return ['MiniDuke'];
            if (key === 'tools') return ['PowerShell'];
            return null;
          }
        }
      ]
    });

    const diamond = await threatHuntingService.analyzeDiamondModel('actor-1');

    expect(mockRun).toHaveBeenCalledWith(
      expect.stringContaining('MATCH (a:THREAT_ACTOR {stix_id: $id})'),
      expect.anything()
    );
    expect(diamond).toBeDefined();
    expect(diamond.capability).toContain('MiniDuke');
    expect(diamond.capability).toContain('PowerShell');
  });

  test('should calculate threat score dynamically', () => {
    // This runs against in-memory cache for now as getThreatScore logic wasn't updated to async/neo4j yet in this test cycle
    // (It relies on synchronous cache lookups in current implementation, which is fine for "getting started")
    const score = threatHuntingService.getThreatScore('actor-1');
    expect(score).toBe(95);
  });

  test('should create and retrieve threat hunts', async () => {
      const now = new Date().toISOString();
      const hunt = await threatHuntingService.createThreatHunt({
          name: 'Test Hunt',
          description: 'Testing CTI',
          hypothesis: 'Test Hypothesis',
          priority: 'HIGH',
          huntType: 'PROACTIVE',
          status: 'PLANNING',
          dataSource: ['splunk'],
          tags: ['test'],
          ttps: ['T1001'],
          iocs: [],
          queries: [],
          findings: [],
          assignedTo: [],
          createdBy: 'tester',
          startDate: now,
          timeline: []
      }, 'tester');

      expect(hunt).toBeDefined();
      expect(hunt.id).toBeDefined();

      const hunts = threatHuntingService.getThreatHunts();
      expect(hunts).toContainEqual(hunt);
  });
});
