/**
 * Policy Service Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { PolicyService } from '../services/policy.service.js';
import type { MediaAsset, Transcript, Utterance } from '../types/media.js';
import { generateId } from '../utils/hash.js';
import { now } from '../utils/time.js';

describe('PolicyService', () => {
  let service: PolicyService;

  beforeEach(() => {
    service = new PolicyService();
  });

  const createMockMediaAsset = (overrides: Partial<MediaAsset> = {}): MediaAsset => ({
    id: generateId(),
    type: 'audio',
    format: 'mp3',
    status: 'completed',
    metadata: {
      filename: 'test.mp3',
      mimeType: 'audio/mpeg',
      size: 1024,
      duration: 60000,
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
    ...overrides,
  });

  const createMockTranscript = (utterances: Utterance[]): Transcript => ({
    id: generateId(),
    mediaAssetId: 'test-media',
    format: 'json',
    language: 'en',
    utterances,
    participants: [],
    speakerCount: 1,
    wordCount: utterances.reduce((sum, u) => sum + u.content.split(/\s+/).length, 0),
    duration: 60000,
    sttProvider: 'mock',
    rawContent: utterances.map((u) => u.content).join(' '),
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

  describe('redactText', () => {
    it('should redact phone numbers', () => {
      const result = service.redactText('Call me at 555-123-4567 or 555.987.6543');

      expect(result.redactedText).not.toContain('555-123-4567');
      expect(result.redactedText).not.toContain('555.987.6543');
      expect(result.redactedText).toContain('[PHONE REDACTED]');
      expect(result.redactionsApplied).toBe(2);
      expect(result.fieldTypes).toContain('phone');
    });

    it('should redact email addresses', () => {
      const result = service.redactText('Email me at john.doe@example.com for details');

      expect(result.redactedText).not.toContain('john.doe@example.com');
      expect(result.redactedText).toContain('[EMAIL REDACTED]');
      expect(result.redactionsApplied).toBe(1);
      expect(result.fieldTypes).toContain('email');
    });

    it('should redact SSN numbers', () => {
      const result = service.redactText('My SSN is 123-45-6789');

      expect(result.redactedText).not.toContain('123-45-6789');
      expect(result.redactedText).toContain('[SSN REDACTED]');
      expect(result.fieldTypes).toContain('ssn');
    });

    it('should redact credit card numbers', () => {
      const result = service.redactText('Card number is 4111-1111-1111-1111');

      expect(result.redactedText).not.toContain('4111-1111-1111-1111');
      expect(result.redactedText).toContain('[CARD REDACTED]');
      expect(result.fieldTypes).toContain('credit_card');
    });

    it('should redact IP addresses', () => {
      const result = service.redactText('Server IP is 192.168.1.100');

      expect(result.redactedText).not.toContain('192.168.1.100');
      expect(result.redactedText).toContain('[IP REDACTED]');
      expect(result.fieldTypes).toContain('ip');
    });

    it('should handle text with no sensitive data', () => {
      const result = service.redactText('Hello, this is a normal message.');

      expect(result.redactedText).toBe('Hello, this is a normal message.');
      expect(result.redactionsApplied).toBe(0);
      expect(result.rulesApplied.length).toBe(0);
    });

    it('should apply multiple redaction rules', () => {
      const result = service.redactText(
        'Call 555-123-4567 or email test@example.com. SSN: 123-45-6789'
      );

      expect(result.redactedText).toContain('[PHONE REDACTED]');
      expect(result.redactedText).toContain('[EMAIL REDACTED]');
      expect(result.redactedText).toContain('[SSN REDACTED]');
      expect(result.redactionsApplied).toBe(3);
    });

    it('should apply specific rules when ruleIds provided', () => {
      const result = service.redactText('Call 555-123-4567 or email test@example.com', [
        'phone-us',
      ]);

      expect(result.redactedText).toContain('[PHONE REDACTED]');
      expect(result.redactedText).toContain('test@example.com'); // Email not redacted
      expect(result.rulesApplied).toContain('phone-us');
      expect(result.rulesApplied).not.toContain('email');
    });
  });

  describe('redactTranscript', () => {
    it('should redact all utterances in a transcript', () => {
      const utterances: Utterance[] = [
        {
          id: 'u1',
          transcriptId: 'test',
          sequenceNumber: 0,
          content: 'My phone is 555-123-4567',
          startTime: 0,
          endTime: 2000,
          createdAt: now(),
        },
        {
          id: 'u2',
          transcriptId: 'test',
          sequenceNumber: 1,
          content: 'Email me at user@test.com',
          startTime: 2000,
          endTime: 4000,
          createdAt: now(),
        },
      ];

      const transcript = createMockTranscript(utterances);
      const { redactedTranscript, event } = service.redactTranscript(transcript);

      expect(redactedTranscript.utterances[0].content).toContain('[PHONE REDACTED]');
      expect(redactedTranscript.utterances[1].content).toContain('[EMAIL REDACTED]');
      expect(event.redactionsCount).toBeGreaterThan(0);
    });

    it('should redact raw content', () => {
      const utterances: Utterance[] = [
        {
          id: 'u1',
          transcriptId: 'test',
          sequenceNumber: 0,
          content: 'Call 555-123-4567',
          startTime: 0,
          endTime: 2000,
          createdAt: now(),
        },
      ];

      const transcript = createMockTranscript(utterances);
      const { redactedTranscript } = service.redactTranscript(transcript);

      expect(redactedTranscript.rawContentRedacted).toBeDefined();
      expect(redactedTranscript.rawContentRedacted).toContain('[PHONE REDACTED]');
    });

    it('should set contentRedacted on utterances', () => {
      const utterances: Utterance[] = [
        {
          id: 'u1',
          transcriptId: 'test',
          sequenceNumber: 0,
          content: 'My SSN is 123-45-6789',
          startTime: 0,
          endTime: 2000,
          createdAt: now(),
        },
      ];

      const transcript = createMockTranscript(utterances);
      const { redactedTranscript } = service.redactTranscript(transcript);

      expect(redactedTranscript.utterances[0].contentRedacted).toBeDefined();
      expect(redactedTranscript.utterances[0].contentRedacted).toContain('[SSN REDACTED]');
    });
  });

  describe('addRedactionRule', () => {
    it('should add custom redaction rule', () => {
      service.addRedactionRule({
        id: 'custom-rule',
        name: 'Custom Rule',
        pattern: 'SECRET\\d+',
        replacement: '[CUSTOM REDACTED]',
        enabled: true,
        priority: 100,
      });

      const result = service.redactText('The code is SECRET123');
      expect(result.redactedText).toContain('[CUSTOM REDACTED]');
    });
  });

  describe('removeRedactionRule', () => {
    it('should remove custom redaction rule', () => {
      service.addRedactionRule({
        id: 'temp-rule',
        name: 'Temp Rule',
        pattern: 'TEMP',
        replacement: '[REMOVED]',
        enabled: true,
        priority: 100,
      });

      const removed = service.removeRedactionRule('temp-rule');
      expect(removed).toBe(true);

      const result = service.redactText('This is TEMP data');
      expect(result.redactedText).toBe('This is TEMP data');
    });
  });

  describe('applyRetentionPolicy', () => {
    it('should apply default retention policy', () => {
      const asset = createMockMediaAsset();
      const result = service.applyRetentionPolicy(asset);

      expect(result.action).toBe('retain');
      expect(result.expiresAt).toBeDefined();
    });

    it('should respect legal hold policy', () => {
      const asset = createMockMediaAsset({
        policy: { retentionPolicy: 'legal-hold' },
      });
      const result = service.applyRetentionPolicy(asset);

      expect(result.action).toBe('retain');
    });

    it('should apply short-term retention', () => {
      const asset = createMockMediaAsset({
        policy: { retentionPolicy: 'short-term' },
      });
      const result = service.applyRetentionPolicy(asset);

      expect(result.expiresAt).toBeDefined();
      // Verify expiration is approximately 30 days from now
      const expirationDate = new Date(result.expiresAt!);
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 30);
      const diffDays = Math.abs(
        (expirationDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(diffDays).toBeLessThan(1);
    });
  });

  describe('getActiveRules', () => {
    it('should return only enabled rules', () => {
      const rules = service.getActiveRules();
      expect(rules.every((r) => r.enabled)).toBe(true);
    });

    it('should sort rules by priority', () => {
      const rules = service.getActiveRules();
      for (let i = 1; i < rules.length; i++) {
        expect(rules[i - 1].priority).toBeGreaterThanOrEqual(rules[i].priority);
      }
    });
  });
});
