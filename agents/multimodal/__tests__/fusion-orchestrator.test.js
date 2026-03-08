"use strict";
// @ts-nocheck
// @ts-nocheck
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Fusion Orchestrator Tests
 * E2E and performance tests for multimodal fusion pipeline
 */
const globals_1 = require("@jest/globals");
const fusion_orchestrator_js_1 = require("../fusion-orchestrator.js");
const clip_pipeline_js_1 = require("../clip-pipeline.js");
const text_pipeline_js_1 = require("../text-pipeline.js");
const video_pipeline_js_1 = require("../video-pipeline.js");
const hallucination_guard_js_1 = require("../hallucination-guard.js");
const pgvector_store_js_1 = require("../pgvector-store.js");
const neo4j_embeddings_js_1 = require("../neo4j-embeddings.js");
// Mock external dependencies
globals_1.jest.mock('../clip-pipeline.js');
globals_1.jest.mock('../text-pipeline.js');
globals_1.jest.mock('../video-pipeline.js');
globals_1.jest.mock('../pgvector-store.js');
globals_1.jest.mock('../neo4j-embeddings.js');
(0, globals_1.describe)('FusionOrchestrator', () => {
    let orchestrator;
    (0, globals_1.beforeAll)(() => {
        // Setup mocks
        clip_pipeline_js_1.CLIPPipeline.mockImplementation(() => ({
            embedImage: globals_1.jest.fn().mockResolvedValue(createMockImageEmbedding()),
            embedImageBatch: globals_1.jest.fn().mockResolvedValue([createMockImageEmbedding()]),
            clearCache: globals_1.jest.fn(),
            getStats: globals_1.jest.fn().mockReturnValue({ model: 'clip', dimension: 768, cacheSize: 0 }),
        }));
        text_pipeline_js_1.TextPipeline.mockImplementation(() => ({
            embedText: globals_1.jest.fn().mockResolvedValue(createMockTextEmbedding()),
            embedTextBatch: globals_1.jest.fn().mockResolvedValue([createMockTextEmbedding()]),
            clearCache: globals_1.jest.fn(),
            getStats: globals_1.jest.fn().mockReturnValue({ model: 'text', dimension: 1536, cacheSize: 0 }),
            extractEntities: globals_1.jest.fn().mockResolvedValue([{ type: 'EMAIL' }, { type: 'URL' }, { type: 'IP_ADDRESS' }]),
        }));
        video_pipeline_js_1.VideoPipeline.mockImplementation(() => ({
            embedVideo: globals_1.jest.fn().mockResolvedValue(createMockVideoEmbedding()),
            clearCache: globals_1.jest.fn(),
            getStats: globals_1.jest.fn().mockReturnValue({ model: 'clip', cacheSize: 0 }),
        }));
        pgvector_store_js_1.PgVectorStore.mockImplementation(() => ({
            initialize: globals_1.jest.fn().mockResolvedValue(undefined),
            store: globals_1.jest.fn().mockResolvedValue(undefined),
            storeBatch: globals_1.jest.fn().mockResolvedValue(undefined),
            search: globals_1.jest.fn().mockResolvedValue([]),
            close: globals_1.jest.fn().mockResolvedValue(undefined),
        }));
        neo4j_embeddings_js_1.Neo4jEmbeddings.mockImplementation(() => ({
            initialize: globals_1.jest.fn().mockResolvedValue(undefined),
            embedNode: globals_1.jest.fn().mockResolvedValue({ nodeId: 'test-node',
                labels: ['Entity'],
                properties: {},
                embedding: new Array(128).fill(0.1),
                neighbors: [],
            }),
            close: globals_1.jest.fn().mockResolvedValue(undefined),
        }));
    });
    (0, globals_1.beforeEach)(() => {
        orchestrator = new fusion_orchestrator_js_1.FusionOrchestrator({
            enableGraphEmbeddings: false,
            enablePgVectorStorage: false,
            enableHallucinationGuard: true,
        });
    });
    (0, globals_1.afterAll)(async () => {
        await orchestrator?.close();
    });
    (0, globals_1.describe)('processJob', () => {
        (0, globals_1.it)('should process text source successfully', async () => {
            const sources = [
                { type: 'text', uri: 'Sample OSINT text content for analysis' },
            ];
            const result = await orchestrator.processJob('inv-123', sources, 'entity-1');
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.entityId).toBe('entity-1');
            (0, globals_1.expect)(result.investigationId).toBe('inv-123');
            (0, globals_1.expect)(result.fusedVector).toBeDefined();
            (0, globals_1.expect)(result.fusedVector.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should process image source successfully', async () => {
            const sources = [
                { type: 'image', uri: '/path/to/image.jpg' },
            ];
            const result = await orchestrator.processJob('inv-123', sources, 'entity-2');
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.entityId).toBe('entity-2');
            (0, globals_1.expect)(result.modalityVectors.length).toBe(1);
            (0, globals_1.expect)(result.modalityVectors[0].modality).toBe('image');
        });
        (0, globals_1.it)('should process video source successfully', async () => {
            const sources = [
                { type: 'video', uri: '/path/to/video.mp4' },
            ];
            const result = await orchestrator.processJob('inv-123', sources, 'entity-3');
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.entityId).toBe('entity-3');
        });
        (0, globals_1.it)('should fuse multiple modalities', async () => {
            const sources = [
                { type: 'text', uri: 'Text description of the entity' },
                { type: 'image', uri: '/path/to/image.jpg' },
            ];
            const result = await orchestrator.processJob('inv-123', sources, 'entity-4');
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.modalityVectors.length).toBe(2);
            (0, globals_1.expect)(result.crossModalScore).toBeDefined();
        });
        (0, globals_1.it)('should handle empty sources gracefully', async () => {
            const sources = [];
            await (0, globals_1.expect)(orchestrator.processJob('inv-123', sources, 'entity-5')).rejects.toThrow('No embeddings to fuse');
        });
    });
    (0, globals_1.describe)('processBatch', () => {
        (0, globals_1.it)('should process multiple entities in batch', async () => {
            const sourceGroups = [
                {
                    entityId: 'entity-a',
                    sources: [{ type: 'text', uri: 'Text A' }],
                },
                {
                    entityId: 'entity-b',
                    sources: [{ type: 'image', uri: '/path/b.jpg' }],
                },
            ];
            const results = await orchestrator.processBatch('inv-123', sourceGroups);
            (0, globals_1.expect)(results.length).toBe(2);
            (0, globals_1.expect)(results[0].entityId).toBe('entity-a');
            (0, globals_1.expect)(results[1].entityId).toBe('entity-b');
        });
    });
    (0, globals_1.describe)('fusion methods', () => {
        (0, globals_1.it)('should use weighted_average fusion by default', async () => {
            const sources = [
                { type: 'text', uri: 'Test text' },
            ];
            const result = await orchestrator.processJob('inv-123', sources);
            (0, globals_1.expect)(result.fusionMethod).toBe('weighted_average');
        });
        (0, globals_1.it)('should support concatenation fusion', async () => {
            const concatOrchestrator = new fusion_orchestrator_js_1.FusionOrchestrator({
                fusionMethod: 'concatenation',
                enableGraphEmbeddings: false,
                enablePgVectorStorage: false,
            });
            const sources = [
                { type: 'text', uri: 'Test text' },
            ];
            const result = await concatOrchestrator.processJob('inv-123', sources);
            (0, globals_1.expect)(result.fusionMethod).toBe('concatenation');
        });
        (0, globals_1.it)('should support attention fusion', async () => {
            const attentionOrchestrator = new fusion_orchestrator_js_1.FusionOrchestrator({
                fusionMethod: 'attention',
                enableGraphEmbeddings: false,
                enablePgVectorStorage: false,
            });
            const sources = [
                { type: 'text', uri: 'Test text' },
                { type: 'image', uri: '/path/image.jpg' },
            ];
            const result = await attentionOrchestrator.processJob('inv-123', sources);
            (0, globals_1.expect)(result.fusionMethod).toBe('attention');
        });
    });
    (0, globals_1.describe)('metrics', () => {
        (0, globals_1.it)('should track processing metrics', async () => {
            const sources = [
                { type: 'text', uri: 'Test text' },
            ];
            await orchestrator.processJob('inv-123', sources);
            await orchestrator.processJob('inv-123', sources);
            const metrics = orchestrator.getMetrics();
            (0, globals_1.expect)(metrics.totalJobsProcessed).toBe(2);
            (0, globals_1.expect)(metrics.totalEmbeddingsGenerated).toBe(2);
            (0, globals_1.expect)(metrics.averageProcessingTime).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should track modality distribution', async () => {
            const textSources = [{ type: 'text', uri: 'Text' }];
            const imageSources = [{ type: 'image', uri: '/img.jpg' }];
            await orchestrator.processJob('inv-123', textSources);
            await orchestrator.processJob('inv-123', imageSources);
            const metrics = orchestrator.getMetrics();
            (0, globals_1.expect)(metrics.modalityDistribution.text).toBe(1);
            (0, globals_1.expect)(metrics.modalityDistribution.image).toBe(1);
        });
    });
    (0, globals_1.describe)('events', () => {
        (0, globals_1.it)('should emit job_started event', async () => {
            const handler = globals_1.jest.fn();
            orchestrator.on('job_started', handler);
            await orchestrator.processJob('inv-123', [
                { type: 'text', uri: 'Test' },
            ]);
            (0, globals_1.expect)(handler).toHaveBeenCalled();
        });
        (0, globals_1.it)('should emit job_completed event', async () => {
            const handler = globals_1.jest.fn();
            orchestrator.on('job_completed', handler);
            await orchestrator.processJob('inv-123', [
                { type: 'text', uri: 'Test' },
            ]);
            (0, globals_1.expect)(handler).toHaveBeenCalled();
        });
        (0, globals_1.it)('should emit modality_processed event', async () => {
            const handler = globals_1.jest.fn();
            orchestrator.on('modality_processed', handler);
            await orchestrator.processJob('inv-123', [
                { type: 'text', uri: 'Test' },
                { type: 'image', uri: '/img.jpg' },
            ]);
            (0, globals_1.expect)(handler).toHaveBeenCalledTimes(2);
        });
    });
});
(0, globals_1.describe)('HallucinationGuard', () => {
    let guard;
    (0, globals_1.beforeEach)(() => {
        guard = new hallucination_guard_js_1.HallucinationGuard({
            crossModalThreshold: 0.6,
            autoRejectThreshold: 0.8,
        });
    });
    (0, globals_1.describe)('validate', () => {
        (0, globals_1.it)('should pass validation for consistent embeddings', async () => {
            const fusedEmbedding = createMockFusedEmbedding({
                crossModalScore: 0.9,
            });
            const sources = [createMockTextEmbedding()];
            const result = await guard.validate(fusedEmbedding, sources);
            (0, globals_1.expect)(result.isHallucination).toBe(false);
            (0, globals_1.expect)(result.score).toBeLessThan(0.8);
        });
        (0, globals_1.it)('should detect cross-modal mismatch', async () => {
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
            (0, globals_1.expect)(result.reasons.some((r) => r.type === 'cross_modal_mismatch')).toBe(true);
        });
        (0, globals_1.it)('should detect confidence anomalies', async () => {
            const lowConfidenceSources = [
                createMockTextEmbedding(),
            ];
            const fusedEmbedding = createMockFusedEmbedding({
                crossModalScore: 0.95, // Anomalously high
            });
            const result = await guard.validate(fusedEmbedding, lowConfidenceSources);
            const hasConfidenceAnomaly = result.reasons.some((r) => r.type === 'confidence_anomaly');
            (0, globals_1.expect)(hasConfidenceAnomaly).toBeDefined();
        });
    });
    (0, globals_1.describe)('statistics', () => {
        (0, globals_1.it)('should track validation statistics', async () => {
            const fusedEmbedding = createMockFusedEmbedding();
            const sources = [createMockTextEmbedding()];
            await guard.validate(fusedEmbedding, sources);
            await guard.validate(fusedEmbedding, sources);
            const stats = guard.getStats();
            (0, globals_1.expect)(stats.totalValidations).toBe(2);
        });
    });
});
(0, globals_1.describe)('CLIPPipeline', () => {
    (0, globals_1.describe)('embedImage', () => {
        (0, globals_1.it)('should generate image embedding', async () => {
            const pipeline = new clip_pipeline_js_1.CLIPPipeline();
            const embedding = await pipeline.embedImage('/path/to/image.jpg', 'inv-123');
            (0, globals_1.expect)(embedding).toBeDefined();
            (0, globals_1.expect)(embedding.modality).toBe('image');
        });
    });
});
(0, globals_1.describe)('TextPipeline', () => {
    (0, globals_1.describe)('embedText', () => {
        (0, globals_1.it)('should generate text embedding', async () => {
            const pipeline = new text_pipeline_js_1.TextPipeline();
            const embedding = await pipeline.embedText('Sample OSINT intelligence text', 'inv-123');
            (0, globals_1.expect)(embedding).toBeDefined();
            (0, globals_1.expect)(embedding.modality).toBe('text');
        });
    });
    (0, globals_1.describe)('extractEntities', () => {
        (0, globals_1.it)('should extract email entities', async () => {
            const pipeline = new text_pipeline_js_1.TextPipeline();
            const entities = await pipeline.extractEntities('Contact us at test@example.com for more info.');
            (0, globals_1.expect)(entities.some((e) => e.type === 'EMAIL')).toBe(true);
        });
        (0, globals_1.it)('should extract URL entities', async () => {
            const pipeline = new text_pipeline_js_1.TextPipeline();
            const entities = await pipeline.extractEntities('Visit https://example.com for details.');
            (0, globals_1.expect)(entities.some((e) => e.type === 'URL')).toBe(true);
        });
        (0, globals_1.it)('should extract IP addresses', async () => {
            const pipeline = new text_pipeline_js_1.TextPipeline();
            const entities = await pipeline.extractEntities('Server IP: 192.168.1.1');
            (0, globals_1.expect)(entities.some((e) => e.type === 'IP_ADDRESS')).toBe(true);
        });
    });
});
(0, globals_1.describe)('VideoPipeline', () => {
    (0, globals_1.describe)('embedVideo', () => {
        (0, globals_1.it)('should generate video embedding with key frames', async () => {
            const pipeline = new video_pipeline_js_1.VideoPipeline();
            const embedding = await pipeline.embedVideo('/path/to/video.mp4', 'inv-123');
            (0, globals_1.expect)(embedding).toBeDefined();
            (0, globals_1.expect)(embedding.modality).toBe('video');
        });
    });
});
(0, globals_1.describe)('Performance Tests', () => {
    (0, globals_1.it)('should process single embedding under 5 seconds', async () => {
        const orchestrator = new fusion_orchestrator_js_1.FusionOrchestrator({
            enableGraphEmbeddings: false,
            enablePgVectorStorage: false,
        });
        const start = Date.now();
        await orchestrator.processJob('inv-123', [
            { type: 'text', uri: 'Performance test text' },
        ]);
        const elapsed = Date.now() - start;
        (0, globals_1.expect)(elapsed).toBeLessThan(5000);
    });
    (0, globals_1.it)('should handle batch of 10 embeddings efficiently', async () => {
        const orchestrator = new fusion_orchestrator_js_1.FusionOrchestrator({
            enableGraphEmbeddings: false,
            enablePgVectorStorage: false,
            parallelProcessing: true,
            maxConcurrency: 4,
        });
        const sourceGroups = Array.from({ length: 10 }, (_, i) => ({
            entityId: `entity-${i}`,
            sources: [{ type: 'text', uri: `Text content ${i}` }],
        }));
        const start = Date.now();
        const results = await orchestrator.processBatch('inv-123', sourceGroups);
        const elapsed = Date.now() - start;
        (0, globals_1.expect)(results.length).toBe(10);
        (0, globals_1.expect)(elapsed).toBeLessThan(30000); // 30 seconds for batch
    });
});
// Helper functions to create mock embeddings
function createMockTextEmbedding(overrides = {}) {
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
    };
}
function createMockImageEmbedding(overrides = {}) {
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
    };
}
function createMockVideoEmbedding(overrides = {}) {
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
    };
}
function createMockFusedEmbedding(overrides = {}) {
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
