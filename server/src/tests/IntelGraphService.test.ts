import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { IntelGraphService } from '../services/IntelGraphService.js';

// Define shared mocks
const mockRun = jest.fn() as jest.MockedFunction<
  (...args: any[]) => Promise<any>
>;
const mockClose = jest.fn() as jest.MockedFunction<() => Promise<void>>;
const mockSession = { run: mockRun, close: mockClose };
const mockDriver = { session: jest.fn(() => mockSession) };

// Mock neo4j
jest.mock('../graph/neo4j.js');

// Mock configs and dependencies
jest.mock('../config/database.js', () => ({
  getNeo4jDriver: jest.fn(() => mockDriver),
  getPostgresPool: jest.fn(),
  getRedisClient: jest.fn(),
}));

jest.mock('../audit/advanced-audit-system.js', () => ({
  advancedAuditSystem: {
    logEvent: jest.fn(),
  },
}));

jest.mock('../provenance/ledger.js', () => ({
  provenanceLedger: {
    appendEntry: jest.fn(),
  },
  ProvenanceLedgerV2: jest.fn(),
}));

describe('IntelGraphService', () => {
  let service: IntelGraphService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-initialize to ensure fresh mocks
    // @ts-ignore
    IntelGraphService.instance = null;
    mockClose.mockResolvedValue(undefined);
    const dbModule = jest.requireMock('../config/database.js') as {
      getNeo4jDriver: jest.Mock;
    };
    dbModule.getNeo4jDriver.mockReturnValue(mockDriver);
    (mockDriver.session as jest.Mock).mockReturnValue(mockSession);
    service = IntelGraphService.getInstance();
  });

  describe('createEntity', () => {
    it('should create an entity and log to ledger', async () => {
      const owner = 'user-1';
      const tenantId = 't1';
      const entityData = { name: 'Test Entity', description: 'Description' };

      const mockRecord = {
        get: jest.fn().mockReturnValue({ properties: { id: 'uuid-1', ...entityData } })
      };
      // Reset mockRun implementation for this test
      mockRun.mockResolvedValue({ records: [mockRecord] });

      const result = await service.createEntity(entityData, owner, tenantId);

      expect(result).toHaveProperty('id', 'uuid-1');
      expect(result.name).toBe('Test Entity');
      expect(mockRun).toHaveBeenCalledWith(
        expect.stringContaining('CREATE (e:Entity'),
        expect.objectContaining({ props: expect.objectContaining({ name: 'Test Entity' }) })
      );
    });
  });

  describe('createClaim', () => {
    it('should create a claim linked to an entity', async () => {
      const owner = 'user-1';
      const tenantId = 't1';
      const claimData = {
        statement: 'AI is great',
        confidence: 0.9,
        entityId: '11111111-1111-1111-1111-111111111111',
      };

      const mockRecord = {
        get: jest.fn().mockReturnValue({ properties: { id: 'c-1', ...claimData } })
      };
      mockRun.mockResolvedValue({ records: [mockRecord] });

      const result = await service.createClaim(claimData, owner, tenantId);

      expect(result).toHaveProperty('id', 'c-1');
      expect(result.statement).toBe('AI is great');
      expect(mockRun).toHaveBeenCalledWith(
        expect.stringContaining('CREATE (c:Claim'),
        expect.anything()
      );
    });
  });
});
