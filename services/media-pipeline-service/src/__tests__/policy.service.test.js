"use strict";
/**
 * Policy Service Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const policy_service_js_1 = require("../services/policy.service.js");
const hash_js_1 = require("../utils/hash.js");
const time_js_1 = require("../utils/time.js");
(0, globals_1.describe)('PolicyService', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        service = new policy_service_js_1.PolicyService();
    });
    const createMockMediaAsset = (overrides = {}) => ({
        id: (0, hash_js_1.generateId)(),
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
            ingestedAt: (0, time_js_1.now)(),
            ingestedBy: 'test',
            transformChain: [],
            originalChecksum: 'abc123',
        },
        retryCount: 0,
        createdAt: (0, time_js_1.now)(),
        ...overrides,
    });
    const createMockTranscript = (utterances) => ({
        id: (0, hash_js_1.generateId)(),
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
            ingestedAt: (0, time_js_1.now)(),
            ingestedBy: 'test',
            transformChain: [],
            originalChecksum: 'abc123',
        },
        createdAt: (0, time_js_1.now)(),
    });
    (0, globals_1.describe)('redactText', () => {
        (0, globals_1.it)('should redact phone numbers', () => {
            const result = service.redactText('Call me at 555-123-4567 or 555.987.6543');
            (0, globals_1.expect)(result.redactedText).not.toContain('555-123-4567');
            (0, globals_1.expect)(result.redactedText).not.toContain('555.987.6543');
            (0, globals_1.expect)(result.redactedText).toContain('[PHONE REDACTED]');
            (0, globals_1.expect)(result.redactionsApplied).toBe(2);
            (0, globals_1.expect)(result.fieldTypes).toContain('phone');
        });
        (0, globals_1.it)('should redact email addresses', () => {
            const result = service.redactText('Email me at john.doe@example.com for details');
            (0, globals_1.expect)(result.redactedText).not.toContain('john.doe@example.com');
            (0, globals_1.expect)(result.redactedText).toContain('[EMAIL REDACTED]');
            (0, globals_1.expect)(result.redactionsApplied).toBe(1);
            (0, globals_1.expect)(result.fieldTypes).toContain('email');
        });
        (0, globals_1.it)('should redact SSN numbers', () => {
            const result = service.redactText('My SSN is 123-45-6789');
            (0, globals_1.expect)(result.redactedText).not.toContain('123-45-6789');
            (0, globals_1.expect)(result.redactedText).toContain('[SSN REDACTED]');
            (0, globals_1.expect)(result.fieldTypes).toContain('ssn');
        });
        (0, globals_1.it)('should redact credit card numbers', () => {
            const result = service.redactText('Card number is 4111-1111-1111-1111');
            (0, globals_1.expect)(result.redactedText).not.toContain('4111-1111-1111-1111');
            (0, globals_1.expect)(result.redactedText).toContain('[CARD REDACTED]');
            (0, globals_1.expect)(result.fieldTypes).toContain('credit_card');
        });
        (0, globals_1.it)('should redact IP addresses', () => {
            const result = service.redactText('Server IP is 192.168.1.100');
            (0, globals_1.expect)(result.redactedText).not.toContain('192.168.1.100');
            (0, globals_1.expect)(result.redactedText).toContain('[IP REDACTED]');
            (0, globals_1.expect)(result.fieldTypes).toContain('ip');
        });
        (0, globals_1.it)('should handle text with no sensitive data', () => {
            const result = service.redactText('Hello, this is a normal message.');
            (0, globals_1.expect)(result.redactedText).toBe('Hello, this is a normal message.');
            (0, globals_1.expect)(result.redactionsApplied).toBe(0);
            (0, globals_1.expect)(result.rulesApplied.length).toBe(0);
        });
        (0, globals_1.it)('should apply multiple redaction rules', () => {
            const result = service.redactText('Call 555-123-4567 or email test@example.com. SSN: 123-45-6789');
            (0, globals_1.expect)(result.redactedText).toContain('[PHONE REDACTED]');
            (0, globals_1.expect)(result.redactedText).toContain('[EMAIL REDACTED]');
            (0, globals_1.expect)(result.redactedText).toContain('[SSN REDACTED]');
            (0, globals_1.expect)(result.redactionsApplied).toBe(3);
        });
        (0, globals_1.it)('should apply specific rules when ruleIds provided', () => {
            const result = service.redactText('Call 555-123-4567 or email test@example.com', [
                'phone-us',
            ]);
            (0, globals_1.expect)(result.redactedText).toContain('[PHONE REDACTED]');
            (0, globals_1.expect)(result.redactedText).toContain('test@example.com'); // Email not redacted
            (0, globals_1.expect)(result.rulesApplied).toContain('phone-us');
            (0, globals_1.expect)(result.rulesApplied).not.toContain('email');
        });
    });
    (0, globals_1.describe)('redactTranscript', () => {
        (0, globals_1.it)('should redact all utterances in a transcript', () => {
            const utterances = [
                {
                    id: 'u1',
                    transcriptId: 'test',
                    sequenceNumber: 0,
                    content: 'My phone is 555-123-4567',
                    startTime: 0,
                    endTime: 2000,
                    createdAt: (0, time_js_1.now)(),
                },
                {
                    id: 'u2',
                    transcriptId: 'test',
                    sequenceNumber: 1,
                    content: 'Email me at user@test.com',
                    startTime: 2000,
                    endTime: 4000,
                    createdAt: (0, time_js_1.now)(),
                },
            ];
            const transcript = createMockTranscript(utterances);
            const { redactedTranscript, event } = service.redactTranscript(transcript);
            (0, globals_1.expect)(redactedTranscript.utterances[0].content).toContain('[PHONE REDACTED]');
            (0, globals_1.expect)(redactedTranscript.utterances[1].content).toContain('[EMAIL REDACTED]');
            (0, globals_1.expect)(event.redactionsCount).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should redact raw content', () => {
            const utterances = [
                {
                    id: 'u1',
                    transcriptId: 'test',
                    sequenceNumber: 0,
                    content: 'Call 555-123-4567',
                    startTime: 0,
                    endTime: 2000,
                    createdAt: (0, time_js_1.now)(),
                },
            ];
            const transcript = createMockTranscript(utterances);
            const { redactedTranscript } = service.redactTranscript(transcript);
            (0, globals_1.expect)(redactedTranscript.rawContentRedacted).toBeDefined();
            (0, globals_1.expect)(redactedTranscript.rawContentRedacted).toContain('[PHONE REDACTED]');
        });
        (0, globals_1.it)('should set contentRedacted on utterances', () => {
            const utterances = [
                {
                    id: 'u1',
                    transcriptId: 'test',
                    sequenceNumber: 0,
                    content: 'My SSN is 123-45-6789',
                    startTime: 0,
                    endTime: 2000,
                    createdAt: (0, time_js_1.now)(),
                },
            ];
            const transcript = createMockTranscript(utterances);
            const { redactedTranscript } = service.redactTranscript(transcript);
            (0, globals_1.expect)(redactedTranscript.utterances[0].contentRedacted).toBeDefined();
            (0, globals_1.expect)(redactedTranscript.utterances[0].contentRedacted).toContain('[SSN REDACTED]');
        });
    });
    (0, globals_1.describe)('addRedactionRule', () => {
        (0, globals_1.it)('should add custom redaction rule', () => {
            service.addRedactionRule({
                id: 'custom-rule',
                name: 'Custom Rule',
                pattern: 'SECRET\\d+',
                replacement: '[CUSTOM REDACTED]',
                enabled: true,
                priority: 100,
            });
            const result = service.redactText('The code is SECRET123');
            (0, globals_1.expect)(result.redactedText).toContain('[CUSTOM REDACTED]');
        });
    });
    (0, globals_1.describe)('removeRedactionRule', () => {
        (0, globals_1.it)('should remove custom redaction rule', () => {
            service.addRedactionRule({
                id: 'temp-rule',
                name: 'Temp Rule',
                pattern: 'TEMP',
                replacement: '[REMOVED]',
                enabled: true,
                priority: 100,
            });
            const removed = service.removeRedactionRule('temp-rule');
            (0, globals_1.expect)(removed).toBe(true);
            const result = service.redactText('This is TEMP data');
            (0, globals_1.expect)(result.redactedText).toBe('This is TEMP data');
        });
    });
    (0, globals_1.describe)('applyRetentionPolicy', () => {
        (0, globals_1.it)('should apply default retention policy', () => {
            const asset = createMockMediaAsset();
            const result = service.applyRetentionPolicy(asset);
            (0, globals_1.expect)(result.action).toBe('retain');
            (0, globals_1.expect)(result.expiresAt).toBeDefined();
        });
        (0, globals_1.it)('should respect legal hold policy', () => {
            const asset = createMockMediaAsset({
                policy: { retentionPolicy: 'legal-hold' },
            });
            const result = service.applyRetentionPolicy(asset);
            (0, globals_1.expect)(result.action).toBe('retain');
        });
        (0, globals_1.it)('should apply short-term retention', () => {
            const asset = createMockMediaAsset({
                policy: { retentionPolicy: 'short-term' },
            });
            const result = service.applyRetentionPolicy(asset);
            (0, globals_1.expect)(result.expiresAt).toBeDefined();
            // Verify expiration is approximately 30 days from now
            const expirationDate = new Date(result.expiresAt);
            const expectedDate = new Date();
            expectedDate.setDate(expectedDate.getDate() + 30);
            const diffDays = Math.abs((expirationDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24));
            (0, globals_1.expect)(diffDays).toBeLessThan(1);
        });
    });
    (0, globals_1.describe)('getActiveRules', () => {
        (0, globals_1.it)('should return only enabled rules', () => {
            const rules = service.getActiveRules();
            (0, globals_1.expect)(rules.every((r) => r.enabled)).toBe(true);
        });
        (0, globals_1.it)('should sort rules by priority', () => {
            const rules = service.getActiveRules();
            for (let i = 1; i < rules.length; i++) {
                (0, globals_1.expect)(rules[i - 1].priority).toBeGreaterThanOrEqual(rules[i].priority);
            }
        });
    });
});
