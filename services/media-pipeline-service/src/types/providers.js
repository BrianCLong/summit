"use strict";
/**
 * Provider Interface Types
 *
 * Defines pluggable provider interfaces for:
 * - Speech-to-Text (STT)
 * - Speaker Diarization
 * - Language Detection
 * - Translation
 * - Content Analysis
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderHealth = exports.ProviderConfig = exports.ProviderStatus = exports.ProviderType = void 0;
const zod_1 = require("zod");
// ============================================================================
// Base Provider Types
// ============================================================================
exports.ProviderType = zod_1.z.enum([
    'stt',
    'diarization',
    'language_detection',
    'translation',
    'sentiment',
    'entity_extraction',
    'content_moderation',
    'summarization',
]);
exports.ProviderStatus = zod_1.z.enum([
    'available',
    'unavailable',
    'degraded',
    'rate_limited',
]);
exports.ProviderConfig = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    type: exports.ProviderType,
    version: zod_1.z.string(),
    enabled: zod_1.z.boolean().default(true),
    priority: zod_1.z.number().int().min(0).max(100).default(50),
    supportedFormats: zod_1.z.array(zod_1.z.string()).optional(),
    supportedLanguages: zod_1.z.array(zod_1.z.string()).optional(),
    maxFileSizeBytes: zod_1.z.number().int().optional(),
    maxDurationMs: zod_1.z.number().int().optional(),
    rateLimitPerMinute: zod_1.z.number().int().optional(),
    costPerMinute: zod_1.z.number().optional(),
    endpoint: zod_1.z.string().url().optional(),
    apiKeyEnvVar: zod_1.z.string().optional(),
    options: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.ProviderHealth = zod_1.z.object({
    providerId: zod_1.z.string(),
    status: exports.ProviderStatus,
    latencyMs: zod_1.z.number().optional(),
    lastChecked: zod_1.z.string().datetime(),
    errorMessage: zod_1.z.string().optional(),
    remainingQuota: zod_1.z.number().optional(),
});
