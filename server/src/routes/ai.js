"use strict";
/**
 * AI API Endpoints for IntelGraph
 * Provides endpoints for link prediction, sentiment analysis, and AI-powered insights
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const pino_1 = __importDefault(require("pino"));
const EntityLinkingService_js_1 = __importDefault(require("../services/EntityLinkingService.js"));
const bullmq_1 = require("bullmq");
const auth_js_1 = require("../middleware/auth.js");
const ExtractionEngine_js_1 = require("../ai/ExtractionEngine.js"); // WAR-GAMED SIMULATION - Import ExtractionEngine
const redis_js_1 = require("../db/redis.js"); // WAR-GAMED SIMULATION - For BullMQ
const pg_1 = require("pg"); // WAR-GAMED SIMULATION - For ExtractionEngine constructor (assuming PG is used)
const crypto_1 = require("crypto"); // Use Node's built-in UUID for job IDs
const AdversaryAgentService_js_1 = __importDefault(require("../ai/services/AdversaryAgentService.js"));
const MediaUploadService_js_1 = require("../services/MediaUploadService.js"); // Import MediaType from MediaUploadService
const rateLimit_js_1 = require("../middleware/rateLimit.js");
const config_js_1 = require("../config.js");
const RateLimiter_js_1 = require("../services/RateLimiter.js");
const residency_guard_js_1 = require("../data-residency/residency-guard.js");
const logger = pino_1.default();
const router = express_1.default.Router();
// WAR-GAMED SIMULATION - BullMQ setup for video analysis jobs
// WAR-GAMED SIMULATION - BullMQ setup for video analysis jobs
const redisClient = (0, redis_js_1.getRedisClient)(); // Use existing Redis client for BullMQ
if (!redisClient) {
    throw new Error('Redis connection is required for AI queue rate limiting');
}
// Create a new connection with maxRetriesPerRequest: null as required by BullMQ
// If it's a mock client (no duplicate method), we fallback to the client itself and hope for the best (or it will fail later)
const connection = redisClient.duplicate
    ? redisClient.duplicate({ maxRetriesPerRequest: null })
    : redisClient;
const videoAnalysisQueue = new bullmq_1.Queue('videoAnalysisQueue', {
    connection,
    limiter: {
        max: config_js_1.cfg.BACKGROUND_RATE_LIMIT_MAX_REQUESTS,
        duration: config_js_1.cfg.BACKGROUND_RATE_LIMIT_WINDOW_MS,
    },
});
const buildBackgroundKey = (req, scope) => {
    const user = req.user;
    if (user)
        return `user:${user.id || user.sub}:${scope}`;
    return `ip:${req.ip}:${scope}`;
};
const enforceBackgroundThrottle = async (req, scope) => {
    const key = buildBackgroundKey(req, scope);
    const result = await RateLimiter_js_1.rateLimiter.consume(key, 1, config_js_1.cfg.BACKGROUND_RATE_LIMIT_MAX_REQUESTS, config_js_1.cfg.BACKGROUND_RATE_LIMIT_WINDOW_MS);
    if (!result.allowed) {
        const retryAfterSeconds = Math.max(Math.ceil((result.reset - Date.now()) / 1000), 0);
        const error = new Error('Background rate limit exceeded');
        error.status = 429;
        error.retryAfter = retryAfterSeconds;
        throw error;
    }
};
// Feedback Queue for AI insights
const feedbackQueue = new bullmq_1.Queue('aiFeedbackQueue', {
    connection,
    limiter: {
        max: config_js_1.cfg.BACKGROUND_RATE_LIMIT_MAX_REQUESTS,
        duration: config_js_1.cfg.BACKGROUND_RATE_LIMIT_WINDOW_MS,
    },
});
// WAR-GAMED SIMULATION - Initialize ExtractionEngine (assuming a dummy PG Pool for now)
// In a real app, the PG Pool would be passed from the main app initialization
const dummyPgPool = new pg_1.Pool(); // WAR-GAMED SIMULATION - Placeholder
const extractionEngineConfig = {
    pythonPath: process.env.PYTHON_PATH || 'python', // Ensure this is configured
    modelsPath: process.env.MODELS_PATH || './models', // Ensure this is configured
    tempPath: process.env.TEMP_PATH || './temp', // Ensure this is configured
    maxConcurrentJobs: 5,
    enableGPU: process.env.ENABLE_GPU === 'true',
    allowedPaths: [
        process.env.MEDIA_UPLOAD_PATH || '/tmp/intelgraph/uploads',
        process.env.TEMP_PATH || './temp'
    ],
};
const extractionEngine = new ExtractionEngine_js_1.ExtractionEngine(extractionEngineConfig, dummyPgPool);
// WAR-GAMED SIMULATION - Worker to process video analysis jobs
const videoAnalysisWorker = new bullmq_1.Worker('videoAnalysisQueue', async (job) => {
    const { jobId, mediaPath, mediaType, extractionMethods, options } = job.data;
    logger.info(`Processing video analysis job: ${jobId}`);
    try {
        // Perform the actual video analysis using the ExtractionEngine
        const results = await extractionEngine.processExtraction({
            jobId,
            mediaPath,
            mediaType,
            extractionMethods,
            options,
            mediaSourceId: options.mediaSourceId || 'unknown', // Ensure mediaSourceId is passed
        });
        logger.info(`Video analysis job ${jobId} completed successfully.`);
        return { status: 'completed', results };
    }
    catch (error) {
        logger.error(`Video analysis job ${jobId} failed: ${error.message}`, error);
        throw new Error(`Video analysis failed: ${error.message}`);
    }
}, { connection });
// WAR-GAMED SIMULATION - Handle worker events
videoAnalysisWorker.on('completed', (job) => {
    logger.info(`Job ${job.id} has completed!`);
});
videoAnalysisWorker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} has failed with error ${err.message}`);
});
// Rate limiting for AI endpoints (more restrictive due to computational cost)
const aiRateLimit = (0, rateLimit_js_1.createRateLimiter)(rateLimit_js_1.EndpointClass.AI);
// Apply rate limiting to all AI routes
router.use(aiRateLimit);
// Apply permissions to all AI routes
router.use((0, auth_js_1.requirePermission)('ai:request'));
// Localized AI residency check (v2)
const localizedAIProtection = async (req, res, next) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;
        if (!tenantId)
            return next();
        const guard = residency_guard_js_1.ResidencyGuard.getInstance();
        const isAllowed = await guard.validateFeatureAccess(tenantId, 'aiFeatures');
        if (!isAllowed) {
            logger.warn(`AI feature access blocked for tenant ${tenantId} due to regional residency policy.`);
            return res.status(403).json({
                error: 'FeatureRestricted',
                message: 'AI features are not available in your region due to data residency or privacy regulations.'
            });
        }
        next();
    }
    catch (err) {
        next(err);
    }
};
router.use(localizedAIProtection);
// Validation middleware
const validatePredictLinks = [
    (0, express_validator_1.body)('entityId').isString().notEmpty().withMessage('entityId is required'),
    (0, express_validator_1.body)('topK')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('topK must be between 1 and 50'),
];
const validateSentiment = [
    (0, express_validator_1.body)('entityId')
        .optional()
        .isString()
        .withMessage('entityId must be a string'),
    (0, express_validator_1.body)('text').optional().isString().withMessage('text must be a string'),
    (0, express_validator_1.body)('entityData')
        .optional()
        .isObject()
        .withMessage('entityData must be an object'),
];
const validateAISummary = [
    (0, express_validator_1.body)('entityId').isString().notEmpty().withMessage('entityId is required'),
    (0, express_validator_1.body)('entityData')
        .optional()
        .isObject()
        .withMessage('entityData must be an object'),
    (0, express_validator_1.body)('includeContext')
        .optional()
        .isBoolean()
        .withMessage('includeContext must be boolean'),
];
// WAR-GAMED SIMULATION - Validation for video extraction endpoint
const validateExtractVideo = [
    (0, express_validator_1.body)('mediaPath').isString().notEmpty().withMessage('mediaPath is required'),
    (0, express_validator_1.body)('mediaType')
        .isIn([MediaUploadService_js_1.MediaType.VIDEO])
        .withMessage('mediaType must be VIDEO'),
    (0, express_validator_1.body)('extractionMethods')
        .isArray()
        .withMessage('extractionMethods must be an array'),
    (0, express_validator_1.body)('options')
        .isObject()
        .optional()
        .withMessage('options must be an object'),
];
// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array(),
        });
    }
    next();
};
/**
 * @openapi
 * /api/ai/predict-links:
 *   post:
 *     tags:
 *       - AI
 *     summary: Predict potential links
 *     description: Predict potential links between entities using GNN model.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - entityId
 *             properties:
 *               entityId:
 *                 type: string
 *               topK:
 *                 type: integer
 *                 default: 10
 *               investigationId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Link prediction successful
 *       400:
 *         description: Validation failed
 *       500:
 *         description: Internal server error
 */
