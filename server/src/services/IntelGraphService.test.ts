// server/src/services/IntelGraphService.test.ts
import { IntelGraphService } from './IntelGraphService';
import { getNeo4jDriver } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

// Mock the database driver
jest.mock('../config/database');
jest.mock('uuid');

const mockGetNeo4jDriver = getNeo4jDriver as jest.Mock;
const mockUuidv4 = uuidv4 as jest.Mock;

describe('IntelGraphService', () => {
  let mockSession;
  let mockDriver;

  beforeEach(() => {
    // Reset the service instance before each test to ensure isolation
    IntelGraphService._resetForTesting();

    // Mock the Neo4j session and its 'run' and 'close' methods
    mockSession = {
      run: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };

    // Mock the driver to return our mock session
    mockDriver = {
      session: jest.fn(() => mockSession),
    };

    // Configure the mocked getNeo4jDriver to return our mock driver
    mockGetNeo4jDriver.mockReturnValue(mockDriver);

    // Mock uuidv4 to return a predictable value
    mockUuidv4.mockReturnValue('mock-uuid-1234');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance when getInstance is called multiple times', () => {
      const instance1 = IntelGraphService.getInstance();
      const instance2 = IntelGraphService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should return a new instance after _resetForTesting is called', () => {
      const instance1 = IntelGraphService.getInstance();
      IntelGraphService._resetForTesting();
      const instance2 = IntelGraphService.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('createEntity', () => {
    it('should create an entity with the correct properties and return it', async () => {
      const entityData = {
        name: 'Test Entity',
        description: 'A test entity for unit testing.',
      };
      const owner = 'user-1';
      const tenantId = 'tenant-1';

      const mockRecord = {
        get: jest.fn().mockReturnValue({
          properties: {
            id: 'mock-uuid-1234',
            ...entityData,
            owner,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          },
        }),
      };
      mockSession.run.mockResolvedValue({ records: [mockRecord] });

      const service = IntelGraphService.getInstance();
      const result = await service.createEntity(entityData, owner, tenantId);

      expect(mockDriver.session).toHaveBeenCalledTimes(1);
      expect(mockSession.run).toHaveBeenCalledTimes(1);
      expect(mockSession.run.mock.calls[0][0]).toContain('CREATE (e:Entity');
      expect(mockSession.run.mock.calls[0][1]).toMatchObject({
        id: 'mock-uuid-1234',
        ...entityData,
        owner,
        tenantId,
      });
      expect(mockSession.close).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
      expect(result.id).toBe('mock-uuid-1234');
      expect(result.name).toBe(entityData.name);
    });
  });

  describe('createClaim', () => {
    it('should create a claim, link it to an entity, and return the claim', async () => {
      const claimData = {
        statement: 'This is a test claim.',
        confidence: 0.95,
        entityId: 'entity-uuid-5678',
      };
      const owner = 'user-2';
      const tenantId = 'tenant-2';

      const mockRecord = {
        get: jest.fn().mockReturnValue({
          properties: {
            id: 'mock-uuid-1234',
            statement: claimData.statement,
            confidence: claimData.confidence,
            owner,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          },
        }),
      };
      mockSession.run.mockResolvedValue({ records: [mockRecord] });

      const service = IntelGraphService.getInstance();
      const result = await service.createClaim(claimData, owner, tenantId);

      expect(mockDriver.session).toHaveBeenCalledTimes(1);
      expect(mockSession.run).toHaveBeenCalledTimes(1);
      expect(mockSession.run.mock.calls[0][0]).toContain('MATCH (e:Entity');
      expect(mockSession.run.mock.calls[0][0]).toContain('CREATE (c:Claim');
      expect(mockSession.run.mock.calls[0][0]).toContain('CREATE (c)-[:RELATES_TO]->(e)');
      expect(mockSession.run.mock.calls[0][1]).toMatchObject({
        id: 'mock-uuid-1234',
        statement: claimData.statement,
        confidence: claimData.confidence,
        entityId: claimData.entityId,
        owner,
        tenantId,
      });
      expect(mockSession.close).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
      expect(result.id).toBe('mock-uuid-1234');
    });

    it('should throw an AppError if the target entity does not exist', async () => {
      const claimData = {
        statement: 'This claim will fail.',
        confidence: 0.5,
        entityId: 'non-existent-entity',
      };
      const owner = 'user-3';
      const tenantId = 'tenant-3';

      // Mock a response with no records, simulating a failed MATCH
      mockSession.run.mockResolvedValue({ records: [] });

      const service = IntelGraphService.getInstance();

      await expect(
        service.createClaim(claimData, owner, tenantId)
      ).rejects.toThrow('Entity with ID non-existent-entity not found for this tenant.');
    });
  });

  describe('attachEvidence', () => {
    it('should create an evidence node, link it to a claim, and return the evidence', async () => {
        const evidenceData = {
            claimId: 'claim-uuid-123',
            sourceURI: 'https://example.com/evidence',
            hash: 'sha256-hash',
            content: 'This is the evidence content.',
        };
        const owner = 'user-evi';
        const tenantId = 'tenant-evi';
        mockUuidv4.mockReturnValue('mock-uuid-evidence');

        const mockRecord = { get: jest.fn().mockReturnValue({ properties: { id: 'mock-uuid-evidence', ...evidenceData } }) };
        mockSession.run.mockResolvedValue({ records: [mockRecord] });

        const service = IntelGraphService.getInstance();
        const result = await service.attachEvidence(evidenceData, owner, tenantId);

        expect(mockSession.run).toHaveBeenCalledTimes(1);
        expect(mockSession.run.mock.calls[0][0]).toContain('MATCH (c:Claim {id: $claimId, tenantId: $tenantId})');
        expect(mockSession.run.mock.calls[0][0]).toContain('CREATE (ev:Evidence');
        expect(mockSession.run.mock.calls[0][0]).toContain('CREATE (ev)-[:SUPPORTS]->(c)');
        expect(mockSession.run.mock.calls[0][1]).toMatchObject({ id: 'mock-uuid-evidence', ...evidenceData, owner, tenantId });
        expect(result.id).toBe('mock-uuid-evidence');
    });

    it('should throw an AppError if the target claim does not exist', async () => {
        const evidenceData = { claimId: 'non-existent-claim', sourceURI: 'http://a.b', hash: 'h', content: 'c' };
        mockSession.run.mockResolvedValue({ records: [] });
        const service = IntelGraphService.getInstance();
        await expect(service.attachEvidence(evidenceData, 'u', 't')).rejects.toThrow('Claim with ID non-existent-claim not found for this tenant.');
    });
  });

  describe('tagPolicy', () => {
    it('should create a policy label, link it to a node, and return the policy', async () => {
        const policyData = { label: 'PII', sensitivity: 'confidential' as const };
        const targetNodeId = 'any-node-uuid';
        const owner = 'user-policy';
        const tenantId = 'tenant-policy';
        mockUuidv4.mockReturnValue('mock-uuid-policy');

        const mockRecord = { get: jest.fn().mockReturnValue({ properties: { id: 'mock-uuid-policy', ...policyData } }) };
        mockSession.run.mockResolvedValue({ records: [mockRecord] });

        const service = IntelGraphService.getInstance();
        const result = await service.tagPolicy(policyData, targetNodeId, owner, tenantId);

        expect(mockSession.run).toHaveBeenCalledTimes(1);
        expect(mockSession.run.mock.calls[0][0]).toContain('MATCH (n {id: $targetNodeId, tenantId: $tenantId})');
        expect(mockSession.run.mock.calls[0][0]).toContain('CREATE (p:PolicyLabel');
        expect(mockSession.run.mock.calls[0][0]).toContain('CREATE (n)-[:HAS_POLICY]->(p)');
        expect(mockSession.run.mock.calls[0][1]).toMatchObject({ id: 'mock-uuid-policy', targetNodeId, ...policyData, owner, tenantId });
        expect(result.id).toBe('mock-uuid-policy');
    });

    it('should throw an AppError if the target node does not exist', async () => {
        const policyData = { label: 'L', sensitivity: 'public' as const };
        mockSession.run.mockResolvedValue({ records: [] });
        const service = IntelGraphService.getInstance();
        await expect(service.tagPolicy(policyData, 'non-existent-node', 'u', 't')).rejects.toThrow('Node with ID non-existent-node not found for this tenant.');
    });
  });

  describe('getDecisionProvenance', () => {
    it('should retrieve a decision and its full provenance trail', async () => {
        const decisionId = 'decision-1';
        const tenantId = 'tenant-prov';
        const mockProvenance = {
            decision: { id: decisionId, name: 'Test Decision' },
            claims: [
                { claim: { id: 'claim-1', statement: 's1' }, evidences: [{ id: 'ev-1', content: 'c1' }] }
            ]
        };
        const mockRecord = { get: jest.fn().mockReturnValue(mockProvenance) };
        mockSession.run.mockResolvedValue({ records: [mockRecord] });

        const service = IntelGraphService.getInstance();
        const result = await service.getDecisionProvenance(decisionId, tenantId);

        expect(mockSession.run).toHaveBeenCalledTimes(1);
        expect(mockSession.run.mock.calls[0][0]).toContain('MATCH (d:Decision {id: $decisionId, tenantId: $tenantId})');
        expect(mockSession.run.mock.calls[0][1]).toEqual({ decisionId, tenantId });
        expect(result).toEqual(mockProvenance);
    });

    it('should throw an AppError if the decision is not found', async () => {
        mockSession.run.mockResolvedValue({ records: [{ get: () => ({ decision: null, claims: [] }) }] });
        const service = IntelGraphService.getInstance();
        await expect(service.getDecisionProvenance('not-found', 't')).rejects.toThrow('Decision with ID not-found not found for this tenant.');
    });
  });

  describe('getEntityClaims', () => {
    it('should retrieve an entity and all its claims with policy labels', async () => {
        const entityId = 'entity-1';
        const tenantId = 'tenant-claims';
        const mockEntityClaims = {
            entity: { id: entityId, name: 'Test Entity' },
            claims: [
                { claim: { id: 'claim-1', statement: 's1' }, policies: [{ id: 'pol-1', label: 'l1' }] }
            ]
        };
        const mockRecord = { get: jest.fn().mockReturnValue(mockEntityClaims) };
        mockSession.run.mockResolvedValue({ records: [mockRecord] });

        const service = IntelGraphService.getInstance();
        const result = await service.getEntityClaims(entityId, tenantId);

        expect(mockSession.run).toHaveBeenCalledTimes(1);
        expect(mockSession.run.mock.calls[0][0]).toContain('MATCH (e:Entity {id: $entityId, tenantId: $tenantId})');
        expect(mockSession.run.mock.calls[0][1]).toEqual({ entityId, tenantId });
        expect(result).toEqual(mockEntityClaims);
    });

    it('should throw an AppError if the entity is not found', async () => {
        mockSession.run.mockResolvedValue({ records: [{ get: () => ({ entity: null, claims: [] }) }] });
        const service = IntelGraphService.getInstance();
        await expect(service.getEntityClaims('not-found', 't')).rejects.toThrow('Entity with ID not-found not found for this tenant.');
    });
  });
});
