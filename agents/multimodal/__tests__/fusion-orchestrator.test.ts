import { FusionOrchestrator } from '../fusion-orchestrator.js';
import { HallucinationGuard } from '../hallucination-guard.js';
import { CLIPPipeline } from '../clip-pipeline.js';
import { TextPipeline } from '../text-pipeline.js';
import { VideoPipeline } from '../video-pipeline.js';
import { PgVectorStore } from '../pgvector-store.js';
import { Neo4jEmbeddings } from '../neo4j-embeddings.js';
import type {
  FusedEmbedding,
  SourceInput,
  TextEmbedding,
  ImageEmbedding,
  VideoEmbedding,
  EmbeddingMetadata
} from '../types.js';

// Mock dependencies
jest.mock('../clip-pipeline.js');
jest.mock('../text-pipeline.js');
jest.mock('../video-pipeline.js');
jest.mock('../pgvector-store.js');
jest.mock('../neo4j-embeddings.js');

describe('FusionOrchestrator', () => {
  let orchestrator: FusionOrchestrator;
  let mockClipPipeline: jest.Mocked<CLIPPipeline>;
  let mockTextPipeline: jest.Mocked<TextPipeline>;
  let mockVideoPipeline: jest.Mocked<VideoPipeline>;
  let mockVectorStore: jest.Mocked<PgVectorStore>;
  let mockGraphStore: jest.Mocked<Neo4jEmbeddings>;

  beforeEach(() => {
    // Reset mocks
    mockClipPipeline = {
      embedImage: jest.fn().mockResolvedValue(createMockImageEmbedding()),
      embedImageBatch: jest.fn().mockResolvedValue([createMockImageEmbedding()]),
    } as any;

    mockTextPipeline = {
      embedText: jest.fn().mockResolvedValue(createMockTextEmbedding()),
      embedTextBatch: jest.fn().mockResolvedValue([createMockTextEmbedding()]),
      extractEntities: jest.fn().mockResolvedValue([]),
    } as any;

    mockVideoPipeline = {
      embedVideo: jest.fn().mockResolvedValue(createMockVideoEmbedding()),
    } as any;

    mockVectorStore = {
      initialize: jest.fn().mockResolvedValue(undefined),
      store: jest.fn().mockResolvedValue(undefined),
      storeBatch: jest.fn().mockResolvedValue(undefined),
      search: jest.fn().mockResolvedValue([]),
      close: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockGraphStore = {
      initialize: jest.fn().mockResolvedValue(undefined),
      embedNode: jest.fn().mockResolvedValue({
        nodeId: 'test-node',
        labels: ['Test'],
        properties: {},
        embedding: [],
        neighbors: [],
      }),
      close: jest.fn().mockResolvedValue(undefined),
    } as any;

    // Inject mocks
    (CLIPPipeline as jest.Mock).mockImplementation(() => mockClipPipeline);
    (TextPipeline as jest.Mock).mockImplementation(() => mockTextPipeline);
    (VideoPipeline as jest.Mock).mockImplementation(() => mockVideoPipeline);
    (PgVectorStore as jest.Mock).mockImplementation(() => mockVectorStore);
    (Neo4jEmbeddings as jest.Mock).mockImplementation(() => mockGraphStore);

    orchestrator = new FusionOrchestrator({
      enableGraphEmbeddings: true,
      enablePgVectorStorage: true,
    });
  });

  describe('processJob', () => {
    it('should process text inputs correctly', async () => {
      const sources: SourceInput[] = [
        { type: 'text', uri: 'Sample text content' },
      ];

      const result = await orchestrator.processJob('inv-123', sources);

      expect(result).toBeDefined();
      // result is FusedEmbedding
      expect(result.modalityVectors).toBeDefined();

      const jobs = orchestrator.getJobs();
      expect(jobs.length).toBeGreaterThan(0);
      expect(jobs[0].status).toBe('completed');

      expect(mockTextPipeline.embedText).toHaveBeenCalledWith(
        'Sample text content',
        'inv-123',
      );
    });

    it('should process image inputs correctly', async () => {
      const sources: SourceInput[] = [
        { type: 'image', uri: '/path/to/image.jpg' },
      ];

      const result = await orchestrator.processJob('inv-123', sources);

      expect(result).toBeDefined();
      expect(result.modalityVectors).toBeDefined();
      expect(mockClipPipeline.embedImage).toHaveBeenCalledWith(
        '/path/to/image.jpg',
        'inv-123',
      );
    });

    it('should handle mixed modalities', async () => {
      const sources: SourceInput[] = [
        { type: 'text', uri: 'Text' },
        { type: 'image', uri: '/img.jpg' },
      ];

      const result = await orchestrator.processJob('inv-123', sources);

      expect(result).toBeDefined();
      expect(orchestrator.getMetrics().modalityDistribution.text).toBe(1);
      expect(orchestrator.getMetrics().modalityDistribution.image).toBe(1);
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

      expect(result.reasons.some((r: any) => r.type === 'cross_modal_mismatch')).toBe(true);
    });

    it('should detect confidence anomalies', async () => {
      const base = createMockTextEmbedding();
      // Create embedding with low confidence in metadata
      const lowConfEmbedding = createMockTextEmbedding();
      lowConfEmbedding.metadata.confidence = 0.2;

      const lowConfidenceSources = [
        lowConfEmbedding,
      ];

      const fusedEmbedding = createMockFusedEmbedding({
        crossModalScore: 0.95, // Anomalously high
      });

      const result = await guard.validate(fusedEmbedding, lowConfidenceSources);

      const hasConfidenceAnomaly = result.reasons.some(
        (r: any) => r.type === 'confidence_anomaly',
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
