import { describe, it, expect, jest, beforeEach, afterEach, beforeAll } from '@jest/globals';

// Mock dependencies
jest.unstable_mockModule('../../db/neo4j.js', () => ({
  getNeo4jDriver: jest.fn(),
}));

jest.unstable_mockModule('../../config/logger.js', () => ({
  __esModule: true,
  default: {
    child: jest.fn().mockReturnThis(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('GraphConsistencyService', () => {
  let GraphConsistencyService: typeof import('../GraphConsistencyService.js').GraphConsistencyService;
  let getNeo4jDriver: jest.Mock;
  let mockSession: any;
  let mockDriver: any;

  beforeAll(async () => {
    ({ GraphConsistencyService } = await import('../GraphConsistencyService.js'));
    ({ getNeo4jDriver } = await import('../../db/neo4j.js'));
  });

  beforeEach(() => {
    mockSession = {
      run: jest.fn(),
      close: jest.fn(),
    };
    mockDriver = {
      session: jest.fn().mockReturnValue(mockSession),
    };
    (getNeo4jDriver as jest.Mock).mockReturnValue(mockDriver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('detectDanglingNodes should run correct cypher', async () => {
    const service = new GraphConsistencyService();
    mockSession.run.mockResolvedValue({
      records: [
        { get: (key: string) => ({ properties: { id: 'node1' } }) }
      ]
    });

    const nodes = await service.detectDanglingNodes();
    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe('node1');
    expect(mockSession.run).toHaveBeenCalledWith(
      expect.stringContaining('MATCH (n) WHERE NOT (n)--()')
    );
  });

  it('detectSchemaViolations should check all relationships', async () => {
    const service = new GraphConsistencyService();

    // First call gets relationship types
    mockSession.run.mockResolvedValueOnce({
      records: [
        { get: () => 'OWNS' }
      ]
    });

    // Second call checks violations for OWNS
    mockSession.run.mockResolvedValueOnce({
      records: []
    });

    const violations = await service.detectSchemaViolations();
    expect(violations).toEqual([]);
    expect(mockSession.run).toHaveBeenCalledTimes(2);
    // The query should check for NOT ( (a:Person AND b:Asset) OR (a:Org AND b:Asset) )
    expect(mockSession.run).toHaveBeenLastCalledWith(
      expect.stringContaining('WHERE NOT ((a:Person AND b:Asset) OR (a:Org AND b:Asset))')
    );
  });

  it('healOrQueue should queue tasks when issues found', async () => {
    const service = new GraphConsistencyService();

    // Mock detectDanglingNodes
    // @ts-ignore
    service.detectDanglingNodes = jest.fn().mockResolvedValue([{ id: 'badNode' }]);

    // Mock detectSchemaViolations
    // @ts-ignore
    service.detectSchemaViolations = jest.fn().mockResolvedValue([{ type: 'violation' }]);

    const report = await service.healOrQueue(false);

    expect(report.danglingNodesCount).toBe(1);
    expect(report.schemaViolationsCount).toBe(1);
    expect(report.queuedTasksCount).toBe(2);
    expect(report.details.length).toBe(2);
  });

  it('generateWeeklyReport should return a string report', async () => {
    const service = new GraphConsistencyService();
    // @ts-ignore
    service.healOrQueue = jest.fn().mockResolvedValue({
        timestamp: new Date(),
        danglingNodesCount: 5,
        schemaViolationsCount: 2,
        healedCount: 0,
        queuedTasksCount: 7,
        details: ['Queued 5 dangling', 'Queued 2 violations']
    });

    const text = await service.generateWeeklyReport();
    expect(text).toContain('Dangling Nodes: 5');
    expect(text).toContain('Schema Violations: 2');
  });
});