router.post('/predict-links', validatePredictLinks, handleValidationErrors, async (req, res) => {
    try {
        const startTime = Date.now();
        const { entityId, topK = 10, investigationId } = req.body;
        logger.info(`Link prediction request for entity: ${entityId}`);
        const result = await EntityLinkingService_js_1.default.suggestLinksForEntity(entityId, {
            limit: topK,
            investigationId,
            token: req.headers.authorization?.replace('Bearer ', ''),
        });
        const responseTime = Date.now() - startTime;
        if (!result.success) {
            return res.status(500).json({
                error: 'Link prediction failed',
                message: result.error || result.message || 'Unknown error',
            });
        }
        res.json({
            success: true,
            entityId,
            jobId: result.jobId,
            taskId: result.taskId,
            candidates: result.candidates,
            metadata: {
                model: result.modelName || 'default_link_predictor',
                topK,
                executionTime: responseTime,
            },
        });
    }
    catch (error) {
        logger.error(`Error in link prediction: ${error instanceof Error ? error.message : 'Unknown error'}`);
        res.status(500).json({
            error: 'Link prediction failed',
            message: 'Internal server error during link prediction',
        });
    }
});
/**
 * @openapi
 * /api/ai/analyze-sentiment:
 *   post:
 *     tags:
 *       - AI
 *     summary: Analyze sentiment
 *     description: Analyze sentiment of text content or entity data.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               entityId:
 *                 type: string
 *               text:
 *                 type: string
 *               entityData:
 *                 type: object
 *     responses:
 *       200:
 *         description: Sentiment analysis successful
 *       400:
 *         description: Validation failed
 *       500:
 *         description: Internal server error
 */
