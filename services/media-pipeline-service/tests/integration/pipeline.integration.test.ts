/**
 * Pipeline Integration Tests
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PipelineService } from '../../src/services/pipeline.service.js';
import { providerRegistry } from '../../src/providers/registry.js';
import type { MediaAsset } from '../../src/types/media.js';
import { generateId } from '../../src/utils/hash.js';
import { now } from '../../src/utils/time.js';

describe('Pipeline Integration', () => {
  let pipelineService: PipelineService;

  beforeAll(async () => {
    // Initialize provider registry
    await providerRegistry.initialize();
    pipelineService = new PipelineService();
  });

  const createMockMediaAsset = (type: 'audio' | 'video' | 'document' = 'audio'): MediaAsset => ({
    id: generateId(),
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
      key: `test-${generateId()}`,
    },
    checksum: generateId(),
    provenance: {
      sourceId: 'test',
      sourceType: 'upload',
      ingestedAt: now(),
      ingestedBy: 'integration-test',
      transformChain: [],
      originalChecksum: generateId(),
    },
    retryCount: 0,
    createdAt: now(),
  });

  describe('Full Pipeline Processing', () => {
    it('should process audio asset through full pipeline', async () => {
      const mediaAsset = createMockMediaAsset('audio');

      const result = await pipelineService.process(mediaAsset, {
        skipGraphSync: true,
        skipSpacetimeSync: true,
      });

      expect(result.success).toBe(true);
      expect(result.mediaAsset.status).toBe('completed');
      expect(result.transcript).toBeDefined();
      expect(result.transcript?.utterances.length).toBeGreaterThan(0);
      expect(result.transcript?.speakerCount).toBeGreaterThan(0);
      expect(result.errors.length).toBe(0);
    }, 30000);

    it('should skip transcription for non-audio assets', async () => {
      const mediaAsset = createMockMediaAsset('document');

      const result = await pipelineService.process(mediaAsset, {
        skipGraphSync: true,
        skipSpacetimeSync: true,
      });

      expect(result.success).toBe(true);
      expect(result.transcript).toBeUndefined();
      const transcriptionStage = result.stages.find((s) => s.name === 'transcription');
      expect(transcriptionStage?.status).toBe('skipped');
    });

    it('should record processing stages', async () => {
      const mediaAsset = createMockMediaAsset('audio');

      const result = await pipelineService.process(mediaAsset, {
        skipGraphSync: true,
        skipSpacetimeSync: true,
      });

      expect(result.stages.length).toBeGreaterThan(0);

      const stageNames = result.stages.map((s) => s.name);
      expect(stageNames).toContain('evidence');
      expect(stageNames).toContain('retention');
      expect(stageNames).toContain('transcription');
    });

    it('should apply redaction when enabled', async () => {
      const mediaAsset = createMockMediaAsset('audio');

      const result = await pipelineService.process(mediaAsset, {
        skipGraphSync: true,
        skipSpacetimeSync: true,
        skipRedaction: false,
      });

      expect(result.success).toBe(true);
      const redactionStage = result.stages.find((s) => s.name === 'redaction');
      expect(redactionStage?.status).toBe('completed');
    });

    it('should emit events during processing', async () => {
      const mediaAsset = createMockMediaAsset('audio');
      const events: string[] = [];

      const unsubscribe = pipelineService.onEvent((event) => {
        events.push(event.type);
      });

      await pipelineService.process(mediaAsset, {
        skipGraphSync: true,
        skipSpacetimeSync: true,
      });

      unsubscribe();

      expect(events).toContain('processing.started');
      expect(events).toContain('transcription.started');
      expect(events).toContain('transcription.completed');
      expect(events).toContain('processing.completed');
    });
  });

  describe('Pipeline Options', () => {
    it('should skip transcription when option is set', async () => {
      const mediaAsset = createMockMediaAsset('audio');

      const result = await pipelineService.process(mediaAsset, {
        skipTranscription: true,
        skipGraphSync: true,
        skipSpacetimeSync: true,
      });

      expect(result.success).toBe(true);
      expect(result.transcript).toBeUndefined();
      const transcriptionStage = result.stages.find((s) => s.name === 'transcription');
      expect(transcriptionStage?.status).toBe('skipped');
    });

    it('should skip segmentation when option is set', async () => {
      const mediaAsset = createMockMediaAsset('audio');

      const result = await pipelineService.process(mediaAsset, {
        skipSegmentation: true,
        skipGraphSync: true,
        skipSpacetimeSync: true,
      });

      expect(result.success).toBe(true);
      const segmentationStage = result.stages.find((s) => s.name === 'segmentation');
      expect(segmentationStage?.status).toBe('skipped');
    });

    it('should skip redaction when option is set', async () => {
      const mediaAsset = createMockMediaAsset('audio');

      const result = await pipelineService.process(mediaAsset, {
        skipRedaction: true,
        skipGraphSync: true,
        skipSpacetimeSync: true,
      });

      const redactionStage = result.stages.find((s) => s.name === 'redaction');
      expect(redactionStage?.status).toBe('skipped');
    });
  });

  describe('Job Management', () => {
    it('should create processing job', () => {
      const job = pipelineService.createJob('media-123', 'transcribe', 75);

      expect(job.id).toBeDefined();
      expect(job.mediaAssetId).toBe('media-123');
      expect(job.type).toBe('transcribe');
      expect(job.priority).toBe(75);
      expect(job.status).toBe('pending');
    });

    it('should update job status', () => {
      const job = pipelineService.createJob('media-123', 'transcribe');
      const updatedJob = pipelineService.updateJobStatus(job, 'completed', {
        transcriptId: 'transcript-456',
      });

      expect(updatedJob.status).toBe('completed');
      expect(updatedJob.output?.transcriptId).toBe('transcript-456');
      expect(updatedJob.completedAt).toBeDefined();
    });
  });
});
