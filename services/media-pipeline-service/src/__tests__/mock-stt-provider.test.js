"use strict";
/**
 * Mock STT Provider Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const mock_stt_provider_js_1 = require("../providers/stt/mock-stt-provider.js");
const hash_js_1 = require("../utils/hash.js");
const time_js_1 = require("../utils/time.js");
(0, globals_1.describe)('MockSTTProvider', () => {
    let provider;
    (0, globals_1.beforeEach)(async () => {
        provider = new mock_stt_provider_js_1.MockSTTProvider();
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
    const createMockMediaAsset = (duration = 60000) => ({
        id: (0, hash_js_1.generateId)(),
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
            ingestedAt: (0, time_js_1.now)(),
            ingestedBy: 'test',
            transformChain: [],
            originalChecksum: 'abc123',
        },
        retryCount: 0,
        createdAt: (0, time_js_1.now)(),
    });
    (0, globals_1.describe)('initialization', () => {
        (0, globals_1.it)('should initialize successfully', () => {
            (0, globals_1.expect)(provider.isInitialized()).toBe(true);
        });
        (0, globals_1.it)('should have correct properties', () => {
            (0, globals_1.expect)(provider.id).toBe('mock-stt');
            (0, globals_1.expect)(provider.name).toBe('Mock STT Provider');
            (0, globals_1.expect)(provider.supportedFormats).toContain('mp3');
            (0, globals_1.expect)(provider.supportedLanguages).toContain('en');
        });
    });
    (0, globals_1.describe)('healthCheck', () => {
        (0, globals_1.it)('should return available status', async () => {
            const health = await provider.healthCheck();
            (0, globals_1.expect)(health.status).toBe('available');
            (0, globals_1.expect)(health.providerId).toBe('mock-stt');
        });
    });
    (0, globals_1.describe)('transcribe', () => {
        (0, globals_1.it)('should return successful transcription result', async () => {
            const mediaAsset = createMockMediaAsset(30000); // 30 seconds
            const result = await provider.transcribe({ mediaAsset });
            (0, globals_1.expect)(result.success).toBe(true);
            (0, globals_1.expect)(result.segments.length).toBeGreaterThan(0);
            (0, globals_1.expect)(result.fullText.length).toBeGreaterThan(0);
            (0, globals_1.expect)(result.language).toBe('en');
            (0, globals_1.expect)(result.confidence).toBeGreaterThan(0);
            (0, globals_1.expect)(result.provider).toBe('mock-stt');
        });
        (0, globals_1.it)('should generate segments with correct timing', async () => {
            const mediaAsset = createMockMediaAsset(15000); // 15 seconds
            const result = await provider.transcribe({ mediaAsset });
            (0, globals_1.expect)(result.segments.length).toBeGreaterThan(0);
            for (const segment of result.segments) {
                (0, globals_1.expect)(segment.startTime).toBeDefined();
                (0, globals_1.expect)(segment.endTime).toBeDefined();
                (0, globals_1.expect)(segment.endTime).toBeGreaterThan(segment.startTime);
                (0, globals_1.expect)(segment.confidence).toBeGreaterThan(0);
            }
        });
        (0, globals_1.it)('should respect language parameter', async () => {
            const mediaAsset = createMockMediaAsset();
            const result = await provider.transcribe({
                mediaAsset,
                language: 'es',
            });
            (0, globals_1.expect)(result.language).toBe('es');
        });
        (0, globals_1.it)('should generate word timings when enabled', async () => {
            const mediaAsset = createMockMediaAsset(10000);
            const result = await provider.transcribe({
                mediaAsset,
                enableWordTimings: true,
            });
            (0, globals_1.expect)(result.success).toBe(true);
            const segmentsWithWords = result.segments.filter((s) => s.words && s.words.length > 0);
            (0, globals_1.expect)(segmentsWithWords.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should include speaker labels', async () => {
            const mediaAsset = createMockMediaAsset(20000);
            const result = await provider.transcribe({ mediaAsset });
            const segmentsWithSpeakers = result.segments.filter((s) => s.speakerLabel);
            (0, globals_1.expect)(segmentsWithSpeakers.length).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('getSupportedLanguages', () => {
        (0, globals_1.it)('should return supported languages', () => {
            const languages = provider.getSupportedLanguages();
            (0, globals_1.expect)(languages).toContain('en');
            (0, globals_1.expect)(languages).toContain('es');
            (0, globals_1.expect)(languages).toContain('fr');
        });
    });
    (0, globals_1.describe)('estimateCost', () => {
        (0, globals_1.it)('should estimate cost based on duration', () => {
            const cost = provider.estimateCost(60000); // 1 minute
            (0, globals_1.expect)(cost).toBeCloseTo(0.006, 4);
        });
        (0, globals_1.it)('should scale cost with duration', () => {
            const cost1 = provider.estimateCost(60000);
            const cost2 = provider.estimateCost(120000);
            (0, globals_1.expect)(cost2).toBeCloseTo(cost1 * 2, 4);
        });
    });
});
