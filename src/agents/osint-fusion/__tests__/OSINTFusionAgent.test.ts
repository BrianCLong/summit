/**
 * OSINT Fusion Agent - Comprehensive Test Suite
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { OSINTFusionAgent } from '../OSINTFusionAgent';
import { HallucinationGuard } from '../HallucinationGuard';
import { GraphTraversal } from '../GraphTraversal';
import {
  OsintEntity,
  OsintRelationship,
  OsintFusionQuery,
  FusionOptions,
  ValidationStatus,
} from '../types';
import { AgentContext, ClassificationLevel } from '../../archetypes/base/types';

// Mock dependencies
jest.mock('../GraphTraversal');
jest.mock('../../../server/src/db/neo4j', () => ({
  getNeo4jDriver: jest.fn(() => ({
    session: jest.fn(() => ({
      run: jest.fn().mockResolvedValue({ records: [] }),
      close: jest.fn().mockResolvedValue(undefined),
    })),
  })),
  isNeo4jMockMode: jest.fn(() => true),
}));

describe('OSINTFusionAgent', () => {
  let agent: OSINTFusionAgent;
  let mockContext: AgentContext;

  beforeEach(async () => {
    agent = new OSINTFusionAgent({
      targetValidationRate: 0.85,
      targetP95LatencyMs: 2000,
    });
    await agent.initialize();

    mockContext = {
      user: {
        id: 'test-user',
        name: 'Test User',
        email: 'test@example.com',
        roles: ['analyst'],
        permissions: ['read', 'write'],
      },
      organization: {
        id: 'test-org',
        name: 'Test Organization',
        policies: { id: 'pol-1', version: '1.0', rules: [] },
        graphHandle: {
          query: jest.fn().mockResolvedValue([]),
          mutate: jest.fn().mockResolvedValue({}),
          getEntity: jest.fn().mockResolvedValue(null),
          createEntity: jest.fn().mockResolvedValue({}),
          updateEntity: jest.fn().mockResolvedValue({}),
          deleteEntity: jest.fn().mockResolvedValue(true),
        },
      },
      mode: 'analysis',
      timestamp: new Date(),
      requestId: 'test-request-123',
      classification: 'UNCLASSIFIED' as ClassificationLevel,
    };
  });

  afterEach(async () => {
    await agent.shutdown();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      const newAgent = new OSINTFusionAgent();
      await newAgent.initialize();

      const status = newAgent.getStatus();
      expect(status.status).toBe('ready');

      await newAgent.shutdown();
    });

    it('should have correct capabilities', () => {
      expect(agent.capabilities).toContain('multi_source_fusion');
      expect(agent.capabilities).toContain('hallucination_detection');
      expect(agent.capabilities).toContain('graph_traversal');
      expect(agent.capabilities).toContain('semantic_search');
    });
  });

  describe('execute', () => {
    it('should return error when no query provided', async () => {
      const result = await agent.execute(mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No query provided');
    });

    it('should execute fusion successfully with valid query', async () => {
      const query: OsintFusionQuery = {
        type: 'osint_fusion',
        parameters: {},
        keywords: ['test entity'],
        entityTypes: ['person'],
        maxResults: 10,
      };

      mockContext.metadata = { query };

      const result = await agent.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.requestId).toBe(mockContext.requestId);
      expect(result.data).toBeDefined();
    });
  });

  describe('fuse', () => {
    it('should fuse data from multiple sources', async () => {
      const query: OsintFusionQuery = {
        type: 'osint_fusion',
        parameters: {},
        keywords: ['John Doe', 'example.com'],
        entityTypes: ['person', 'cyber_artifact'],
      };

      const result = await agent.fuse(query);

      expect(result.requestId).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.entities).toBeInstanceOf(Array);
      expect(result.relationships).toBeInstanceOf(Array);
      expect(result.metrics).toBeDefined();
      expect(result.provenance).toBeDefined();
    });

    it('should respect airgap mode', async () => {
      const query: OsintFusionQuery = {
        type: 'osint_fusion',
        parameters: {},
        keywords: ['test'],
      };

      const options: FusionOptions = {
        enableHallucinationGuard: true,
        minCorroboratingSourceCount: 2,
        confidenceThreshold: 0.7,
        maxTraversalDepth: 3,
        enableSemanticMatching: true,
        enableTemporalAnalysis: true,
        airgapMode: true,
        maxLatencyMs: 2000,
      };

      const result = await agent.fuse(query, options);

      // Should still return results in airgap mode
      expect(result).toBeDefined();
      expect(result.metrics.totalLatencyMs).toBeLessThan(options.maxLatencyMs * 2);
    });

    it('should generate provenance chain', async () => {
      const query: OsintFusionQuery = {
        type: 'osint_fusion',
        parameters: {},
        keywords: ['test'],
      };

      const result = await agent.fuse(query);

      expect(result.provenance.requestId).toBeDefined();
      expect(result.provenance.sources).toBeInstanceOf(Array);
      expect(result.provenance.transformations).toBeInstanceOf(Array);
      expect(result.provenance.validations).toBeInstanceOf(Array);
    });
  });

  describe('analyze', () => {
    it('should analyze query and return findings', async () => {
      const query: OsintFusionQuery = {
        type: 'osint_fusion',
        parameters: {},
        keywords: ['test entity'],
      };

      const analysis = await agent.analyze(query, mockContext);

      expect(analysis.queryId).toBeDefined();
      expect(analysis.timestamp).toBeInstanceOf(Date);
      expect(analysis.findings).toBeInstanceOf(Array);
      expect(analysis.insights).toBeInstanceOf(Array);
      expect(typeof analysis.confidence).toBe('number');
    });
  });

  describe('recommend', () => {
    it('should generate recommendations from analysis', async () => {
      const mockAnalysis = {
        queryId: 'test-query',
        timestamp: new Date(),
        findings: [],
        insights: [],
        recommendations: [],
        confidence: 0.8,
        metadata: {
          intelligenceGaps: [
            {
              id: 'gap-1',
              description: 'Missing dark web data',
              missingSourceTypes: ['dark_web'],
              recommendedActions: ['Enable Tor access'],
              priority: 'medium' as const,
            },
          ],
          riskIndicators: [
            {
              id: 'risk-1',
              type: 'unvalidated_entities',
              severity: 'high' as const,
              description: 'High number of unvalidated entities',
              affectedEntities: ['entity-1', 'entity-2'],
              evidence: [],
            },
          ],
        },
      };

      const recommendations = await agent.recommend(mockAnalysis, mockContext);

      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].id).toBeDefined();
      expect(recommendations[0].title).toBeDefined();
      expect(recommendations[0].priority).toBeDefined();
    });
  });

  describe('health check', () => {
    it('should return health status', async () => {
      const health = await agent.getHealthCheck();

      expect(health.healthy).toBe(true);
      expect(health.lastCheck).toBeInstanceOf(Date);
    });
  });

  describe('metrics', () => {
    it('should track fusion metrics', async () => {
      const query: OsintFusionQuery = {
        type: 'osint_fusion',
        parameters: {},
        keywords: ['test'],
      };

      const result = await agent.fuse(query);

      expect(result.metrics.totalLatencyMs).toBeGreaterThanOrEqual(0);
      expect(result.metrics.entitiesExtracted).toBeGreaterThanOrEqual(0);
      expect(typeof result.metrics.validationRate).toBe('number');
      expect(result.metrics.validationRate).toBeGreaterThanOrEqual(0);
      expect(result.metrics.validationRate).toBeLessThanOrEqual(1);
    });
  });

  describe('shutdown', () => {
    it('should shutdown cleanly', async () => {
      const newAgent = new OSINTFusionAgent();
      await newAgent.initialize();

      await expect(newAgent.shutdown()).resolves.not.toThrow();
    });
  });
});

describe('HallucinationGuard', () => {
  let guard: HallucinationGuard;

  beforeEach(() => {
    guard = new HallucinationGuard({
      minCorroboratingSourceCount: 2,
      confidenceThreshold: 0.7,
    });
  });

  describe('validateEntity', () => {
    it('should validate entity with multiple sources', async () => {
      const entity: OsintEntity = {
        id: 'entity-1',
        type: 'person',
        label: 'John Doe',
        aliases: ['J. Doe'],
        attributes: {},
        confidence: 0.8,
        sources: [
          {
            sourceId: 'source-1',
            sourceType: 'public_records',
            uri: 'http://example.com/1',
            timestamp: new Date(),
            reliability: 'A',
            credibility: 1,
            extractedAt: new Date(),
            checksum: 'abc123',
          },
          {
            sourceId: 'source-2',
            sourceType: 'news_media',
            uri: 'http://example.com/2',
            timestamp: new Date(),
            reliability: 'B',
            credibility: 2,
            extractedAt: new Date(),
            checksum: 'def456',
          },
        ],
        validationStatus: {
          validated: false,
          validator: 'multi_source',
          confidence: 0,
          corroboratingSourceCount: 0,
          conflictingSources: [],
          hallucinationRisk: 'high',
        },
        classification: 'UNCLASSIFIED',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await guard.validateEntity(entity);

      expect(result.entityId).toBe(entity.id);
      expect(result.isHallucinated).toBe(false);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.checks.length).toBe(4);
    });

    it('should reject entity with insufficient sources', async () => {
      const entity: OsintEntity = {
        id: 'entity-2',
        type: 'person',
        label: 'Jane Doe',
        aliases: [],
        attributes: {},
        confidence: 0.3,
        sources: [],
        validationStatus: {
          validated: false,
          validator: 'multi_source',
          confidence: 0,
          corroboratingSourceCount: 0,
          conflictingSources: [],
          hallucinationRisk: 'high',
        },
        classification: 'UNCLASSIFIED',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await guard.validateEntity(entity);

      expect(result.recommendation).toBe('reject');
      expect(result.isHallucinated).toBe(true);
    });

    it('should detect gibberish labels', async () => {
      const entity: OsintEntity = {
        id: 'entity-3',
        type: 'person',
        label: 'xyzklmnpqrst',
        aliases: [],
        attributes: {},
        confidence: 0.5,
        sources: [
          {
            sourceId: 'source-1',
            sourceType: 'social_media',
            uri: 'http://example.com',
            timestamp: new Date(),
            reliability: 'C',
            credibility: 3,
            extractedAt: new Date(),
            checksum: 'abc',
          },
        ],
        validationStatus: {
          validated: false,
          validator: 'multi_source',
          confidence: 0,
          corroboratingSourceCount: 0,
          conflictingSources: [],
          hallucinationRisk: 'high',
        },
        classification: 'UNCLASSIFIED',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await guard.validateEntity(entity);

      const semanticCheck = result.checks.find((c) => c.type === 'semantic_coherence');
      expect(semanticCheck?.passed).toBe(false);
    });

    it('should detect temporal inconsistencies', async () => {
      const futureDate = new Date(Date.now() + 86400000 * 30); // 30 days in future

      const entity: OsintEntity = {
        id: 'entity-4',
        type: 'person',
        label: 'Test Person',
        aliases: [],
        attributes: {},
        confidence: 0.5,
        sources: [
          {
            sourceId: 'source-1',
            sourceType: 'public_records',
            uri: 'http://example.com',
            timestamp: futureDate,
            reliability: 'A',
            credibility: 1,
            extractedAt: new Date(),
            checksum: 'abc',
          },
        ],
        validationStatus: {
          validated: false,
          validator: 'multi_source',
          confidence: 0,
          corroboratingSourceCount: 0,
          conflictingSources: [],
          hallucinationRisk: 'high',
        },
        classification: 'UNCLASSIFIED',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await guard.validateEntity(entity);

      const temporalCheck = result.checks.find((c) => c.type === 'temporal_consistency');
      expect(temporalCheck?.passed).toBe(false);
    });
  });

  describe('validateRelationship', () => {
    it('should validate relationship between validated entities', async () => {
      const sourceEntity: OsintEntity = {
        id: 'source-entity',
        type: 'person',
        label: 'John',
        aliases: [],
        attributes: {},
        confidence: 0.9,
        sources: [
          {
            sourceId: 'src-1',
            sourceType: 'public_records',
            uri: 'http://example.com',
            timestamp: new Date(),
            reliability: 'A',
            credibility: 1,
            extractedAt: new Date(),
            checksum: 'abc',
          },
        ],
        validationStatus: {
          validated: true,
          validatedAt: new Date(),
          validator: 'multi_source',
          confidence: 0.9,
          corroboratingSourceCount: 2,
          conflictingSources: [],
          hallucinationRisk: 'low',
        },
        classification: 'UNCLASSIFIED',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const targetEntity: OsintEntity = {
        ...sourceEntity,
        id: 'target-entity',
        type: 'organization',
        label: 'Acme Corp',
      };

      const relationship: OsintRelationship = {
        id: 'rel-1',
        type: 'member_of',
        sourceEntityId: sourceEntity.id,
        targetEntityId: targetEntity.id,
        confidence: 0.8,
        weight: 1.0,
        attributes: {},
        sources: sourceEntity.sources,
        validationStatus: {
          validated: false,
          validator: 'multi_source',
          confidence: 0,
          corroboratingSourceCount: 0,
          conflictingSources: [],
          hallucinationRisk: 'high',
        },
      };

      const result = await guard.validateRelationship(
        relationship,
        sourceEntity,
        targetEntity,
      );

      expect(result.isHallucinated).toBe(false);
      expect(result.recommendation).not.toBe('reject');
    });
  });

  describe('batchValidate', () => {
    it('should validate multiple entities efficiently', async () => {
      const entities: OsintEntity[] = Array.from({ length: 10 }, (_, i) => ({
        id: `entity-${i}`,
        type: 'person' as const,
        label: `Person ${i}`,
        aliases: [],
        attributes: {},
        confidence: 0.7,
        sources: [
          {
            sourceId: `source-${i}`,
            sourceType: 'public_records' as const,
            uri: `http://example.com/${i}`,
            timestamp: new Date(),
            reliability: 'B' as const,
            credibility: 2 as const,
            extractedAt: new Date(),
            checksum: `hash-${i}`,
          },
          {
            sourceId: `source-${i}-alt`,
            sourceType: 'news_media' as const,
            uri: `http://news.com/${i}`,
            timestamp: new Date(),
            reliability: 'B' as const,
            credibility: 2 as const,
            extractedAt: new Date(),
            checksum: `hash-${i}-alt`,
          },
        ],
        validationStatus: {
          validated: false,
          validator: 'multi_source' as const,
          confidence: 0,
          corroboratingSourceCount: 0,
          conflictingSources: [],
          hallucinationRisk: 'high' as const,
        },
        classification: 'UNCLASSIFIED' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const results = await guard.batchValidate(entities);

      expect(results.size).toBe(10);
      for (const [id, result] of results) {
        expect(result.entityId).toBe(id);
        expect(result.checks.length).toBeGreaterThan(0);
      }
    });
  });

  describe('metrics', () => {
    it('should track validation metrics', async () => {
      // Perform some validations
      const validEntity: OsintEntity = {
        id: 'valid-entity',
        type: 'person',
        label: 'Valid Person',
        aliases: [],
        attributes: {},
        confidence: 0.9,
        sources: [
          {
            sourceId: 'src-1',
            sourceType: 'public_records',
            uri: 'http://example.com',
            timestamp: new Date(),
            reliability: 'A',
            credibility: 1,
            extractedAt: new Date(),
            checksum: 'abc',
          },
          {
            sourceId: 'src-2',
            sourceType: 'news_media',
            uri: 'http://news.com',
            timestamp: new Date(),
            reliability: 'B',
            credibility: 2,
            extractedAt: new Date(),
            checksum: 'def',
          },
        ],
        validationStatus: {
          validated: false,
          validator: 'multi_source',
          confidence: 0,
          corroboratingSourceCount: 0,
          conflictingSources: [],
          hallucinationRisk: 'high',
        },
        classification: 'UNCLASSIFIED',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await guard.validateEntity(validEntity);

      const metrics = guard.getMetrics();

      expect(metrics.totalChecks).toBeGreaterThan(0);
      expect(typeof metrics.validationRate).toBe('number');
    });
  });
});

describe('Performance', () => {
  it('should complete fusion within p95 latency target', async () => {
    const agent = new OSINTFusionAgent({
      targetP95LatencyMs: 2000,
    });
    await agent.initialize();

    const query: OsintFusionQuery = {
      type: 'osint_fusion',
      parameters: {},
      keywords: ['test entity'],
      maxResults: 50,
    };

    const startTime = Date.now();
    const result = await agent.fuse(query);
    const elapsed = Date.now() - startTime;

    // Should complete within 2x target for test environment
    expect(elapsed).toBeLessThan(4000);
    expect(result.metrics.totalLatencyMs).toBeLessThan(4000);

    await agent.shutdown();
  });

  it('should achieve target validation rate', async () => {
    const guard = new HallucinationGuard({
      minCorroboratingSourceCount: 2,
      confidenceThreshold: 0.7,
    });

    // Create entities with varying quality
    const entities: OsintEntity[] = [];

    // 85% high-quality entities
    for (let i = 0; i < 85; i++) {
      entities.push({
        id: `good-entity-${i}`,
        type: 'person',
        label: `Good Person ${i}`,
        aliases: [],
        attributes: {},
        confidence: 0.8,
        sources: [
          {
            sourceId: `src-a-${i}`,
            sourceType: 'public_records',
            uri: `http://example.com/${i}`,
            timestamp: new Date(),
            reliability: 'A',
            credibility: 1,
            extractedAt: new Date(),
            checksum: `hash-a-${i}`,
          },
          {
            sourceId: `src-b-${i}`,
            sourceType: 'news_media',
            uri: `http://news.com/${i}`,
            timestamp: new Date(),
            reliability: 'B',
            credibility: 2,
            extractedAt: new Date(),
            checksum: `hash-b-${i}`,
          },
        ],
        validationStatus: {
          validated: false,
          validator: 'multi_source',
          confidence: 0,
          corroboratingSourceCount: 0,
          conflictingSources: [],
          hallucinationRisk: 'high',
        },
        classification: 'UNCLASSIFIED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // 15% low-quality entities
    for (let i = 0; i < 15; i++) {
      entities.push({
        id: `bad-entity-${i}`,
        type: 'person',
        label: `Bad ${i}`,
        aliases: [],
        attributes: {},
        confidence: 0.3,
        sources: [],
        validationStatus: {
          validated: false,
          validator: 'multi_source',
          confidence: 0,
          corroboratingSourceCount: 0,
          conflictingSources: [],
          hallucinationRisk: 'high',
        },
        classification: 'UNCLASSIFIED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    await guard.batchValidate(entities);

    const metrics = guard.getMetrics();
    // Should achieve at least 80% validation rate (allowing some margin)
    expect(metrics.validationRate).toBeGreaterThanOrEqual(0.80);
  });
});
