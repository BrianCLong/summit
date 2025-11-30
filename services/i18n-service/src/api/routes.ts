import express, { type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { getTranslationService } from '../lib/translation-service.js';
import { getLanguageDetector } from '../lib/language-detector.js';
import { TranslationError, TranslationErrorCode } from '../types/index.js';

const router = express.Router();

/**
 * Validation schemas
 */
const TranslateRequestSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  targetLanguage: z.string().min(2, 'Target language is required'),
  sourceLanguage: z.string().optional(),
  policy: z
    .object({
      allowTranslation: z.boolean().optional(),
      allowedTargetLanguages: z.array(z.string()).optional(),
      forbiddenTargetLanguages: z.array(z.string()).optional(),
      allowCrossBorderTransfer: z.boolean().optional(),
      classificationTags: z.array(z.string()).optional(),
    })
    .optional(),
  metadata: z.record(z.any()).optional(),
  entityId: z.string().optional(),
  userId: z.string().optional(),
});

const BatchTranslateRequestSchema = z.object({
  texts: z.array(z.string()).min(1, 'At least one text is required'),
  targetLanguage: z.string().min(2, 'Target language is required'),
  sourceLanguage: z.string().optional(),
  policy: z
    .object({
      allowTranslation: z.boolean().optional(),
      allowedTargetLanguages: z.array(z.string()).optional(),
      forbiddenTargetLanguages: z.array(z.string()).optional(),
      allowCrossBorderTransfer: z.boolean().optional(),
      classificationTags: z.array(z.string()).optional(),
    })
    .optional(),
  metadata: z.record(z.any()).optional(),
});

const DetectLanguageRequestSchema = z.object({
  text: z.string().min(1, 'Text is required'),
});

/**
 * POST /api/translate
 * Translate text with policy enforcement
 */
router.post('/translate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = TranslateRequestSchema.parse(req.body);

    const translationService = await getTranslationService();

    const result = await translationService.translate(validatedData.text, {
      targetLanguage: validatedData.targetLanguage,
      sourceLanguage: validatedData.sourceLanguage,
      policy: validatedData.policy,
      metadata: validatedData.metadata,
      entityId: validatedData.entityId,
      userId: validatedData.userId,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/translate/batch
 * Batch translate multiple texts
 */
router.post('/translate/batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = BatchTranslateRequestSchema.parse(req.body);

    const translationService = await getTranslationService();

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
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/detect
 * Detect language from text
 */
router.post('/detect', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = DetectLanguageRequestSchema.parse(req.body);

    const detector = getLanguageDetector();
    const result = await detector.detect(validatedData.text);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/metrics
 * Get translation service metrics
 */
router.get('/metrics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const translationService = await getTranslationService();
    const metrics = translationService.getMetrics();

    // Convert Maps to objects for JSON serialization
    const metricsJSON = {
      ...metrics,
      languagePairs: Object.fromEntries(metrics.languagePairs),
      providerUsage: Object.fromEntries(metrics.providerUsage),
    };

    res.json(metricsJSON);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/metrics/prometheus
 * Get metrics in Prometheus format
 */
router.get('/metrics/prometheus', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const translationService = await getTranslationService();
    const metrics = translationService.getMetrics();

    // Simple Prometheus format
    const lines: string[] = [
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
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', async (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'i18n-service',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Error handling middleware
 */
router.use((error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('API Error:', error);

  if (error instanceof z.ZodError) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.errors,
    });
  }

  if (error instanceof TranslationError) {
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

function getStatusCodeForError(code: TranslationErrorCode): number {
  switch (code) {
    case TranslationErrorCode.INVALID_INPUT:
      return 400;
    case TranslationErrorCode.POLICY_VIOLATION:
      return 403;
    case TranslationErrorCode.LANGUAGE_NOT_SUPPORTED:
      return 400;
    case TranslationErrorCode.TEXT_TOO_LONG:
      return 413;
    case TranslationErrorCode.DETECTION_FAILED:
    case TranslationErrorCode.TRANSLATION_FAILED:
    case TranslationErrorCode.PROVIDER_ERROR:
      return 500;
    default:
      return 500;
  }
}

export default router;
