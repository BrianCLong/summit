/**
 * Tests for SignalNormalizer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SignalNormalizer } from '../core/SignalNormalizer';
import { SignalType, PrivacyLevel } from '../core/types';

describe('SignalNormalizer', () => {
  let normalizer: SignalNormalizer;

  beforeEach(() => {
    normalizer = new SignalNormalizer({
      enableC2PAValidation: true,
      hashPepper: 'test-pepper',
      embeddingDimension: 768,
    });
  });

  describe('normalizeNarrative', () => {
    it('should normalize a text narrative into a campaign signal', async () => {
      const input = {
        text: 'This is a test narrative about election misinformation',
        platform: 'twitter',
      };

      const signal = await normalizer.normalizeNarrative(input);

      expect(signal).toBeDefined();
      expect(signal.id).toBeDefined();
      expect(signal.signalType).toBe(SignalType.NARRATIVE);
      expect(signal.privacyLevel).toBe(PrivacyLevel.HASHED);
      expect(signal.content.text).toBe(input.text);
      expect(signal.content.textHash).toBeDefined();
      expect(signal.channelMetadata.platform).toBe('twitter');
      expect(signal.embedding).toBeDefined();
      expect(signal.embedding?.length).toBe(768);
    });

    it('should extract entities from narrative', async () => {
      const input = {
        text: 'President Biden and Donald Trump discussed policy in Washington',
        platform: 'facebook',
      };

      const signal = await normalizer.normalizeNarrative(input);

      expect(signal.coordinationFeatures).toBeDefined();
      // Entity extraction should find named entities
      expect(signal.coordinationFeatures.length).toBeGreaterThan(0);
    });

    it('should generate consistent hashes for same content', async () => {
      const input1 = { text: 'Same content here', platform: 'twitter' };
      const input2 = { text: 'Same content here', platform: 'twitter' };

      const signal1 = await normalizer.normalizeNarrative(input1);
      const signal2 = await normalizer.normalizeNarrative(input2);

      expect(signal1.content.textHash).toBe(signal2.content.textHash);
    });

    it('should generate different hashes for different content', async () => {
      const input1 = { text: 'Content A', platform: 'twitter' };
      const input2 = { text: 'Content B', platform: 'twitter' };

      const signal1 = await normalizer.normalizeNarrative(input1);
      const signal2 = await normalizer.normalizeNarrative(input2);

      expect(signal1.content.textHash).not.toBe(signal2.content.textHash);
    });

    it('should handle empty text gracefully', async () => {
      const input = { text: '', platform: 'twitter' };

      const signal = await normalizer.normalizeNarrative(input);

      expect(signal).toBeDefined();
      expect(signal.content.text).toBe('');
    });
  });

  describe('normalizeURL', () => {
    it('should normalize a URL signal', async () => {
      const input = {
        url: 'https://example.com/fake-news-article',
      };

      const signal = await normalizer.normalizeURL(input);

      expect(signal).toBeDefined();
      expect(signal.signalType).toBe(SignalType.URL);
      expect(signal.content.url).toBe(input.url);
      expect(signal.content.urlHash).toBeDefined();
      expect(signal.content.domain).toBe('example.com');
    });

    it('should extract domain from URL', async () => {
      const input = { url: 'https://sub.domain.example.org/path/to/page' };

      const signal = await normalizer.normalizeURL(input);

      expect(signal.content.domain).toBe('sub.domain.example.org');
    });

    it('should handle malformed URLs gracefully', async () => {
      const input = { url: 'not-a-valid-url' };

      const signal = await normalizer.normalizeURL(input);

      expect(signal).toBeDefined();
      expect(signal.content.url).toBe(input.url);
    });
  });

  describe('normalizeAccount', () => {
    it('should normalize an account handle signal', async () => {
      const input = {
        platform: 'twitter',
        handle: '@suspicious_account',
      };

      const signal = await normalizer.normalizeAccount(input);

      expect(signal).toBeDefined();
      expect(signal.signalType).toBe(SignalType.ACCOUNT_HANDLE);
      expect(signal.content.accountHandle).toBe('@suspicious_account');
      expect(signal.content.accountHash).toBeDefined();
      expect(signal.channelMetadata.platform).toBe('twitter');
    });

    it('should normalize handle format', async () => {
      const input = {
        platform: 'twitter',
        handle: 'user_without_at',
      };

      const signal = await normalizer.normalizeAccount(input);

      // Should work regardless of @ prefix
      expect(signal.content.accountHash).toBeDefined();
    });
  });

  describe('normalizeMedia', () => {
    it('should normalize media with hash', async () => {
      const input = {
        mediaHash: 'abc123def456',
        mediaType: 'image/jpeg' as const,
        platform: 'instagram',
      };

      const signal = await normalizer.normalizeMedia(input);

      expect(signal).toBeDefined();
      expect(signal.signalType).toBe(SignalType.MEDIA_HASH);
      expect(signal.content.mediaHash).toBe('abc123def456');
    });

    it('should handle C2PA manifest if provided', async () => {
      const input = {
        mediaHash: 'abc123def456',
        mediaType: 'image/jpeg' as const,
        platform: 'twitter',
        c2paManifest: {
          claim: { title: 'Test Image' },
          assertions: [],
          signature: { algorithm: 'ES256', issuer: 'test-issuer' },
        },
      };

      const signal = await normalizer.normalizeMedia(input);

      expect(signal.c2paValidation).toBeDefined();
    });
  });

  describe('normalizeCoordination', () => {
    it('should normalize coordination pattern signal', async () => {
      const input = {
        patternType: 'synchronized_posting',
        accounts: ['account1', 'account2', 'account3'],
        platform: 'twitter',
        timeWindow: { start: new Date(), end: new Date() },
      };

      const signal = await normalizer.normalizeCoordination(input);

      expect(signal).toBeDefined();
      expect(signal.signalType).toBe(SignalType.COORDINATION_PATTERN);
      expect(signal.coordinationFeatures.length).toBeGreaterThan(0);
    });
  });

  describe('privacy levels', () => {
    it('should respect privacy level settings', async () => {
      const highPrivacyNormalizer = new SignalNormalizer({
        enableC2PAValidation: false,
        hashPepper: 'test-pepper',
        embeddingDimension: 768,
        defaultPrivacyLevel: PrivacyLevel.AGGREGATE_ONLY,
      });

      const signal = await highPrivacyNormalizer.normalizeNarrative({
        text: 'Sensitive content',
        platform: 'internal',
      });

      expect(signal.privacyLevel).toBe(PrivacyLevel.AGGREGATE_ONLY);
    });
  });

  describe('embedding generation', () => {
    it('should generate normalized embeddings', async () => {
      const signal = await normalizer.normalizeNarrative({
        text: 'Test content for embedding',
        platform: 'twitter',
      });

      expect(signal.embedding).toBeDefined();
      expect(signal.embedding!.length).toBe(768);

      // Embeddings should be normalized (unit length)
      const magnitude = Math.sqrt(
        signal.embedding!.reduce((sum, val) => sum + val * val, 0),
      );
      expect(magnitude).toBeCloseTo(1.0, 1);
    });
  });
});
