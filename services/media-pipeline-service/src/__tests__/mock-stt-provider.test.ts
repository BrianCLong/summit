/**
 * Mock STT Provider Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { MockSTTProvider } from '../providers/stt/mock-stt-provider.js';
import type { MediaAsset } from '../types/media.js';
import { generateId } from '../utils/hash.js';
import { now } from '../utils/time.js';

describe('MockSTTProvider', () => {
  let provider: MockSTTProvider;

  beforeEach(async () => {
    provider = new MockSTTProvider();
    await provider.initialize({
      id: 'mock-stt',
      name: 'Mock STT Provider',
      type: 'stt',
      version: '1.0.0',
      enabled: true,
      priority: 0,
      options: { processingDelayMs: 1 }, // Fast for tests
    });
  });

  const createMockMediaAsset = (duration: number = 60000): MediaAsset => ({
    id: generateId(),
    type: 'audio',
    format: 'mp3',
    status: 'pending',
    metadata: {
      filename: 'test.mp3',
      mimeType: 'audio/mpeg',
      size: 1024,
      duration,
    },
    storage: {
      provider: 'local',
      key: 'test-key',
    },
    checksum: 'abc123',
    provenance: {
      sourceId: 'test',
      sourceType: 'upload',
      ingestedAt: now(),
      ingestedBy: 'test',
      transformChain: [],
      originalChecksum: 'abc123',
    },
    retryCount: 0,
    createdAt: now(),
  });

  describe('initialization', () => {
    it('should initialize successfully', () => {
      expect(provider.isInitialized()).toBe(true);
    });

    it('should have correct properties', () => {
      expect(provider.id).toBe('mock-stt');
      expect(provider.name).toBe('Mock STT Provider');
      expect(provider.supportedFormats).toContain('mp3');
      expect(provider.supportedLanguages).toContain('en');
    });
  });

  describe('healthCheck', () => {
    it('should return available status', async () => {
      const health = await provider.healthCheck();
      expect(health.status).toBe('available');
      expect(health.providerId).toBe('mock-stt');
    });
  });

  describe('transcribe', () => {
    it('should return successful transcription result', async () => {
      const mediaAsset = createMockMediaAsset(30000); // 30 seconds
      const result = await provider.transcribe({ mediaAsset });

      expect(result.success).toBe(true);
      expect(result.segments.length).toBeGreaterThan(0);
      expect(result.fullText.length).toBeGreaterThan(0);
      expect(result.language).toBe('en');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.provider).toBe('mock-stt');
    });

    it('should generate segments with correct timing', async () => {
      const mediaAsset = createMockMediaAsset(15000); // 15 seconds
      const result = await provider.transcribe({ mediaAsset });

      expect(result.segments.length).toBeGreaterThan(0);

      for (const segment of result.segments) {
        expect(segment.startTime).toBeDefined();
        expect(segment.endTime).toBeDefined();
        expect(segment.endTime).toBeGreaterThan(segment.startTime);
        expect(segment.confidence).toBeGreaterThan(0);
      }
    });

    it('should respect language parameter', async () => {
      const mediaAsset = createMockMediaAsset();
      const result = await provider.transcribe({
        mediaAsset,
        language: 'es',
      });

      expect(result.language).toBe('es');
    });

    it('should generate word timings when enabled', async () => {
      const mediaAsset = createMockMediaAsset(10000);
      const result = await provider.transcribe({
        mediaAsset,
        enableWordTimings: true,
      });

      expect(result.success).toBe(true);
      const segmentsWithWords = result.segments.filter((s) => s.words && s.words.length > 0);
      expect(segmentsWithWords.length).toBeGreaterThan(0);
    });

    it('should include speaker labels', async () => {
      const mediaAsset = createMockMediaAsset(20000);
      const result = await provider.transcribe({ mediaAsset });

      const segmentsWithSpeakers = result.segments.filter((s) => s.speakerLabel);
      expect(segmentsWithSpeakers.length).toBeGreaterThan(0);
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return supported languages', () => {
      const languages = provider.getSupportedLanguages();
      expect(languages).toContain('en');
      expect(languages).toContain('es');
      expect(languages).toContain('fr');
    });
  });

  describe('estimateCost', () => {
    it('should estimate cost based on duration', () => {
      const cost = provider.estimateCost(60000); // 1 minute
      expect(cost).toBeCloseTo(0.006, 4);
    });

    it('should scale cost with duration', () => {
      const cost1 = provider.estimateCost(60000);
      const cost2 = provider.estimateCost(120000);
      expect(cost2).toBeCloseTo(cost1 * 2, 4);
    });
  });
});
