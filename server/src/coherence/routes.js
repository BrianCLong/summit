"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCoherenceRoutes = createCoherenceRoutes;
// @ts-nocheck
const express_1 = require("express");
const zod_1 = require("zod");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Request schemas
const SignalIngestSchema = zod_1.z.object({
    tenantId: zod_1.z.string().min(1),
    type: zod_1.z.string().min(1),
    value: zod_1.z.number().min(-1000).max(1000),
    weight: zod_1.z.number().optional().default(1.0),
    source: zod_1.z.string().min(1),
    ts: zod_1.z
        .string()
        .datetime()
        .optional()
        .default(() => new Date().toISOString()),
    signalId: zod_1.z.string().optional(),
    metadata: zod_1.z.object({}).optional(),
});
const AnalysisRequestSchema = zod_1.z.object({
    tenantId: zod_1.z.string().min(1),
    timeRange: zod_1.z
        .object({
        start: zod_1.z.string().datetime(),
        end: zod_1.z.string().datetime(),
    })
        .optional(),
    forceRefresh: zod_1.z.boolean().optional().default(false),
    includeRealTimeAnalysis: zod_1.z.boolean().optional().default(true),
});
const ConfigurationSchema = zod_1.z.object({
    tenantId: zod_1.z.string().min(1),
    analysisInterval: zod_1.z.number().min(1).max(1440).optional(), // 1 minute to 24 hours
    signalRetention: zod_1.z.number().min(1).max(3650).optional(), // 1 day to 10 years
    confidenceThreshold: zod_1.z.number().min(0).max(1).optional(),
    anomalyThreshold: zod_1.z.number().min(0.5).max(5).optional(),
    enableRealTimeAnalysis: zod_1.z.boolean().optional(),
    enablePredictiveAnalysis: zod_1.z.boolean().optional(),
    notificationSettings: zod_1.z
        .object({
        scoreThreshold: zod_1.z.number().min(0).max(1).optional(),
        riskThreshold: zod_1.z.number().min(0).max(1).optional(),
        enableSlack: zod_1.z.boolean().optional(),
        enableEmail: zod_1.z.boolean().optional(),
    })
        .optional(),
});
const MissionContextSchema = zod_1.z.object({
    tenantId: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    description: zod_1.z.string(),
    priority: zod_1.z
        .enum(['low', 'medium', 'high', 'critical'])
        .optional()
        .default('medium'),
    classification: zod_1.z
        .enum(['public', 'internal', 'confidential', 'secret'])
        .optional()
        .default('internal'),
    objectives: zod_1.z
        .array(zod_1.z.object({
        title: zod_1.z.string(),
        description: zod_1.z.string(),
        type: zod_1.z.enum(['intelligence', 'operational', 'strategic', 'tactical']),
        priority: zod_1.z.number().min(1).max(10),
    }))
        .optional(),
    timeline: zod_1.z
        .object({
        startDate: zod_1.z.string().datetime(),
        plannedEndDate: zod_1.z.string().datetime(),
    })
        .optional(),
});
// Rate limiting
const analysisRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 analysis requests per windowMs
    message: 'Too many analysis requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
const ingestRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 1000, // Limit each IP to 1000 signals per minute
    message: 'Signal ingestion rate limit exceeded, please slow down.',
    standardHeaders: true,
    legacyHeaders: false,
});
function createCoherenceRoutes(coherenceService) {
    const router = (0, express_1.Router)();
    // Health check endpoint
    router.get('/health', async (req, res) => {
        try {
            const health = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                components: {
                    coherenceService: 'healthy',
                    database: 'healthy',
                    cache: 'healthy',
                },
            };
            res.json(health);
        }
        catch (error) {
            logger_js_1.default.error('Health check failed', { error });
            res.status(500).json({
                status: 'unhealthy',
                error: 'Internal server error',
            });
        }
    });
    // Signal ingestion endpoint
    router.post('/signals/ingest', ingestRateLimit, async (req, res) => {
        try {
            const validatedInput = SignalIngestSchema.parse(req.body);
            const result = await coherenceService.ingestSignal(validatedInput.tenantId, validatedInput);
            logger_js_1.default.info('Signal ingested via API', {
                tenantId: validatedInput.tenantId,
                signalId: result.signalId,
                type: validatedInput.type,
                triggeredAnalysis: result.triggeredAnalysis,
            });
            res.status(201).json(result);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                logger_js_1.default.warn('Invalid signal ingestion request', {
                    errors: error.errors,
                });
                return res.status(400).json({
                    success: false,
                    error: 'Invalid request format',
                    details: error.errors,
                });
            }
            logger_js_1.default.error('Signal ingestion failed', { error });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    });
    // Batch signal ingestion
    router.post('/signals/batch', ingestRateLimit, async (req, res) => {
        try {
            const { tenantId, signals } = req.body;
            if (!tenantId || !Array.isArray(signals)) {
                return res.status(400).json({
                    success: false,
                    error: 'tenantId and signals array are required',
                });
            }
            if (signals.length > 100) {
                return res.status(400).json({
                    success: false,
                    error: 'Batch size limited to 100 signals',
                });
            }
            const results = [];
            let successCount = 0;
            let failureCount = 0;
            for (const signalData of signals) {
                try {
                    const validatedSignal = SignalIngestSchema.parse({
                        ...signalData,
                        tenantId,
                    });
                    const result = await coherenceService.ingestSignal(tenantId, validatedSignal);
                    results.push({ success: true, signalId: result.signalId });
                    successCount++;
                }
                catch (error) {
                    results.push({
                        success: false,
                        error: error instanceof zod_1.z.ZodError
                            ? 'Validation error'
                            : 'Processing error',
                        signalData: signalData.signalId || 'unknown',
                    });
                    failureCount++;
                }
            }
            logger_js_1.default.info('Batch signal ingestion completed', {
                tenantId,
                totalSignals: signals.length,
                successCount,
                failureCount,
            });
            res.json({
                success: true,
                summary: {
                    total: signals.length,
                    successful: successCount,
                    failed: failureCount,
                },
                results,
            });
        }
        catch (error) {
            logger_js_1.default.error('Batch signal ingestion failed', { error });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    });
    // Coherence analysis endpoint
    router.post('/analysis', analysisRateLimit, async (req, res) => {
        try {
            const validatedInput = AnalysisRequestSchema.parse(req.body);
            const result = await coherenceService.analyzeCoherence(validatedInput.tenantId, {
                timeRange: validatedInput.timeRange,
                forceRefresh: validatedInput.forceRefresh,
                includeRealTimeAnalysis: validatedInput.includeRealTimeAnalysis,
            });
            logger_js_1.default.info('Coherence analysis completed via API', {
                tenantId: validatedInput.tenantId,
                analysisId: result.analysisId,
                coherenceScore: result.coherenceScore,
                signalCount: result.metadata.signalCount,
            });
            res.json(result);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                logger_js_1.default.warn('Invalid analysis request', { errors: error.errors });
                return res.status(400).json({
                    error: 'Invalid request format',
                    details: error.errors,
                });
            }
            logger_js_1.default.error('Coherence analysis failed', { error });
            res.status(500).json({
                error: 'Internal server error',
            });
        }
    });
    // Get coherence status
    router.get('/status/:tenantId', async (req, res) => {
        try {
            const { tenantId } = req.params;
            if (!tenantId) {
                return res.status(400).json({
                    error: 'tenantId is required',
                });
            }
            const status = await coherenceService.getCoherenceStatus(tenantId);
            res.json(status);
        }
        catch (error) {
            logger_js_1.default.error('Failed to get coherence status', {
                error,
                tenantId: req.params.tenantId,
            });
            res.status(500).json({
                error: 'Internal server error',
            });
        }
    });
    // Configuration management
    router.post('/configuration', async (req, res) => {
        try {
            const validatedInput = ConfigurationSchema.parse(req.body);
            const { tenantId, ...config } = validatedInput;
            await coherenceService.configureTenant(tenantId, config);
            logger_js_1.default.info('Tenant configuration updated', { tenantId, config });
            res.json({
                success: true,
                message: 'Configuration updated successfully',
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                logger_js_1.default.warn('Invalid configuration request', { errors: error.errors });
                return res.status(400).json({
                    success: false,
                    error: 'Invalid configuration format',
                    details: error.errors,
                });
            }
            logger_js_1.default.error('Configuration update failed', { error });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    });
    // Mission management endpoints
    router.post('/missions', async (req, res) => {
        try {
            const validatedInput = MissionContextSchema.parse(req.body);
            const { tenantId, ...missionData } = validatedInput;
            const mission = await coherenceService
                .getMissionVault()
                .createMissionContext(tenantId, missionData);
            logger_js_1.default.info('Mission created via API', {
                tenantId,
                missionId: mission.missionId,
                name: mission.name,
            });
            res.status(201).json(mission);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                logger_js_1.default.warn('Invalid mission creation request', {
                    errors: error.errors,
                });
                return res.status(400).json({
                    error: 'Invalid mission format',
                    details: error.errors,
                });
            }
            logger_js_1.default.error('Mission creation failed', { error });
            res.status(500).json({
                error: 'Internal server error',
            });
        }
    });
    router.get('/missions/:tenantId', async (req, res) => {
        try {
            const { tenantId } = req.params;
            const { missionId } = req.query;
            if (!tenantId) {
                return res.status(400).json({
                    error: 'tenantId is required',
                });
            }
            if (missionId) {
                // Get specific mission
                const mission = await coherenceService
                    .getMissionVault()
                    .getMissionContext(tenantId, missionId);
                if (!mission) {
                    return res.status(404).json({
                        error: 'Mission not found',
                    });
                }
                res.json(mission);
            }
            else {
                // Get all active missions
                const missions = await coherenceService
                    .getMissionVault()
                    .getActiveMissions(tenantId);
                res.json({
                    missions,
                    count: missions.length,
                });
            }
        }
        catch (error) {
            logger_js_1.default.error('Failed to get missions', {
                error,
                tenantId: req.params.tenantId,
            });
            res.status(500).json({
                error: 'Internal server error',
            });
        }
    });
    // Activity fingerprints endpoint
    router.get('/activity/:tenantId', async (req, res) => {
        try {
            const { tenantId } = req.params;
            const { limit = 50, minConfidence = 0.3, types, startTime, endTime, } = req.query;
            if (!tenantId) {
                return res.status(400).json({
                    error: 'tenantId is required',
                });
            }
            const options = {
                limit: parseInt(limit),
                minConfidence: parseFloat(minConfidence),
            };
            if (types) {
                options.types = types.split(',');
            }
            if (startTime && endTime) {
                options.timeRange = {
                    start: startTime,
                    end: endTime,
                };
            }
            const fingerprints = await coherenceService
                .getActivityIndex()
                .getActivityFingerprints(tenantId, options);
            res.json({
                fingerprints,
                count: fingerprints.length,
                options,
            });
        }
        catch (error) {
            logger_js_1.default.error('Failed to get activity fingerprints', {
                error,
                tenantId: req.params.tenantId,
            });
            res.status(500).json({
                error: 'Internal server error',
            });
        }
    });
    // Narrative impacts endpoint
    router.get('/narratives/:tenantId', async (req, res) => {
        try {
            const { tenantId } = req.params;
            const { limit = 20, minMagnitude = 0.1, impactTypes, startTime, endTime, } = req.query;
            if (!tenantId) {
                return res.status(400).json({
                    error: 'tenantId is required',
                });
            }
            const options = {
                limit: parseInt(limit),
                minMagnitude: parseFloat(minMagnitude),
            };
            if (impactTypes) {
                options.impactTypes = impactTypes.split(',');
            }
            if (startTime && endTime) {
                options.timeRange = {
                    start: startTime,
                    end: endTime,
                };
            }
            const impacts = await coherenceService
                .getNarrativeModel()
                .getNarrativeImpacts(tenantId, options);
            res.json({
                impacts,
                count: impacts.length,
                options,
            });
        }
        catch (error) {
            logger_js_1.default.error('Failed to get narrative impacts', {
                error,
                tenantId: req.params.tenantId,
            });
            res.status(500).json({
                error: 'Internal server error',
            });
        }
    });
    // Mission health assessment
    router.get('/missions/:tenantId/:missionId/health', async (req, res) => {
        try {
            const { tenantId, missionId } = req.params;
            if (!tenantId || !missionId) {
                return res.status(400).json({
                    error: 'tenantId and missionId are required',
                });
            }
            const health = await coherenceService
                .getMissionVault()
                .assessMissionHealth(tenantId, missionId);
            res.json(health);
        }
        catch (error) {
            logger_js_1.default.error('Failed to assess mission health', {
                error,
                tenantId: req.params.tenantId,
                missionId: req.params.missionId,
            });
            res.status(500).json({
                error: 'Internal server error',
            });
        }
    });
    // Debugging and testing endpoints (remove in production)
    if (process.env.NODE_ENV !== 'production') {
        router.post('/debug/simulate-update/:tenantId', async (req, res) => {
            try {
                const { tenantId } = req.params;
                const { type = 'coherence' } = req.body;
                const subscriptionManager = coherenceService.getSubscriptionManager();
                let result;
                if (type === 'coherence') {
                    result =
                        await subscriptionManager.simulateCoherenceUpdate(tenantId);
                }
                else if (type === 'activity') {
                    result = await subscriptionManager.simulateActivityUpdate(tenantId);
                }
                else if (type === 'narrative') {
                    result =
                        await subscriptionManager.simulateNarrativeUpdate(tenantId);
                }
                else {
                    return res.status(400).json({ error: 'Invalid simulation type' });
                }
                res.json({
                    success: true,
                    simulation: result,
                });
            }
            catch (error) {
                logger_js_1.default.error('Simulation failed', { error });
                res.status(500).json({
                    error: 'Simulation failed',
                });
            }
        });
        router.get('/debug/subscription-counts', async (req, res) => {
            try {
                const subscriptionManager = coherenceService.getSubscriptionManager();
                const counts = subscriptionManager.getSubscriptionCounts();
                res.json({
                    subscriptionCounts: counts,
                    totalSubscriptions: Object.values(counts).reduce((sum, count) => sum + count, 0),
                });
            }
            catch (error) {
                logger_js_1.default.error('Failed to get subscription counts', { error });
                res.status(500).json({
                    error: 'Failed to get subscription counts',
                });
            }
        });
    }
    // Error handling middleware
    router.use((error, req, res, next) => {
        logger_js_1.default.error('Coherence API error', {
            error: error.message,
            stack: error.stack,
            path: req.path,
            method: req.method,
        });
        res.status(500).json({
            error: 'Internal server error',
            path: req.path,
            timestamp: new Date().toISOString(),
        });
    });
    return router;
}
