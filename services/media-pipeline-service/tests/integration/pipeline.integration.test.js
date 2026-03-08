"use strict";
/**
 * Pipeline Integration Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const pipeline_service_js_1 = require("../../src/services/pipeline.service.js");
const registry_js_1 = require("../../src/providers/registry.js");
const hash_js_1 = require("../../src/utils/hash.js");
const time_js_1 = require("../../src/utils/time.js");
(0, globals_1.describe)('Pipeline Integration', () => {
    let pipelineService;
    (0, globals_1.beforeAll)(async () => {
        // Initialize provider registry
        await registry_js_1.providerRegistry.initialize();
        pipelineService = new pipeline_service_js_1.PipelineService();
    });
    const createMockMediaAsset = (type = 'audio') => ({
        id: (0, hash_js_1.generateId)(),
        type,
        format: type === 'document' ? 'pdf' : 'mp3',
        status: 'pending',
        metadata: {
            filename: `test.${type === 'document' ? 'pdf' : 'mp3'}`,
            mimeType: type === 'document' ? 'application/pdf' : 'audio/mpeg',
            size: 1024 * 1024,
            duration: 60000,
        },
        storage: {
            provider: 'local',
            key: `test-${(0, hash_js_1.generateId)()}`,
        },
        checksum: (0, hash_js_1.generateId)(),
        provenance: {
            sourceId: 'test',
            sourceType: 'upload',
            ingestedAt: (0, time_js_1.now)(),
            ingestedBy: 'integration-test',
            transformChain: [],
            originalChecksum: (0, hash_js_1.generateId)(),
        },
        retryCount: 0,
        createdAt: (0, time_js_1.now)(),
    });
    (0, globals_1.describe)('Full Pipeline Processing', () => {
        (0, globals_1.it)('should process audio asset through full pipeline', async () => {
            const mediaAsset = createMockMediaAsset('audio');
            const result = await pipelineService.process(mediaAsset, {
                skipGraphSync: true,
                skipSpacetimeSync: true,
            });
            (0, globals_1.expect)(result.success).toBe(true);
            (0, globals_1.expect)(result.mediaAsset.status).toBe('completed');
            (0, globals_1.expect)(result.transcript).toBeDefined();
            (0, globals_1.expect)(result.transcript?.utterances.length).toBeGreaterThan(0);
            (0, globals_1.expect)(result.transcript?.speakerCount).toBeGreaterThan(0);
            (0, globals_1.expect)(result.errors.length).toBe(0);
        }, 30000);
        (0, globals_1.it)('should skip transcription for non-audio assets', async () => {
            const mediaAsset = createMockMediaAsset('document');
            const result = await pipelineService.process(mediaAsset, {
                skipGraphSync: true,
                skipSpacetimeSync: true,
            });
            (0, globals_1.expect)(result.success).toBe(true);
            (0, globals_1.expect)(result.transcript).toBeUndefined();
            const transcriptionStage = result.stages.find((s) => s.name === 'transcription');
            (0, globals_1.expect)(transcriptionStage?.status).toBe('skipped');
        });
        (0, globals_1.it)('should record processing stages', async () => {
            const mediaAsset = createMockMediaAsset('audio');
            const result = await pipelineService.process(mediaAsset, {
                skipGraphSync: true,
                skipSpacetimeSync: true,
            });
            (0, globals_1.expect)(result.stages.length).toBeGreaterThan(0);
            const stageNames = result.stages.map((s) => s.name);
            (0, globals_1.expect)(stageNames).toContain('evidence');
            (0, globals_1.expect)(stageNames).toContain('retention');
            (0, globals_1.expect)(stageNames).toContain('transcription');
        });
        (0, globals_1.it)('should apply redaction when enabled', async () => {
            const mediaAsset = createMockMediaAsset('audio');
            const result = await pipelineService.process(mediaAsset, {
                skipGraphSync: true,
                skipSpacetimeSync: true,
                skipRedaction: false,
            });
            (0, globals_1.expect)(result.success).toBe(true);
            const redactionStage = result.stages.find((s) => s.name === 'redaction');
            (0, globals_1.expect)(redactionStage?.status).toBe('completed');
        });
        (0, globals_1.it)('should emit events during processing', async () => {
            const mediaAsset = createMockMediaAsset('audio');
            const events = [];
            const unsubscribe = pipelineService.onEvent((event) => {
                events.push(event.type);
            });
            await pipelineService.process(mediaAsset, {
                skipGraphSync: true,
                skipSpacetimeSync: true,
            });
            unsubscribe();
            (0, globals_1.expect)(events).toContain('processing.started');
            (0, globals_1.expect)(events).toContain('transcription.started');
            (0, globals_1.expect)(events).toContain('transcription.completed');
            (0, globals_1.expect)(events).toContain('processing.completed');
        });
    });
    (0, globals_1.describe)('Pipeline Options', () => {
        (0, globals_1.it)('should skip transcription when option is set', async () => {
            const mediaAsset = createMockMediaAsset('audio');
            const result = await pipelineService.process(mediaAsset, {
                skipTranscription: true,
                skipGraphSync: true,
                skipSpacetimeSync: true,
            });
            (0, globals_1.expect)(result.success).toBe(true);
            (0, globals_1.expect)(result.transcript).toBeUndefined();
            const transcriptionStage = result.stages.find((s) => s.name === 'transcription');
            (0, globals_1.expect)(transcriptionStage?.status).toBe('skipped');
        });
        (0, globals_1.it)('should skip segmentation when option is set', async () => {
            const mediaAsset = createMockMediaAsset('audio');
            const result = await pipelineService.process(mediaAsset, {
                skipSegmentation: true,
                skipGraphSync: true,
                skipSpacetimeSync: true,
            });
            (0, globals_1.expect)(result.success).toBe(true);
            const segmentationStage = result.stages.find((s) => s.name === 'segmentation');
            (0, globals_1.expect)(segmentationStage?.status).toBe('skipped');
        });
        (0, globals_1.it)('should skip redaction when option is set', async () => {
            const mediaAsset = createMockMediaAsset('audio');
            const result = await pipelineService.process(mediaAsset, {
                skipRedaction: true,
                skipGraphSync: true,
                skipSpacetimeSync: true,
            });
            const redactionStage = result.stages.find((s) => s.name === 'redaction');
            (0, globals_1.expect)(redactionStage?.status).toBe('skipped');
        });
    });
    (0, globals_1.describe)('Job Management', () => {
        (0, globals_1.it)('should create processing job', () => {
            const job = pipelineService.createJob('media-123', 'transcribe', 75);
            (0, globals_1.expect)(job.id).toBeDefined();
            (0, globals_1.expect)(job.mediaAssetId).toBe('media-123');
            (0, globals_1.expect)(job.type).toBe('transcribe');
            (0, globals_1.expect)(job.priority).toBe(75);
            (0, globals_1.expect)(job.status).toBe('pending');
        });
        (0, globals_1.it)('should update job status', () => {
            const job = pipelineService.createJob('media-123', 'transcribe');
            const updatedJob = pipelineService.updateJobStatus(job, 'completed', {
                transcriptId: 'transcript-456',
            });
            (0, globals_1.expect)(updatedJob.status).toBe('completed');
            (0, globals_1.expect)(updatedJob.output?.transcriptId).toBe('transcript-456');
            (0, globals_1.expect)(updatedJob.completedAt).toBeDefined();
        });
    });
});
