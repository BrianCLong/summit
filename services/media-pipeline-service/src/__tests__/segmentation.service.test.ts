/**
 * Segmentation Service Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { SegmentationService } from '../services/segmentation.service.js';
import type { Transcript, Utterance, ParticipantRef } from '../types/media.js';
import { generateId } from '../utils/hash.js';
import { now } from '../utils/time.js';

describe('SegmentationService', () => {
  let service: SegmentationService;

  beforeEach(() => {
    service = new SegmentationService();
  });

  const createMockUtterance = (
    id: string,
    content: string,
    startTime: number,
    endTime: number,
    speakerLabel?: string
  ): Utterance => ({
    id,
    transcriptId: 'test-transcript',
    sequenceNumber: 0,
    content,
    startTime,
    endTime,
    duration: endTime - startTime,
    speakerLabel,
    createdAt: now(),
  });

  const createMockTranscript = (utterances: Utterance[]): Transcript => ({
    id: 'test-transcript',
    mediaAssetId: 'test-media',
    format: 'json',
    language: 'en',
    utterances,
    participants: [
      { id: generateId(), speakerId: 'SPEAKER_00', displayName: 'Speaker 1' },
      { id: generateId(), speakerId: 'SPEAKER_01', displayName: 'Speaker 2' },
    ],
    speakerCount: 2,
    wordCount: utterances.reduce((sum, u) => sum + u.content.split(/\s+/).length, 0),
    duration: utterances.length > 0 ? utterances[utterances.length - 1].endTime : 0,
    sttProvider: 'mock',
    provenance: {
      sourceId: 'test-media',
      sourceType: 'media_asset',
      ingestedAt: now(),
      ingestedBy: 'test',
      transformChain: [],
      originalChecksum: 'abc123',
    },
    createdAt: now(),
  });

  describe('segment', () => {
    it('should create threads from utterances', () => {
      const utterances = [
        createMockUtterance('u1', 'Hello, how are you?', 0, 2000, 'SPEAKER_00'),
        createMockUtterance('u2', 'I am fine, thank you.', 2500, 5000, 'SPEAKER_01'),
        createMockUtterance('u3', 'Great to hear!', 5500, 7000, 'SPEAKER_00'),
      ];

      const transcript = createMockTranscript(utterances);
      const result = service.segment(transcript);

      expect(result.threads.length).toBeGreaterThan(0);
      expect(result.metadata.totalThreads).toBe(result.threads.length);
    });

    it('should identify sessions based on time gaps', () => {
      const utterances = [
        createMockUtterance('u1', 'First session start', 0, 2000, 'SPEAKER_00'),
        createMockUtterance('u2', 'First session continued', 2500, 5000, 'SPEAKER_01'),
        // 35 second gap - should create new session
        createMockUtterance('u3', 'Second session start', 40000, 42000, 'SPEAKER_00'),
        createMockUtterance('u4', 'Second session continued', 42500, 45000, 'SPEAKER_01'),
      ];

      const transcript = createMockTranscript(utterances);
      const result = service.segment(transcript, { sessionGapThreshold: 30000 });

      expect(result.sessions.length).toBe(2);
    });

    it('should identify key turns based on keywords', () => {
      const utterances = [
        createMockUtterance('u1', 'Hello everyone', 0, 2000, 'SPEAKER_00'),
        createMockUtterance('u2', 'This is a critical decision we need to make', 2500, 5000, 'SPEAKER_01'),
        createMockUtterance('u3', 'I agree with that important point', 5500, 7000, 'SPEAKER_00'),
        createMockUtterance('u4', 'Goodbye', 7500, 9000, 'SPEAKER_01'),
      ];

      const transcript = createMockTranscript(utterances);
      const result = service.segment(transcript, { enableKeyTurnDetection: true });

      expect(result.keyTurns.length).toBeGreaterThan(0);
      // "critical" and "important" are key turn keywords
      const keyTurnContents = result.keyTurns.map((kt) => kt.content);
      expect(keyTurnContents.some((c) => c.includes('critical') || c.includes('important'))).toBe(true);
    });

    it('should identify questions as key turns', () => {
      const utterances = [
        createMockUtterance('u1', 'Hello everyone', 0, 2000, 'SPEAKER_00'),
        createMockUtterance('u2', 'What do you think about this proposal?', 2500, 5000, 'SPEAKER_01'),
        createMockUtterance('u3', 'I think it looks good', 5500, 7000, 'SPEAKER_00'),
      ];

      const transcript = createMockTranscript(utterances);
      const result = service.segment(transcript, { enableKeyTurnDetection: true });

      const keyTurnContents = result.keyTurns.map((kt) => kt.content);
      expect(keyTurnContents.some((c) => c.includes('?'))).toBe(true);
    });

    it('should extract topics and keywords from utterances', () => {
      const utterances = [
        createMockUtterance('u1', 'The budget report is ready for review', 0, 2000, 'SPEAKER_00'),
        createMockUtterance('u2', 'The budget needs to be approved by Friday', 2500, 5000, 'SPEAKER_01'),
        createMockUtterance('u3', 'I will review the budget tomorrow', 5500, 7000, 'SPEAKER_00'),
      ];

      const transcript = createMockTranscript(utterances);
      const result = service.segment(transcript, { enableTopicSegmentation: true });

      expect(result.threads.length).toBeGreaterThan(0);
      const thread = result.threads[0];
      expect(thread.keywords).toBeDefined();
      expect(thread.keywords?.includes('budget')).toBe(true);
    });

    it('should handle empty transcript', () => {
      const transcript = createMockTranscript([]);
      const result = service.segment(transcript);

      expect(result.threads.length).toBe(0);
      expect(result.sessions.length).toBe(0);
      expect(result.keyTurns.length).toBe(0);
    });

    it('should respect minUtterancesPerThread option', () => {
      const utterances = [
        createMockUtterance('u1', 'Single utterance session', 0, 2000, 'SPEAKER_00'),
        // 35 second gap
        createMockUtterance('u2', 'Another single utterance', 40000, 42000, 'SPEAKER_01'),
        createMockUtterance('u3', 'And another one', 42500, 45000, 'SPEAKER_00'),
      ];

      const transcript = createMockTranscript(utterances);

      // With minUtterancesPerThread = 2, first session should be excluded
      const result = service.segment(transcript, {
        sessionGapThreshold: 30000,
        minUtterancesPerThread: 2,
      });

      // Only the second session (with 2 utterances) should create a thread
      expect(result.threads.length).toBe(1);
    });
  });

  describe('generateThreadSummary', () => {
    it('should generate summary for a thread', () => {
      const utterances = [
        createMockUtterance('u1', 'Hello', 0, 2000, 'SPEAKER_00'),
        createMockUtterance('u2', 'Hi there', 2500, 5000, 'SPEAKER_01'),
      ];

      const transcript = createMockTranscript(utterances);
      const result = service.segment(transcript);

      if (result.threads.length > 0) {
        const summary = service.generateThreadSummary(result.threads[0], utterances);
        expect(summary).toContain('participant');
      }
    });

    it('should handle empty thread', () => {
      const summary = service.generateThreadSummary(
        {
          id: 'empty-thread',
          transcriptId: 'test',
          type: 'session',
          participants: [],
          utteranceIds: [],
          utteranceCount: 0,
          createdAt: now(),
        },
        []
      );

      expect(summary).toBe('Empty thread');
    });
  });
});
