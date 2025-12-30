import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { IntelGraphService } from '../services/IntelGraphService.js';
import * as neo4j from '../graph/neo4j.js';

// Mock neo4j
jest.mock('../graph/neo4j.js');

// Mock configs and dependencies
jest.mock('../config/database.js', () => ({
  getNeo4jDriver: jest.fn(() => ({
    session: jest.fn(() => ({
      run: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    })),
  })),
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
  let mockDriver: any;
  let mockSession: any;

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-initialize to ensure fresh mocks
    // @ts-ignore
    IntelGraphService.instance = null;
    service = IntelGraphService.getInstance();

    // Get access to the mock session
    // @ts-ignore
    const { getNeo4jDriver } = require('../config/database.js');
    mockDriver = getNeo4jDriver();
    mockSession = mockDriver.session();
  });

  describe('createEntity', () => {
    it('should create an entity and log to ledger', async () => {
      const owner = 'user-1';
      const tenantId = 't1';
      const entityData = { name: 'Test Entity', description: 'Description' };

      const mockRecord = {
        get: jest.fn().mockReturnValue({ properties: { id: 'uuid-1', ...entityData } })
      };
      mockSession.run.mockResolvedValue({ records: [mockRecord] });

      const result = await service.createEntity(entityData, owner, tenantId);

      expect(result).toHaveProperty('id', 'uuid-1');
      expect(result.name).toBe('Test Entity');
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE (e:Entity'),
        expect.objectContaining({ props: expect.objectContaining({ name: 'Test Entity' }) })
      );
    });
  });

  describe('createClaim', () => {
    it('should create a claim linked to an entity', async () => {
      const owner = 'user-1';
      const tenantId = 't1';
      const claimData = { statement: 'AI is great', confidence: 0.9, entityId: 'e-1' };

      const mockRecord = {
        get: jest.fn().mockReturnValue({ properties: { id: 'c-1', ...claimData } })
      };
      mockSession.run.mockResolvedValue({ records: [mockRecord] });

      const result = await service.createClaim(claimData, owner, tenantId);

      expect(result).toHaveProperty('id', 'c-1');
      expect(result.statement).toBe('AI is great');
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE (c:Claim'),
        expect.anything()
      );
    });
  });
});
