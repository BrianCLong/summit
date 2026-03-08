"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-explicit-any -- jest mocks require type assertions */
// server/src/services/IntelGraphService.test.ts
const globals_1 = require("@jest/globals");
const IntelGraphService_js_1 = require("./IntelGraphService.js");
const database_js_1 = require("../config/database.js");
const uuid_1 = require("uuid");
// Mock the database driver
globals_1.jest.mock('../config/database');
globals_1.jest.mock('uuid');
const mockGetNeo4jDriver = database_js_1.getNeo4jDriver;
const mockUuidv4 = uuid_1.v4;
(0, globals_1.describe)('IntelGraphService', () => {
    let mockSession;
    let mockDriver;
    (0, globals_1.beforeEach)(() => {
        // Reset the service instance before each test to ensure isolation
        IntelGraphService_js_1.IntelGraphService._resetForTesting();
        // Mock the Neo4j session and its 'run' and 'close' methods
        mockSession = {
            run: globals_1.jest.fn(),
            close: globals_1.jest.fn().mockResolvedValue(undefined),
        };
        // Mock the driver to return our mock session
        mockDriver = {
            session: globals_1.jest.fn(() => mockSession),
        };
        // Configure the mocked getNeo4jDriver to return our mock driver
        mockGetNeo4jDriver.mockReturnValue(mockDriver);
        // Mock uuidv4 to return a predictable value
        mockUuidv4.mockReturnValue('mock-uuid-1234');
    });
    (0, globals_1.afterEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('Singleton Pattern', () => {
        (0, globals_1.it)('should return the same instance when getInstance is called multiple times', () => {
            const instance1 = IntelGraphService_js_1.IntelGraphService.getInstance();
            const instance2 = IntelGraphService_js_1.IntelGraphService.getInstance();
            (0, globals_1.expect)(instance1).toBe(instance2);
        });
        (0, globals_1.it)('should return a new instance after _resetForTesting is called', () => {
            const instance1 = IntelGraphService_js_1.IntelGraphService.getInstance();
            IntelGraphService_js_1.IntelGraphService._resetForTesting();
            const instance2 = IntelGraphService_js_1.IntelGraphService.getInstance();
            (0, globals_1.expect)(instance1).not.toBe(instance2);
        });
    });
    (0, globals_1.describe)('createEntity', () => {
        (0, globals_1.it)('should create an entity with the correct properties and return it', async () => {
            const entityData = {
                name: 'Test Entity',
                description: 'A test entity for unit testing.',
            };
            const owner = 'user-1';
            const tenantId = 'tenant-1';
            const mockRecord = {
                get: globals_1.jest.fn().mockReturnValue({
                    properties: {
                        id: 'mock-uuid-1234',
                        ...entityData,
                        owner,
                        createdAt: globals_1.expect.any(String),
                        updatedAt: globals_1.expect.any(String),
                    },
                }),
            };
            mockSession.run.mockResolvedValue({ records: [mockRecord] });
            const service = IntelGraphService_js_1.IntelGraphService.getInstance();
            const result = await service.createEntity(entityData, owner, tenantId);
            (0, globals_1.expect)(mockDriver.session).toHaveBeenCalledTimes(1);
            (0, globals_1.expect)(mockSession.run).toHaveBeenCalledTimes(1);
            (0, globals_1.expect)(mockSession.run.mock.calls[0][0]).toContain('CREATE (e:Entity');
            (0, globals_1.expect)(mockSession.run.mock.calls[0][1]).toMatchObject({
                props: {
                    id: 'mock-uuid-1234',
                    ...entityData,
                    owner,
                    createdAt: globals_1.expect.any(String),
                    updatedAt: globals_1.expect.any(String),
                },
                tenantId,
            });
            (0, globals_1.expect)(mockSession.close).toHaveBeenCalledTimes(1);
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.id).toBe('mock-uuid-1234');
            (0, globals_1.expect)(result.name).toBe(entityData.name);
        });
    });
    (0, globals_1.describe)('createClaim', () => {
        (0, globals_1.it)('should create a claim, link it to an entity, and return the claim', async () => {
            const claimData = {
                statement: 'This is a test claim.',
                confidence: 0.95,
                entityId: 'entity-uuid-5678',
            };
            const owner = 'user-2';
            const tenantId = 'tenant-2';
            const mockRecord = {
                get: globals_1.jest.fn().mockReturnValue({
                    properties: {
                        id: 'mock-uuid-1234',
                        statement: claimData.statement,
                        confidence: claimData.confidence,
                        owner,
                        createdAt: globals_1.expect.any(String),
                        updatedAt: globals_1.expect.any(String),
                    },
                }),
            };
            mockSession.run.mockResolvedValue({ records: [mockRecord] });
            const service = IntelGraphService_js_1.IntelGraphService.getInstance();
            const result = await service.createClaim(claimData, owner, tenantId);
            (0, globals_1.expect)(mockDriver.session).toHaveBeenCalledTimes(1);
            (0, globals_1.expect)(mockSession.run).toHaveBeenCalledTimes(1);
            (0, globals_1.expect)(mockSession.run.mock.calls[0][0]).toContain('MATCH (e:Entity');
            (0, globals_1.expect)(mockSession.run.mock.calls[0][0]).toContain('CREATE (c:Claim');
            (0, globals_1.expect)(mockSession.run.mock.calls[0][0]).toContain('CREATE (c)-[:RELATES_TO]->(e)');
            (0, globals_1.expect)(mockSession.run.mock.calls[0][1]).toMatchObject({
                props: {
                    id: 'mock-uuid-1234',
                    statement: claimData.statement,
                    confidence: claimData.confidence,
                    entityId: claimData.entityId,
                    owner,
                    createdAt: globals_1.expect.any(String),
                    updatedAt: globals_1.expect.any(String),
                },
                entityId: claimData.entityId,
                tenantId,
            });
            (0, globals_1.expect)(mockSession.close).toHaveBeenCalledTimes(1);
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.id).toBe('mock-uuid-1234');
        });
        (0, globals_1.it)('should throw an AppError if the target entity does not exist', async () => {
            const claimData = {
                statement: 'This claim will fail.',
                confidence: 0.5,
                entityId: 'non-existent-entity',
            };
            const owner = 'user-3';
            const tenantId = 'tenant-3';
            // Mock a response with no records, simulating a failed MATCH
            mockSession.run.mockResolvedValue({ records: [] });
            const service = IntelGraphService_js_1.IntelGraphService.getInstance();
            await (0, globals_1.expect)(service.createClaim(claimData, owner, tenantId)).rejects.toThrow('Entity with ID non-existent-entity not found for this tenant.');
        });
    });
    (0, globals_1.describe)('attachEvidence', () => {
        (0, globals_1.it)('should create an evidence node, link it to a claim, and return the evidence', async () => {
            const evidenceData = {
                claimId: 'claim-uuid-123',
                sourceURI: 'https://example.com/evidence',
                hash: 'sha256-hash',
                content: 'This is the evidence content.',
            };
            const owner = 'user-evi';
            const tenantId = 'tenant-evi';
            mockUuidv4.mockReturnValue('mock-uuid-evidence');
            const mockRecord = { get: globals_1.jest.fn().mockReturnValue({ properties: { id: 'mock-uuid-evidence', ...evidenceData } }) };
            mockSession.run.mockResolvedValue({ records: [mockRecord] });
            const service = IntelGraphService_js_1.IntelGraphService.getInstance();
            const result = await service.attachEvidence(evidenceData, owner, tenantId);
            (0, globals_1.expect)(mockSession.run).toHaveBeenCalledTimes(1);
            (0, globals_1.expect)(mockSession.run.mock.calls[0][0]).toContain('MATCH (c:Claim {id: $claimId, tenantId: $tenantId})');
            (0, globals_1.expect)(mockSession.run.mock.calls[0][0]).toContain('CREATE (ev:Evidence');
            (0, globals_1.expect)(mockSession.run.mock.calls[0][0]).toContain('CREATE (ev)-[:SUPPORTS]->(c)');
            (0, globals_1.expect)(mockSession.run.mock.calls[0][1]).toMatchObject({ props: { id: 'mock-uuid-evidence', ...evidenceData, owner, createdAt: globals_1.expect.any(String), updatedAt: globals_1.expect.any(String) }, claimId: evidenceData.claimId, tenantId });
            (0, globals_1.expect)(result.id).toBe('mock-uuid-evidence');
        });
        (0, globals_1.it)('should throw an AppError if the target claim does not exist', async () => {
            const evidenceData = { claimId: 'non-existent-claim', sourceURI: 'http://a.b', hash: 'h', content: 'c' };
            mockSession.run.mockResolvedValue({ records: [] });
            const service = IntelGraphService_js_1.IntelGraphService.getInstance();
            await (0, globals_1.expect)(service.attachEvidence(evidenceData, 'u', 't')).rejects.toThrow('Claim with ID non-existent-claim not found for this tenant.');
        });
    });
    (0, globals_1.describe)('tagPolicy', () => {
        (0, globals_1.it)('should create a policy label, link it to a node, and return the policy', async () => {
            const policyData = { label: 'PII', sensitivity: 'confidential' };
            const targetNodeId = 'any-node-uuid';
            const owner = 'user-policy';
            const tenantId = 'tenant-policy';
            mockUuidv4.mockReturnValue('mock-uuid-policy');
            const mockRecord = { get: globals_1.jest.fn().mockReturnValue({ properties: { id: 'mock-uuid-policy', ...policyData } }) };
            mockSession.run.mockResolvedValue({ records: [mockRecord] });
            const service = IntelGraphService_js_1.IntelGraphService.getInstance();
            const result = await service.tagPolicy(policyData, targetNodeId, owner, tenantId);
            (0, globals_1.expect)(mockSession.run).toHaveBeenCalledTimes(1);
            (0, globals_1.expect)(mockSession.run.mock.calls[0][0]).toContain('MATCH (n {id: $targetNodeId, tenantId: $tenantId})');
            (0, globals_1.expect)(mockSession.run.mock.calls[0][0]).toContain('CREATE (p:PolicyLabel');
            (0, globals_1.expect)(mockSession.run.mock.calls[0][0]).toContain('CREATE (n)-[:HAS_POLICY]->(p)');
            (0, globals_1.expect)(mockSession.run.mock.calls[0][1]).toMatchObject({ props: { id: 'mock-uuid-policy', ...policyData, owner, createdAt: globals_1.expect.any(String), updatedAt: globals_1.expect.any(String) }, targetNodeId, tenantId });
            (0, globals_1.expect)(result.id).toBe('mock-uuid-policy');
        });
        (0, globals_1.it)('should throw an AppError if the target node does not exist', async () => {
            const policyData = { label: 'L', sensitivity: 'public' };
            mockSession.run.mockResolvedValue({ records: [] });
            const service = IntelGraphService_js_1.IntelGraphService.getInstance();
            await (0, globals_1.expect)(service.tagPolicy(policyData, 'non-existent-node', 'u', 't')).rejects.toThrow('Node with ID non-existent-node not found for this tenant.');
        });
    });
    (0, globals_1.describe)('getDecisionProvenance', () => {
        (0, globals_1.it)('should retrieve a decision and its full provenance trail', async () => {
            const decisionId = 'decision-1';
            const tenantId = 'tenant-prov';
            const mockProvenance = {
                decision: { id: decisionId, name: 'Test Decision' },
                claims: [
                    { claim: { id: 'claim-1', statement: 's1' }, evidences: [{ id: 'ev-1', content: 'c1' }] }
                ]
            };
            const mockRecord = { get: globals_1.jest.fn().mockReturnValue(mockProvenance) };
            mockSession.run.mockResolvedValue({ records: [mockRecord] });
            const service = IntelGraphService_js_1.IntelGraphService.getInstance();
            const result = await service.getDecisionProvenance(decisionId, tenantId);
            (0, globals_1.expect)(mockSession.run).toHaveBeenCalledTimes(1);
            (0, globals_1.expect)(mockSession.run.mock.calls[0][0]).toContain('MATCH (d:Decision {id: $decisionId, tenantId: $tenantId})');
            (0, globals_1.expect)(mockSession.run.mock.calls[0][1]).toEqual({ decisionId, tenantId });
            (0, globals_1.expect)(result).toEqual(mockProvenance);
        });
        (0, globals_1.it)('should throw an AppError if the decision is not found', async () => {
            mockSession.run.mockResolvedValue({ records: [{ get: () => ({ decision: null, claims: [] }) }] });
            const service = IntelGraphService_js_1.IntelGraphService.getInstance();
            await (0, globals_1.expect)(service.getDecisionProvenance('not-found', 't')).rejects.toThrow('Decision with ID not-found not found for this tenant.');
        });
    });
    (0, globals_1.describe)('getEntityClaims', () => {
        (0, globals_1.it)('should retrieve an entity and all its claims with policy labels', async () => {
            const entityId = 'entity-1';
            const tenantId = 'tenant-claims';
            const mockEntityClaims = {
                entity: { id: entityId, name: 'Test Entity' },
                claims: [
                    { claim: { id: 'claim-1', statement: 's1' }, policies: [{ id: 'pol-1', label: 'l1' }] }
                ]
            };
            const mockRecord = { get: globals_1.jest.fn().mockReturnValue(mockEntityClaims) };
            mockSession.run.mockResolvedValue({ records: [mockRecord] });
            const service = IntelGraphService_js_1.IntelGraphService.getInstance();
            const result = await service.getEntityClaims(entityId, tenantId);
            (0, globals_1.expect)(mockSession.run).toHaveBeenCalledTimes(1);
            (0, globals_1.expect)(mockSession.run.mock.calls[0][0]).toContain('MATCH (e:Entity {id: $entityId, tenantId: $tenantId})');
            (0, globals_1.expect)(mockSession.run.mock.calls[0][1]).toEqual({ entityId, tenantId });
            (0, globals_1.expect)(result).toEqual(mockEntityClaims);
        });
        (0, globals_1.it)('should throw an AppError if the entity is not found', async () => {
            mockSession.run.mockResolvedValue({ records: [{ get: () => ({ entity: null, claims: [] }) }] });
            const service = IntelGraphService_js_1.IntelGraphService.getInstance();
            await (0, globals_1.expect)(service.getEntityClaims('not-found', 't')).rejects.toThrow('Entity with ID not-found not found for this tenant.');
        });
    });
});