router.post('/analyze-sentiment', validateSentiment, handleValidationErrors, async (req, res) => {
    try {
        const startTime = Date.now();
        const { entityId, text, entityData } = req.body;
        logger.info(`Sentiment analysis request${entityId ? ` for entity: ${entityId}` : ''}`);
        let sentimentResult;
        if (text) {
            // Analyze single text
            sentimentResult = generateScaffoldSentiment(text);
        }
        else if (entityData) {
            // Analyze entity content
            sentimentResult = generateScaffoldEntitySentiment(entityData);
        }
        else {
            return res.status(400).json({
                error: 'Invalid request',
                message: 'Either text or entityData must be provided',
            });
        }
        const responseTime = Date.now() - startTime;
        logger.info(`Sentiment analysis completed in ${responseTime}ms`);
        res.json({
            success: true,
            entityId,
            sentiment: sentimentResult,
            metadata: {
                model: 'scaffold-sentiment-v1',
                executionTime: responseTime,
                analyzedFields: sentimentResult.field_sentiments
                    ? Object.keys(sentimentResult.field_sentiments).length
                    : 1,
            },
        });
    }
    catch (error) {
        logger.error(`Error in sentiment analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
        res.status(500).json({
            error: 'Sentiment analysis failed',
            message: 'Internal server error during sentiment analysis',
        });
    }
});
/**
 * @openapi
 * /api/ai/generate-summary:
 *   post:
 *     tags:
 *       - AI
 *     summary: Generate summary
 *     description: Generate AI-powered insights and summary for an entity.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - entityId
 *             properties:
 *               entityId:
 *                 type: string
 *               entityData:
 *                 type: object
 *               includeContext:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Summary generation successful
 *       400:
 *         description: Validation failed
 *       500:
 *         description: Internal server error
 */
router.post('/generate-summary', validateAISummary, handleValidationErrors, async (req, res) => {
    try {
        const startTime = Date.now();
        const { entityId, entityData, includeContext = true } = req.body;
        logger.info(`AI summary generation request for entity: ${entityId}`);
        // TODO: Replace with actual LLM integration
        const summary = generateScaffoldAISummary(entityId, entityData, includeContext);
        const responseTime = Date.now() - startTime;
        logger.info(`AI summary generated in ${responseTime}ms for entity ${entityId}`);
        res.json({
            success: true,
            entityId,
            summary,
            metadata: {
                model: 'scaffold-llm-v1',
                includeContext,
                executionTime: responseTime,
                generatedAt: new Date().toISOString(),
            },
        });
    }
    catch (error) {
        logger.error(`Error in AI summary generation: ${error instanceof Error ? error.message : 'Unknown error'}`);
        res.status(500).json({
            error: 'AI summary generation failed',
            message: 'Internal server error during summary generation',
        });
    }
});
/**
 * @openapi
 * /api/ai/models/status:
 *   get:
 *     tags:
 *       - AI
 *     summary: AI models status
 *     description: Get status and health of AI models.
 *     responses:
 *       200:
 *         description: Models status
 *       500:
 *         description: Internal server error
 */
router.get('/models/status', async (req, res) => {
    try {
        // TODO: Replace with actual model health checks
        const modelStatus = {
            linkPrediction: {
                status: 'healthy',
                model: 'scaffold-gnn-v1',
                lastUpdated: new Date().toISOString(),
                version: '1.0.0-scaffold',
            },
            sentimentAnalysis: {
                status: 'healthy',
                model: 'scaffold-sentiment-v1',
                lastUpdated: new Date().toISOString(),
                version: '1.0.0-scaffold',
            },
            textGeneration: {
                status: 'healthy',
                model: 'scaffold-llm-v1',
                lastUpdated: new Date().toISOString(),
                version: '1.0.0-scaffold',
            },
        };
        res.json({
            success: true,
            models: modelStatus,
            overview: {
                totalModels: Object.keys(modelStatus).length,
                healthyModels: Object.values(modelStatus).filter((m) => m.status === 'healthy').length,
                lastChecked: new Date().toISOString(),
            },
        });
    }
    catch (error) {
        logger.error(`Error checking model status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        res.status(500).json({
            error: 'Model status check failed',
            message: 'Internal server error during model status check',
        });
    }
});
/**
 * @openapi
 * /api/ai/capabilities:
 *   get:
 *     tags:
 *       - AI
 *     summary: AI capabilities
 *     description: Get available AI capabilities and their parameters.
 *     responses:
 *       200:
 *         description: AI capabilities
 *       500:
 *         description: Internal server error
 */
router.get('/capabilities', async (req, res) => {
    try {
        const capabilities = {
            linkPrediction: {
                description: 'Predict potential relationships between entities using graph neural networks',
                parameters: {
                    topK: { type: 'integer', min: 1, max: 50, default: 10 },
                    threshold: { type: 'float', min: 0, max: 1, default: 0.5 },
                },
                supportedEntityTypes: [
                    'person',
                    'organization',
                    'event',
                    'location',
                    'document',
                ],
                maxEntities: 1000,
            },
            sentimentAnalysis: {
                description: 'Analyze sentiment of text content and entity descriptions',
                parameters: {
                    language: { type: 'string', options: ['en'], default: 'en' },
                },
                supportedFields: ['description', 'notes', 'comments', 'content'],
                maxTextLength: 512,
            },
            textGeneration: {
                description: 'Generate AI-powered insights and summaries for entities',
                parameters: {
                    includeContext: { type: 'boolean', default: true },
                    maxLength: { type: 'integer', min: 50, max: 1000, default: 200 },
                },
                supportedFormats: ['summary', 'insights', 'recommendations'],
            },
        };
        res.json({
            success: true,
            capabilities,
            version: '1.0.0-scaffold',
            lastUpdated: new Date().toISOString(),
        });
    }
    catch (error) {
        logger.error(`Error retrieving capabilities: ${error instanceof Error ? error.message : 'Unknown error'}`);
        res.status(500).json({
            error: 'Failed to retrieve capabilities',
            message: 'Internal server error',
        });
    }
});
/**
 * @openapi
 * /api/ai/extract-video:
 *   post:
 *     tags:
 *       - AI
 *     summary: Extract video content
 *     description: Submits a video for frame-by-frame AI extraction.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mediaPath
 *               - mediaType
 *               - extractionMethods
 *             properties:
 *               mediaPath:
 *                 type: string
 *               mediaType:
 *                 type: string
 *                 enum: [VIDEO]
 *               extractionMethods:
 *                 type: array
 *                 items:
 *                   type: string
 *               options:
 *                 type: object
 *     responses:
 *       202:
 *         description: Video analysis job submitted
 *       400:
 *         description: Validation failed
 *       500:
 *         description: Internal server error
 */
router.post('/extract-video', validateExtractVideo, handleValidationErrors, async (req, res) => {
    const { mediaPath, mediaType, extractionMethods, options } = req.body;
    const jobId = (0, crypto_1.randomUUID)(); // Generate a unique job ID
    try {
        await enforceBackgroundThrottle(req, 'video-analysis');
        // Add job to the queue
        await videoAnalysisQueue.add('video-analysis-job', {
            jobId,
            mediaPath,
            mediaType,
            extractionMethods,
            options,
        }, { jobId }); // Use jobId as BullMQ job ID for easy tracking
        logger.info(`Video analysis job ${jobId} submitted for ${mediaPath}`);
        res.status(202).json({
            success: true,
            jobId,
            message: 'Video analysis job submitted successfully. Use /api/ai/job-status/:jobId to track progress.',
        });
    }
    catch (error) {
        logger.error(`Error submitting video analysis job: ${error instanceof Error ? error.message : String(error)}`, error);
        if (error && typeof error === 'object' && 'status' in error && error.status === 429) {
            res.status(429).json({
                error: 'Too many video analysis requests',
                retryAfter: 'retryAfter' in error ? error.retryAfter : undefined,
            });
            return;
        }
        res.status(500).json({
            error: 'Failed to submit video analysis job',
            message: error instanceof Error ? error.message : String(error),
        });
    }
});
/**
 * @openapi
 * /api/ai/job-status/{jobId}:
 *   get:
 *     tags:
 *       - AI
 *     summary: Job status
 *     description: Get the status of an AI extraction job.
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job status
 *       404:
 *         description: Job not found
 *       500:
 *         description: Internal server error
 */
router.get('/job-status/:jobId', async (req, res) => {
    const { jobId } = req.params;
    try {
        const job = await videoAnalysisQueue.getJob(jobId);
        if (!job) {
            return res.status(404).json({
                error: 'Job not found',
                message: `Job with ID ${jobId} does not exist.`,
            });
        }
        const state = await job.getState();
        const result = job.returnvalue;
        const failedReason = job.failedReason;
        res.json({
            success: true,
            jobId,
            status: state,
            progress: job.progress,
            result: state === 'completed' ? result : undefined,
            error: state === 'failed' ? failedReason : undefined,
            createdAt: new Date(job.timestamp).toISOString(),
            processedAt: job.finishedOn
                ? new Date(job.finishedOn).toISOString()
                : undefined,
        });
    }
    catch (error) {
        logger.error(`Error getting job status for ${jobId}: ${error instanceof Error ? error.message : String(error)}`, error);
        res.status(500).json({
            error: 'Failed to retrieve job status',
            message: 'Internal server error',
        });
    }
});
// Validation for feedback endpoint
const validateFeedback = [
    (0, express_validator_1.body)('insight')
        .isObject()
        .notEmpty()
        .withMessage('insight object is required'),
    (0, express_validator_1.body)('feedbackType')
        .isIn(['accept', 'reject', 'flag'])
        .withMessage("feedbackType must be 'accept', 'reject', or 'flag'"),
    (0, express_validator_1.body)('user').isString().notEmpty().withMessage('user is required'),
    (0, express_validator_1.body)('timestamp')
        .isISO8601()
        .withMessage('timestamp must be a valid ISO 8601 date string'),
    (0, express_validator_1.body)('originalPrediction')
        .isObject()
        .notEmpty()
        .withMessage('originalPrediction object is required'),
];
const validateDeceptionFeedback = [
    (0, express_validator_1.body)('text').isString().notEmpty().withMessage('text is required'),
    (0, express_validator_1.body)('label')
        .isIn(['false_positive', 'false_negative'])
        .withMessage("label must be 'false_positive' or 'false_negative'"),
    (0, express_validator_1.body)('user').isString().notEmpty().withMessage('user is required'),
    (0, express_validator_1.body)('timestamp')
        .isISO8601()
        .withMessage('timestamp must be a valid ISO 8601 date string'),
    (0, express_validator_1.body)('deceptionScore')
        .optional()
        .isFloat({ min: 0, max: 1 })
        .withMessage('deceptionScore must be between 0 and 1'),
];
/**
 * @openapi
 * /api/ai/feedback:
 *   post:
 *     tags:
 *       - AI
 *     summary: Submit feedback
 *     description: Logs user feedback on AI-generated insights for training signals.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - insight
 *               - feedbackType
 *               - user
 *               - timestamp
 *               - originalPrediction
 *             properties:
 *               insight:
 *                 type: object
 *               feedbackType:
 *                 type: string
 *                 enum: [accept, reject, flag]
 *               user:
 *                 type: string
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *               originalPrediction:
 *                 type: object
 *     responses:
 *       200:
 *         description: Feedback received
 *       500:
 *         description: Internal server error
 */
router.post('/feedback', validateFeedback, handleValidationErrors, async (req, res) => {
    try {
        const { insight, feedbackType, timestamp, originalPrediction } = req.body;
        // 🛡️ Sentinel: Prevent user spoofing by using authenticated user ID
        const user = req.user?.id || req.user?.email || 'unknown';
        logger.info('AI Feedback received:', {
            insight,
            feedbackType,
            user,
            timestamp,
            originalPrediction,
        });
        await enforceBackgroundThrottle(req, 'ai-feedback');
        // Add feedback to the queue for asynchronous processing by ML services
        await feedbackQueue.add('logFeedback', {
            insight,
            feedbackType,
            user,
            timestamp,
            originalPrediction,
        });
        res.status(200).json({
            success: true,
            message: 'Feedback received successfully and queued for processing',
        });
    }
    catch (error) {
        logger.error(`Error processing feedback: ${error instanceof Error ? error.message : String(error)}`);
        if (error && typeof error === 'object' && 'status' in error && error.status === 429) {
            res.status(429).json({
                error: 'Too many feedback events submitted',
                retryAfter: 'retryAfter' in error ? error.retryAfter : undefined,
            });
            return;
        }
        res.status(500).json({
            error: 'Failed to process feedback',
            message: 'Internal server error',
        });
    }
});
/**
 * @openapi
 * /api/ai/feedback/deception:
 *   post:
 *     tags:
 *       - AI
 *     summary: Submit deception feedback
 *     description: Logs user feedback on deception detection for training signals.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *               - label
 *               - user
 *               - timestamp
 *             properties:
 *               text:
 *                 type: string
 *               label:
 *                 type: string
 *                 enum: [false_positive, false_negative]
 *               user:
 *                 type: string
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *               deceptionScore:
 *                 type: number
 *     responses:
 *       200:
 *         description: Feedback received
 *       500:
 *         description: Internal server error
 */
router.post('/feedback/deception', validateDeceptionFeedback, handleValidationErrors, async (req, res) => {
    try {
        const { text, label, timestamp, deceptionScore } = req.body;
        // 🛡️ Sentinel: Prevent user spoofing by using authenticated user ID
        const user = req.user?.id || req.user?.email || 'unknown';
        await enforceBackgroundThrottle(req, 'ai-feedback');
        await feedbackQueue.add('logDeceptionFeedback', {
            insight: { text, deceptionScore },
            feedbackType: label,
            user,
            timestamp,
            originalPrediction: { deceptionScore },
        });
        res.status(200).json({ success: true, message: 'Feedback received' });
    }
    catch (error) {
        logger.error(`Error processing deception feedback: ${error instanceof Error ? error.message : String(error)}`);
        if (error && typeof error === 'object' && 'status' in error && error.status === 429) {
            res.status(429).json({
                error: 'Too many deception feedback events submitted',
                retryAfter: 'retryAfter' in error ? error.retryAfter : undefined,
            });
            return;
        }
        res.status(500).json({
            error: 'Failed to process feedback',
            message: 'Internal server error',
        });
    }
});
// Scaffold helper functions (replace with actual ML integration)
function generateScaffoldSentiment(text) {
    // Simple keyword-based scaffold sentiment
    const positiveWords = [
        'good',
        'great',
        'excellent',
        'positive',
        'happy',
        'success',
    ];
    const negativeWords = [
        'bad',
        'terrible',
        'poor',
        'negative',
        'sad',
        'failure',
    ];
    const textLower = text.toLowerCase();
    const positiveCount = positiveWords.filter((word) => textLower.includes(word)).length;
    const negativeCount = negativeWords.filter((word) => textLower.includes(word)).length;
    let sentiment = 'neutral';
    let confidence = 0.7;
    if (positiveCount > negativeCount) {
        sentiment = 'positive';
        confidence = Math.min(0.6 + positiveCount * 0.1, 0.95);
    }
    else if (negativeCount > positiveCount) {
        sentiment = 'negative';
        confidence = Math.min(0.6 + negativeCount * 0.1, 0.95);
    }
    return {
        sentiment,
        confidence: parseFloat(confidence.toFixed(3)),
        scores: {
            positive: sentiment === 'positive' ? confidence : (1 - confidence) * 0.4,
            negative: sentiment === 'negative' ? confidence : (1 - confidence) * 0.4,
            neutral: sentiment === 'neutral' ? confidence : (1 - confidence) * 0.2,
        },
        method: 'scaffold',
    };
}
function generateScaffoldEntitySentiment(entityData) {
    const textFields = [];
    const fieldMap = {};
    // Extract text from entity
    if (entityData.description) {
        textFields.push(entityData.description);
        fieldMap[textFields.length - 1] = 'description';
    }
    if (entityData.notes) {
        textFields.push(entityData.notes);
        fieldMap[textFields.length - 1] = 'notes';
    }
    if (textFields.length === 0) {
        return {
            overall_sentiment: 'neutral',
            overall_confidence: 0.0,
            field_sentiments: {},
            summary: 'No text content found for analysis',
        };
    }
    const fieldSentiments = {};
    const sentimentScores = { positive: [], negative: [], neutral: [] };
    textFields.forEach((text, index) => {
        const result = generateScaffoldSentiment(text);
        const fieldName = fieldMap[index];
        fieldSentiments[fieldName] = result;
        // Collect for aggregation
        Object.entries(result.scores).forEach(([sentiment, score]) => {
            sentimentScores[sentiment].push(score);
        });
    });
    // Calculate overall sentiment
    const avgScores = {};
    Object.entries(sentimentScores).forEach(([sentiment, scores]) => {
        avgScores[sentiment] =
            scores.length > 0
                ? scores.reduce((a, b) => a + b, 0) / scores.length
                : 0;
    });
    const overallSentiment = Object.entries(avgScores).reduce((a, b) => avgScores[a[0]] > avgScores[b[0]] ? a : b)[0];
    const overallConfidence = avgScores[overallSentiment];
    return {
        overall_sentiment: overallSentiment,
        overall_confidence: parseFloat(overallConfidence.toFixed(3)),
        field_sentiments: fieldSentiments,
        summary: `Analyzed ${textFields.length} field(s). Overall sentiment: ${overallSentiment} (confidence: ${overallConfidence.toFixed(2)})`,
        analyzed_at: new Date().toISOString(),
    };
}
function generateScaffoldAISummary(entityId, entityData, includeContext) {
    const entityType = entityData?.type || 'entity';
    const entityName = entityData?.name || entityId;
    const insights = [
        `${entityName} shows characteristics typical of ${entityType} entities`,
        'Scaffold analysis indicates normal behavior patterns',
        'No anomalies detected in current data set',
    ];
    const recommendations = [
        'Continue monitoring entity for changes',
        'Consider expanding data collection for deeper insights',
        'Review related entities for additional context',
    ];
    if (includeContext) {
        insights.push('Context analysis would provide additional insights when real ML models are integrated');
        recommendations.push('Implement context-aware analysis for enhanced predictions');
    }
    return {
        summary: `AI analysis of ${entityName}: This ${entityType} entity demonstrates standard patterns in the available data. Scaffold predictions suggest normal operational characteristics with no immediate concerns identified.`,
        insights,
        recommendations,
        confidence: 0.75,
        generatedBy: 'scaffold-ai-v1',
        timestamp: new Date().toISOString(),
    };
}
const adversaryService = new AdversaryAgentService_js_1.default();
/**
 * @openapi
 * /api/ai/adversary/generate:
 *   post:
 *     tags:
 *       - AI
 *     summary: Generate adversary chain
 *     description: Generates an adversary chain based on the provided context.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - context
 *             properties:
 *               context:
 *                 type: string
 *               temperature:
 *                 type: number
 *               persistence:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Chain generated
 *       400:
 *         description: Missing context
 *       500:
 *         description: Internal server error
 */
router.post('/adversary/generate', async (req, res) => {
    const { context, temperature, persistence } = req.body || {};
    if (!context) {
        return res.status(400).json({ error: 'context is required' });
    }
    try {
        const chain = await adversaryService.generateChain(context, {
            temperature,
            persistence,
        });
        res.json({ ttps: chain });
    }
    catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
});
exports.default = router;
