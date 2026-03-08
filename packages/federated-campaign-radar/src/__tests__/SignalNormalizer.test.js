"use strict";
/**
 * Tests for SignalNormalizer
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const SignalNormalizer_1 = require("../core/SignalNormalizer");
const types_1 = require("../core/types");
(0, vitest_1.describe)('SignalNormalizer', () => {
    let normalizer;
    (0, vitest_1.beforeEach)(() => {
        normalizer = new SignalNormalizer_1.SignalNormalizer({
            enableC2PAValidation: true,
            hashPepper: 'test-pepper',
            embeddingDimension: 768,
        });
    });
    (0, vitest_1.describe)('normalizeNarrative', () => {
        (0, vitest_1.it)('should normalize a text narrative into a campaign signal', async () => {
            const input = {
                text: 'This is a test narrative about election misinformation',
                platform: 'twitter',
            };
            const signal = await normalizer.normalizeNarrative(input);
            (0, vitest_1.expect)(signal).toBeDefined();
            (0, vitest_1.expect)(signal.id).toBeDefined();
            (0, vitest_1.expect)(signal.signalType).toBe(types_1.SignalType.NARRATIVE);
            (0, vitest_1.expect)(signal.privacyLevel).toBe(types_1.PrivacyLevel.HASHED);
            (0, vitest_1.expect)(signal.content.text).toBe(input.text);
            (0, vitest_1.expect)(signal.content.textHash).toBeDefined();
            (0, vitest_1.expect)(signal.channelMetadata.platform).toBe('twitter');
            (0, vitest_1.expect)(signal.embedding).toBeDefined();
            (0, vitest_1.expect)(signal.embedding?.length).toBe(768);
        });
        (0, vitest_1.it)('should extract entities from narrative', async () => {
            const input = {
                text: 'President Biden and Donald Trump discussed policy in Washington',
                platform: 'facebook',
            };
            const signal = await normalizer.normalizeNarrative(input);
            (0, vitest_1.expect)(signal.coordinationFeatures).toBeDefined();
            // Entity extraction should find named entities
            (0, vitest_1.expect)(signal.coordinationFeatures.length).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should generate consistent hashes for same content', async () => {
            const input1 = { text: 'Same content here', platform: 'twitter' };
            const input2 = { text: 'Same content here', platform: 'twitter' };
            const signal1 = await normalizer.normalizeNarrative(input1);
            const signal2 = await normalizer.normalizeNarrative(input2);
            (0, vitest_1.expect)(signal1.content.textHash).toBe(signal2.content.textHash);
        });
        (0, vitest_1.it)('should generate different hashes for different content', async () => {
            const input1 = { text: 'Content A', platform: 'twitter' };
            const input2 = { text: 'Content B', platform: 'twitter' };
            const signal1 = await normalizer.normalizeNarrative(input1);
            const signal2 = await normalizer.normalizeNarrative(input2);
            (0, vitest_1.expect)(signal1.content.textHash).not.toBe(signal2.content.textHash);
        });
        (0, vitest_1.it)('should handle empty text gracefully', async () => {
            const input = { text: '', platform: 'twitter' };
            const signal = await normalizer.normalizeNarrative(input);
            (0, vitest_1.expect)(signal).toBeDefined();
            (0, vitest_1.expect)(signal.content.text).toBe('');
        });
    });
    (0, vitest_1.describe)('normalizeURL', () => {
        (0, vitest_1.it)('should normalize a URL signal', async () => {
            const input = {
                url: 'https://example.com/fake-news-article',
            };
            const signal = await normalizer.normalizeURL(input);
            (0, vitest_1.expect)(signal).toBeDefined();
            (0, vitest_1.expect)(signal.signalType).toBe(types_1.SignalType.URL);
            (0, vitest_1.expect)(signal.content.url).toBe(input.url);
            (0, vitest_1.expect)(signal.content.urlHash).toBeDefined();
            (0, vitest_1.expect)(signal.content.domain).toBe('example.com');
        });
        (0, vitest_1.it)('should extract domain from URL', async () => {
            const input = { url: 'https://sub.domain.example.org/path/to/page' };
            const signal = await normalizer.normalizeURL(input);
            (0, vitest_1.expect)(signal.content.domain).toBe('sub.domain.example.org');
        });
        (0, vitest_1.it)('should handle malformed URLs gracefully', async () => {
            const input = { url: 'not-a-valid-url' };
            const signal = await normalizer.normalizeURL(input);
            (0, vitest_1.expect)(signal).toBeDefined();
            (0, vitest_1.expect)(signal.content.url).toBe(input.url);
        });
    });
    (0, vitest_1.describe)('normalizeAccount', () => {
        (0, vitest_1.it)('should normalize an account handle signal', async () => {
            const input = {
                platform: 'twitter',
                handle: '@suspicious_account',
            };
            const signal = await normalizer.normalizeAccount(input);
            (0, vitest_1.expect)(signal).toBeDefined();
            (0, vitest_1.expect)(signal.signalType).toBe(types_1.SignalType.ACCOUNT_HANDLE);
            (0, vitest_1.expect)(signal.content.accountHandle).toBe('@suspicious_account');
            (0, vitest_1.expect)(signal.content.accountHash).toBeDefined();
            (0, vitest_1.expect)(signal.channelMetadata.platform).toBe('twitter');
        });
        (0, vitest_1.it)('should normalize handle format', async () => {
            const input = {
                platform: 'twitter',
                handle: 'user_without_at',
            };
            const signal = await normalizer.normalizeAccount(input);
            // Should work regardless of @ prefix
            (0, vitest_1.expect)(signal.content.accountHash).toBeDefined();
        });
    });
    (0, vitest_1.describe)('normalizeMedia', () => {
        (0, vitest_1.it)('should normalize media with hash', async () => {
            const input = {
                mediaHash: 'abc123def456',
                mediaType: 'image/jpeg',
                platform: 'instagram',
            };
            const signal = await normalizer.normalizeMedia(input);
            (0, vitest_1.expect)(signal).toBeDefined();
            (0, vitest_1.expect)(signal.signalType).toBe(types_1.SignalType.MEDIA_HASH);
            (0, vitest_1.expect)(signal.content.mediaHash).toBe('abc123def456');
        });
        (0, vitest_1.it)('should handle C2PA manifest if provided', async () => {
            const input = {
                mediaHash: 'abc123def456',
                mediaType: 'image/jpeg',
                platform: 'twitter',
                c2paManifest: {
                    claim: { title: 'Test Image' },
                    assertions: [],
                    signature: { algorithm: 'ES256', issuer: 'test-issuer' },
                },
            };
            const signal = await normalizer.normalizeMedia(input);
            (0, vitest_1.expect)(signal.c2paValidation).toBeDefined();
        });
    });
    (0, vitest_1.describe)('normalizeCoordination', () => {
        (0, vitest_1.it)('should normalize coordination pattern signal', async () => {
            const input = {
                patternType: 'synchronized_posting',
                accounts: ['account1', 'account2', 'account3'],
                platform: 'twitter',
                timeWindow: { start: new Date(), end: new Date() },
            };
            const signal = await normalizer.normalizeCoordination(input);
            (0, vitest_1.expect)(signal).toBeDefined();
            (0, vitest_1.expect)(signal.signalType).toBe(types_1.SignalType.COORDINATION_PATTERN);
            (0, vitest_1.expect)(signal.coordinationFeatures.length).toBeGreaterThan(0);
        });
    });
    (0, vitest_1.describe)('privacy levels', () => {
        (0, vitest_1.it)('should respect privacy level settings', async () => {
            const highPrivacyNormalizer = new SignalNormalizer_1.SignalNormalizer({
                enableC2PAValidation: false,
                hashPepper: 'test-pepper',
                embeddingDimension: 768,
                defaultPrivacyLevel: types_1.PrivacyLevel.AGGREGATE_ONLY,
            });
            const signal = await highPrivacyNormalizer.normalizeNarrative({
                text: 'Sensitive content',
                platform: 'internal',
            });
            (0, vitest_1.expect)(signal.privacyLevel).toBe(types_1.PrivacyLevel.AGGREGATE_ONLY);
        });
    });
    (0, vitest_1.describe)('embedding generation', () => {
        (0, vitest_1.it)('should generate normalized embeddings', async () => {
            const signal = await normalizer.normalizeNarrative({
                text: 'Test content for embedding',
                platform: 'twitter',
            });
            (0, vitest_1.expect)(signal.embedding).toBeDefined();
            (0, vitest_1.expect)(signal.embedding.length).toBe(768);
            // Embeddings should be normalized (unit length)
            const magnitude = Math.sqrt(signal.embedding.reduce((sum, val) => sum + val * val, 0));
            (0, vitest_1.expect)(magnitude).toBeCloseTo(1.0, 1);
        });
    });
});
