import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { OSINTService, OSINTTarget } from '../OSINTService';
import { getNeo4jDriver, getPostgresPool } from '../../config/database.js';

// Mock dependencies (Same as unit test, but structured to verify the flow)
jest.mock('../../config/database.js', () => ({
  getNeo4jDriver: jest.fn(),
  getPostgresPool: jest.fn(),
}));

jest.mock('../../utils/logger.js', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('OSINTService Workflow (Simulated E2E)', () => {
  let service: OSINTService;
  let mockSession: any;
  let mockPool: any;
  let runSpy: any;
  let querySpy: any;

  beforeEach(() => {
    runSpy = jest.fn().mockResolvedValue({ records: [] } as never);
    mockSession = {
      run: runSpy,
      close: jest.fn().mockResolvedValue(undefined as never),
    };
    (getNeo4jDriver as jest.Mock).mockReturnValue({
      session: jest.fn().mockReturnValue(mockSession),
      close: jest.fn(),
    });

    querySpy = jest.fn().mockResolvedValue({ rows: [] } as never);
    mockPool = {
      query: querySpy,
    };
    (getPostgresPool as jest.Mock).mockReturnValue(mockPool);

    service = new OSINTService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should execute a full enrichment pipeline for mixed targets', async () => {
    const targets: OSINTTarget[] = [
      { type: 'ip', value: '8.8.8.8' },
      { type: 'domain', value: 'google.com' }
    ];

    // Execute Bulk Process
    const results = await service.processBulk(targets, 2);

    // 1. Verify Results
    expect(results).toHaveLength(2);
    const ipResult = results.find(r => r.target.type === 'ip');
    const domainResult = results.find(r => r.target.type === 'domain');

    expect(ipResult?.result).toBeDefined();
    expect(domainResult?.result).toBeDefined();

    // 2. Verify Graph Interactions (Nodes created)
    // We expect 2 run calls (one for each target)
    expect(runSpy).toHaveBeenCalledTimes(2);

    // Check Cypher patterns
    const calls = runSpy.mock.calls;
    const ipCall = calls.find((c: any) => c[0].includes('MERGE (n:IPAddress'));
    const domainCall = calls.find((c: any) => c[0].includes('MERGE (d:Domain'));

    expect(ipCall).toBeDefined();
    expect(domainCall).toBeDefined();

    // 3. Verify Provenance (Audit trail)
    expect(querySpy).toHaveBeenCalledTimes(2);
    expect(querySpy).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO provenance'),
        expect.anything()
    );
  });
});
