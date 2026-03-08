"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const translation_service_js_1 = require("../lib/translation-service.js");
const language_detector_js_1 = require("../lib/language-detector.js");
const index_js_1 = require("../types/index.js");
const router = express_1.default.Router();
/**
 * Validation schemas
 */
const TranslateRequestSchema = zod_1.z.object({
    text: zod_1.z.string().min(1, 'Text is required'),
    targetLanguage: zod_1.z.string().min(2, 'Target language is required'),
    sourceLanguage: zod_1.z.string().optional(),
    policy: zod_1.z
        .object({
        allowTranslation: zod_1.z.boolean().optional(),
        allowedTargetLanguages: zod_1.z.array(zod_1.z.string()).optional(),
        forbiddenTargetLanguages: zod_1.z.array(zod_1.z.string()).optional(),
        allowCrossBorderTransfer: zod_1.z.boolean().optional(),
        classificationTags: zod_1.z.array(zod_1.z.string()).optional(),
    })
        .optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
    entityId: zod_1.z.string().optional(),
    userId: zod_1.z.string().optional(),
});
const BatchTranslateRequestSchema = zod_1.z.object({
    texts: zod_1.z.array(zod_1.z.string()).min(1, 'At least one text is required'),
    targetLanguage: zod_1.z.string().min(2, 'Target language is required'),
    sourceLanguage: zod_1.z.string().optional(),
    policy: zod_1.z
        .object({
        allowTranslation: zod_1.z.boolean().optional(),
        allowedTargetLanguages: zod_1.z.array(zod_1.z.string()).optional(),
        forbiddenTargetLanguages: zod_1.z.array(zod_1.z.string()).optional(),
        allowCrossBorderTransfer: zod_1.z.boolean().optional(),
        classificationTags: zod_1.z.array(zod_1.z.string()).optional(),
    })
        .optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
const DetectLanguageRequestSchema = zod_1.z.object({
    text: zod_1.z.string().min(1, 'Text is required'),
});
/**
 * POST /api/translate
 * Translate text with policy enforcement
 */
router.post('/translate', async (req, res, next) => {
    try {
        const validatedData = TranslateRequestSchema.parse(req.body);
        const translationService = await (0, translation_service_js_1.getTranslationService)();
        const result = await translationService.translate(validatedData.text, {
            targetLanguage: validatedData.targetLanguage,
            sourceLanguage: validatedData.sourceLanguage,
            policy: validatedData.policy,
            metadata: validatedData.metadata,
            entityId: validatedData.entityId,
            userId: validatedData.userId,
        });
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/translate/batch
 * Batch translate multiple texts
 */
router.post('/translate/batch', async (req, res, next) => {
    try {
        const validatedData = BatchTranslateRequestSchema.parse(req.body);
        const translationService = await (0, translation_service_js_1.getTranslationService)();
        const result = await translationService.translateBatch({
            texts: validatedData.texts,
            context: {
                targetLanguage: validatedData.targetLanguage,
                sourceLanguage: validatedData.sourceLanguage,
                policy: validatedData.policy,
                metadata: validatedData.metadata,
            },
        });
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/detect
 * Detect language from text
 */
router.post('/detect', async (req, res, next) => {
    try {
        const validatedData = DetectLanguageRequestSchema.parse(req.body);
        const detector = (0, language_detector_js_1.getLanguageDetector)();
        const result = await detector.detect(validatedData.text);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/metrics
 * Get translation service metrics
 */
router.get('/metrics', async (req, res, next) => {
    try {
        const translationService = await (0, translation_service_js_1.getTranslationService)();
        const metrics = translationService.getMetrics();
        // Convert Maps to objects for JSON serialization
        const metricsJSON = {
            ...metrics,
            languagePairs: Object.fromEntries(metrics.languagePairs),
            providerUsage: Object.fromEntries(metrics.providerUsage),
        };
        res.json(metricsJSON);
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/metrics/prometheus
 * Get metrics in Prometheus format
 */
router.get('/metrics/prometheus', async (req, res, next) => {
    try {
        const translationService = await (0, translation_service_js_1.getTranslationService)();
        const metrics = translationService.getMetrics();
        // Simple Prometheus format
        const lines = [
            '# HELP translation_requests_total Total translation requests',
            '# TYPE translation_requests_total counter',
            `translation_requests_total ${metrics.totalRequests}`,
            '',
            '# HELP translation_success_total Successful translations',
            '# TYPE translation_success_total counter',
            `translation_success_total ${metrics.successfulTranslations}`,
            '',
            '# HELP translation_failures_total Failed translations',
            '# TYPE translation_failures_total counter',
            `translation_failures_total ${metrics.failedTranslations}`,
            '',
            '# HELP translation_policy_violations_total Policy violations',
            '# TYPE translation_policy_violations_total counter',
            `translation_policy_violations_total ${metrics.policyViolations}`,
        ];
        res.type('text/plain').send(lines.join('\n'));
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
    res.json({
        status: 'healthy',
        service: 'i18n-service',
        timestamp: new Date().toISOString(),
    });
});
/**
 * Error handling middleware
 */
router.use((error, req, res, next) => {
    console.error('API Error:', error);
    if (error instanceof zod_1.z.ZodError) {
        return res.status(400).json({
            error: 'Validation error',
            details: error.errors,
        });
    }
    if (error instanceof index_js_1.TranslationError) {
        const statusCode = getStatusCodeForError(error.code);
        return res.status(statusCode).json({
            error: error.message,
            code: error.code,
            details: error.details,
        });
    }
    res.status(500).json({
        error: 'Internal server error',
        message: error.message,
    });
});
function getStatusCodeForError(code) {
    switch (code) {
        case index_js_1.TranslationErrorCode.INVALID_INPUT:
            return 400;
        case index_js_1.TranslationErrorCode.POLICY_VIOLATION:
            return 403;
        case index_js_1.TranslationErrorCode.LANGUAGE_NOT_SUPPORTED:
            return 400;
        case index_js_1.TranslationErrorCode.TEXT_TOO_LONG:
            return 413;
        case index_js_1.TranslationErrorCode.DETECTION_FAILED:
        case index_js_1.TranslationErrorCode.TRANSLATION_FAILED:
        case index_js_1.TranslationErrorCode.PROVIDER_ERROR:
            return 500;
        default:
            return 500;
    }
}
exports.default = router;
