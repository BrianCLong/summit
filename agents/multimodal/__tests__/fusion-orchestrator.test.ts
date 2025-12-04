/**
 * Fusion Orchestrator Tests
 * E2E and performance tests for multimodal fusion pipeline
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';

import { FusionOrchestrator } from '../fusion-orchestrator.js';
import { CLIPPipeline } from '../clip-pipeline.js';
import { TextPipeline } from '../text-pipeline.js';
import { VideoPipeline } from '../video-pipeline.js';
import { HallucinationGuard } from '../hallucination-guard.js';
import { PgVectorStore } from '../pgvector-store.js';
import { Neo4jEmbeddings } from '../neo4j-embeddings.js';
import type {
  FusedEmbedding,
  SourceInput,
  TextEmbedding,
  ImageEmbedding,
  VideoEmbedding,
  HallucinationCheckResult,
} from '../types.js';

// Mock external dependencies
jest.mock('../clip-pipeline.js');
jest.mock('../text-pipeline.js');
jest.mock('../video-pipeline.js');
jest.mock('../pgvector-store.js');
jest.mock('../neo4j-embeddings.js');

describe('FusionOrchestrator', () => {
  let orchestrator: FusionOrchestrator;

  beforeAll(() => {
    // Setup mocks
    (CLIPPipeline as jest.MockedClass<typeof CLIPPipeline>).mockImplementation(() => ({
      embedImage: jest.fn().mockResolvedValue(createMockImageEmbedding()),
      embedImageBatch: jest.fn().mockResolvedValue([createMockImageEmbedding()]),
      clearCache: jest.fn(),
      getStats: jest.fn().mockReturnValue({ model: 'clip', dimension: 768, cacheSize: 0 }),
    } as any));

    (TextPipeline as jest.MockedClass<typeof TextPipeline>).mockImplementation(() => ({
      embedText: jest.fn().mockResolvedValue(createMockTextEmbedding()),
      embedTextBatch: jest.fn().mockResolvedValue([createMockTextEmbedding()]),
      clearCache: jest.fn(),
      getStats: jest.fn().mockReturnValue({ model: 'text', dimension: 1536, cacheSize: 0 }),
    } as any));

    (VideoPipeline as jest.MockedClass<typeof VideoPipeline>).mockImplementation(() => ({
      embedVideo: jest.fn().mockResolvedValue(createMockVideoEmbedding()),
      clearCache: jest.fn(),
      getStats: jest.fn().mockReturnValue({ model: 'clip', cacheSize: 0 }),
    } as any));

    (PgVectorStore as jest.MockedClass<typeof PgVectorStore>).mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      store: jest.fn().mockResolvedValue(undefined),
      storeBatch: jest.fn().mockResolvedValue(undefined),
      search: jest.fn().mockResolvedValue([]),
      close: jest.fn().mockResolvedValue(undefined),
    } as any));

    (Neo4jEmbeddings as jest.MockedClass<typeof Neo4jEmbeddings>).mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      embedNode: jest.fn().mockResolvedValue({
        nodeId: 'test-node',
        labels: ['Entity'],
        properties: {},
        embedding: new Array(128).fill(0.1),
        neighbors: [],
      }),
      close: jest.fn().mockResolvedValue(undefined),
    } as any));
  });

  beforeEach(() => {
    orchestrator = new FusionOrchestrator({
      enableGraphEmbeddings: false,
      enablePgVectorStorage: false,
      enableHallucinationGuard: true,
    });
  });

  afterAll(async () => {
    await orchestrator?.close();
  });

  describe('processJob', () => {
    it('should process text source successfully', async () => {
      const sources: SourceInput[] = [
        { type: 'text', uri: 'Sample OSINT text content for analysis' },
      ];

      const result = await orchestrator.processJob('inv-123', sources, 'entity-1');

      expect(result).toBeDefined();
      expect(result.entityId).toBe('entity-1');
      expect(result.investigationId).toBe('inv-123');
      expect(result.fusedVector).toBeDefined();
      expect(result.fusedVector.length).toBeGreaterThan(0);
    });

    it('should process image source successfully', async () => {
      const sources: SourceInput[] = [
        { type: 'image', uri: '/path/to/image.jpg' },
      ];

      const result = await orchestrator.processJob('inv-123', sources, 'entity-2');

      expect(result).toBeDefined();
      expect(result.entityId).toBe('entity-2');
      expect(result.modalityVectors.length).toBe(1);
      expect(result.modalityVectors[0].modality).toBe('image');
    });

    it('should process video source successfully', async () => {
      const sources: SourceInput[] = [
        { type: 'video', uri: '/path/to/video.mp4' },
      ];

      const result = await orchestrator.processJob('inv-123', sources, 'entity-3');

      expect(result).toBeDefined();
      expect(result.entityId).toBe('entity-3');
    });

    it('should fuse multiple modalities', async () => {
      const sources: SourceInput[] = [
        { type: 'text', uri: 'Text description of the entity' },
        { type: 'image', uri: '/path/to/image.jpg' },
      ];

      const result = await orchestrator.processJob('inv-123', sources, 'entity-4');

      expect(result).toBeDefined();
      expect(result.modalityVectors.length).toBe(2);
      expect(result.crossModalScore).toBeGreaterThan(0);
    });

    it('should handle empty sources gracefully', async () => {
      const sources: SourceInput[] = [];

      await expect(
        orchestrator.processJob('inv-123', sources, 'entity-5'),
      ).rejects.toThrow('No embeddings to fuse');
    });
  });

  describe('processBatch', () => {
    it('should process multiple entities in batch', async () => {
      const sourceGroups = [
        {
          entityId: 'entity-a',
          sources: [{ type: 'text' as const, uri: 'Text A' }],
        },
        {
          entityId: 'entity-b',
          sources: [{ type: 'image' as const, uri: '/path/b.jpg' }],
        },
      ];

      const results = await orchestrator.processBatch('inv-123', sourceGroups);

      expect(results.length).toBe(2);
      expect(results[0].entityId).toBe('entity-a');
      expect(results[1].entityId).toBe('entity-b');
    });
  });

  describe('fusion methods', () => {
    it('should use weighted_average fusion by default', async () => {
      const sources: SourceInput[] = [
        { type: 'text', uri: 'Test text' },
      ];

      const result = await orchestrator.processJob('inv-123', sources);

      expect(result.fusionMethod).toBe('weighted_average');
    });

    it('should support concatenation fusion', async () => {
      const concatOrchestrator = new FusionOrchestrator({
        fusionMethod: 'concatenation',
        enableGraphEmbeddings: false,
        enablePgVectorStorage: false,
      });

      const sources: SourceInput[] = [
        { type: 'text', uri: 'Test text' },
      ];

      const result = await concatOrchestrator.processJob('inv-123', sources);

      expect(result.fusionMethod).toBe('concatenation');
    });

    it('should support attention fusion', async () => {
      const attentionOrchestrator = new FusionOrchestrator({
        fusionMethod: 'attention',
        enableGraphEmbeddings: false,
        enablePgVectorStorage: false,
      });

      const sources: SourceInput[] = [
        { type: 'text', uri: 'Test text' },
        { type: 'image', uri: '/path/image.jpg' },
      ];

      const result = await attentionOrchestrator.processJob('inv-123', sources);

      expect(result.fusionMethod).toBe('attention');
    });
  });

  describe('metrics', () => {
    it('should track processing metrics', async () => {
      const sources: SourceInput[] = [
        { type: 'text', uri: 'Test text' },
      ];

      await orchestrator.processJob('inv-123', sources);
      await orchestrator.processJob('inv-123', sources);

      const metrics = orchestrator.getMetrics();

      expect(metrics.totalJobsProcessed).toBe(2);
      expect(metrics.totalEmbeddingsGenerated).toBe(2);
      expect(metrics.averageProcessingTime).toBeGreaterThan(0);
    });

    it('should track modality distribution', async () => {
      const textSources: SourceInput[] = [{ type: 'text', uri: 'Text' }];
      const imageSources: SourceInput[] = [{ type: 'image', uri: '/img.jpg' }];

      await orchestrator.processJob('inv-123', textSources);
      await orchestrator.processJob('inv-123', imageSources);

      const metrics = orchestrator.getMetrics();

      expect(metrics.modalityDistribution.text).toBe(1);
      expect(metrics.modalityDistribution.image).toBe(1);
    });
  });

  describe('events', () => {
    it('should emit job_started event', async () => {
      const handler = jest.fn();
      orchestrator.on('job_started', handler);

      await orchestrator.processJob('inv-123', [
        { type: 'text', uri: 'Test' },
      ]);

      expect(handler).toHaveBeenCalled();
    });

    it('should emit job_completed event', async () => {
      const handler = jest.fn();
      orchestrator.on('job_completed', handler);

      await orchestrator.processJob('inv-123', [
        { type: 'text', uri: 'Test' },
      ]);

      expect(handler).toHaveBeenCalled();
    });

    it('should emit modality_processed event', async () => {
      const handler = jest.fn();
      orchestrator.on('modality_processed', handler);

      await orchestrator.processJob('inv-123', [
        { type: 'text', uri: 'Test' },
        { type: 'image', uri: '/img.jpg' },
      ]);

      expect(handler).toHaveBeenCalledTimes(2);
    });
  });
});

describe('HallucinationGuard', () => {
  let guard: HallucinationGuard;

  beforeEach(() => {
    guard = new HallucinationGuard({
      crossModalThreshold: 0.6,
      autoRejectThreshold: 0.8,
    });
  });

  describe('validate', () => {
    it('should pass validation for consistent embeddings', async () => {
      const fusedEmbedding = createMockFusedEmbedding({
        crossModalScore: 0.9,
      });

      const sources = [createMockTextEmbedding()];

      const result = await guard.validate(fusedEmbedding, sources);

      expect(result.isHallucination).toBe(false);
      expect(result.score).toBeLessThan(0.8);
    });

    it('should detect cross-modal mismatch', async () => {
      const fusedEmbedding = createMockFusedEmbedding({
        modalityVectors: [
          {
            modality: 'text',
            vector: new Array(768).fill(0.1),
            weight: 0.9,
            sourceId: 'src-1',
            confidence: 0.9,
          },
          {
            modality: 'image',
            vector: new Array(768).fill(-0.1), // Opposite direction
            weight: 0.9,
            sourceId: 'src-2',
            confidence: 0.9,
          },
        ],
      });

      const sources = [createMockTextEmbedding(), createMockImageEmbedding()];

      const result = await guard.validate(fusedEmbedding, sources);

      expect(result.reasons.some((r) => r.type === 'cross_modal_mismatch')).toBe(true);
    });

    it('should detect confidence anomalies', async () => {
      const lowConfidenceSources = [
        createMockTextEmbedding({ confidence: 0.2 }),
      ];

      const fusedEmbedding = createMockFusedEmbedding({
        crossModalScore: 0.95, // Anomalously high
      });

      const result = await guard.validate(fusedEmbedding, lowConfidenceSources);

      const hasConfidenceAnomaly = result.reasons.some(
        (r) => r.type === 'confidence_anomaly',
      );
      expect(hasConfidenceAnomaly).toBe(true);
    });
  });

  describe('statistics', () => {
    it('should track validation statistics', async () => {
      const fusedEmbedding = createMockFusedEmbedding();
      const sources = [createMockTextEmbedding()];

      await guard.validate(fusedEmbedding, sources);
      await guard.validate(fusedEmbedding, sources);

      const stats = guard.getStats();

      expect(stats.totalValidations).toBe(2);
    });
  });
});

describe('CLIPPipeline', () => {
  describe('embedImage', () => {
    it('should generate image embedding', async () => {
      const pipeline = new CLIPPipeline();
      const embedding = await pipeline.embedImage(
        '/path/to/image.jpg',
        'inv-123',
      );

      expect(embedding).toBeDefined();
      expect(embedding.modality).toBe('image');
    });
  });
});

describe('TextPipeline', () => {
  describe('embedText', () => {
    it('should generate text embedding', async () => {
      const pipeline = new TextPipeline();
      const embedding = await pipeline.embedText(
        'Sample OSINT intelligence text',
        'inv-123',
      );

      expect(embedding).toBeDefined();
      expect(embedding.modality).toBe('text');
    });
  });

  describe('extractEntities', () => {
    it('should extract email entities', async () => {
      const pipeline = new TextPipeline();
      const entities = await pipeline.extractEntities(
        'Contact us at test@example.com for more info.',
      );

      expect(entities.some((e) => e.type === 'EMAIL')).toBe(true);
    });

    it('should extract URL entities', async () => {
      const pipeline = new TextPipeline();
      const entities = await pipeline.extractEntities(
        'Visit https://example.com for details.',
      );

      expect(entities.some((e) => e.type === 'URL')).toBe(true);
    });

    it('should extract IP addresses', async () => {
      const pipeline = new TextPipeline();
      const entities = await pipeline.extractEntities(
        'Server IP: 192.168.1.1',
      );

      expect(entities.some((e) => e.type === 'IP_ADDRESS')).toBe(true);
    });
  });
});

describe('VideoPipeline', () => {
  describe('embedVideo', () => {
    it('should generate video embedding with key frames', async () => {
      const pipeline = new VideoPipeline();
      const embedding = await pipeline.embedVideo(
        '/path/to/video.mp4',
        'inv-123',
      );

      expect(embedding).toBeDefined();
      expect(embedding.modality).toBe('video');
    });
  });
});

describe('Performance Tests', () => {
  it('should process single embedding under 5 seconds', async () => {
    const orchestrator = new FusionOrchestrator({
      enableGraphEmbeddings: false,
      enablePgVectorStorage: false,
    });

    const start = Date.now();

    await orchestrator.processJob('inv-123', [
      { type: 'text', uri: 'Performance test text' },
    ]);

    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(5000);
  });

  it('should handle batch of 10 embeddings efficiently', async () => {
    const orchestrator = new FusionOrchestrator({
      enableGraphEmbeddings: false,
      enablePgVectorStorage: false,
      parallelProcessing: true,
      maxConcurrency: 4,
    });

    const sourceGroups = Array.from({ length: 10 }, (_, i) => ({
      entityId: `entity-${i}`,
      sources: [{ type: 'text' as const, uri: `Text content ${i}` }],
    }));

    const start = Date.now();

    const results = await orchestrator.processBatch('inv-123', sourceGroups);

    const elapsed = Date.now() - start;

    expect(results.length).toBe(10);
    expect(elapsed).toBeLessThan(30000); // 30 seconds for batch
  });
});

// Helper functions to create mock embeddings

function createMockTextEmbedding(overrides: Partial<TextEmbedding> = {}): TextEmbedding {
  return {
    id: `text-${Date.now()}`,
    vector: new Array(1536).fill(0).map(() => Math.random() - 0.5),
    dimension: 1536,
    model: 'text-embedding-3-small',
    modality: 'text',
    timestamp: new Date(),
    metadata: {
      sourceId: 'src-text',
      sourceUri: 'text://test',
      investigationId: 'inv-123',
      confidence: 0.9,
      processingTime: 100,
      provenance: {
        extractorName: 'TextPipeline',
        extractorVersion: '1.0.0',
        modelName: 'text-embedding-3-small',
        modelVersion: '1.0',
        processingParams: {},
        errors: [],
        warnings: [],
      },
    },
    text: 'Sample text content',
    ...overrides,
  } as TextEmbedding;
}

function createMockImageEmbedding(overrides: Partial<ImageEmbedding> = {}): ImageEmbedding {
  return {
    id: `image-${Date.now()}`,
    vector: new Array(768).fill(0).map(() => Math.random() - 0.5),
    dimension: 768,
    model: 'clip-vit-large-patch14',
    modality: 'image',
    timestamp: new Date(),
    metadata: {
      sourceId: 'src-image',
      sourceUri: '/path/to/image.jpg',
      investigationId: 'inv-123',
      confidence: 0.85,
      processingTime: 200,
      provenance: {
        extractorName: 'CLIPPipeline',
        extractorVersion: '1.0.0',
        modelName: 'ViT-L/14',
        modelVersion: '1.0',
        processingParams: {},
        errors: [],
        warnings: [],
      },
    },
    imagePath: '/path/to/image.jpg',
    width: 1920,
    height: 1080,
    format: 'jpg',
    ...overrides,
  } as ImageEmbedding;
}

function createMockVideoEmbedding(overrides: Partial<VideoEmbedding> = {}): VideoEmbedding {
  return {
    id: `video-${Date.now()}`,
    vector: new Array(768).fill(0).map(() => Math.random() - 0.5),
    dimension: 768,
    model: 'clip-vit-large-patch14',
    modality: 'video',
    timestamp: new Date(),
    metadata: {
      sourceId: 'src-video',
      sourceUri: '/path/to/video.mp4',
      investigationId: 'inv-123',
      confidence: 0.8,
      processingTime: 5000,
      provenance: {
        extractorName: 'VideoPipeline',
        extractorVersion: '1.0.0',
        modelName: 'ViT-L/14',
        modelVersion: '1.0',
        processingParams: {},
        errors: [],
        warnings: [],
      },
    },
    videoPath: '/path/to/video.mp4',
    duration: 60,
    fps: 30,
    width: 1920,
    height: 1080,
    keyFrames: [],
    aggregateVector: new Array(768).fill(0).map(() => Math.random() - 0.5),
    temporalSegments: [],
    ...overrides,
  } as VideoEmbedding;
}

function createMockFusedEmbedding(overrides: Partial<FusedEmbedding> = {}): FusedEmbedding {
  return {
    id: `fused-${Date.now()}`,
    investigationId: 'inv-123',
    entityId: 'entity-1',
    fusionMethod: 'weighted_average',
    modalityVectors: [
      {
        modality: 'text',
        vector: new Array(768).fill(0.1),
        weight: 0.9,
        sourceId: 'src-1',
        confidence: 0.9,
      },
    ],
    fusedVector: new Array(768).fill(0.1),
    fusedDimension: 768,
    crossModalScore: 0.85,
    hallucinationScore: 0.1,
    verificationStatus: 'unverified',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
