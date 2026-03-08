"use strict";
/**
 * Predictive Execution Engine
 *
 * Governed execution engine for predictive analytics.
 * Enforces the Predictive Model Contract with:
 * - Capability-based authorization
 * - Policy enforcement
 * - Resource limits and budgets
 * - Deterministic execution (where feasible)
 * - Mandatory explanation payloads
 * - Full audit trail
 *
 * SOC 2 Controls: CC6.1 (Access), CC7.2 (Monitoring)
 *
 * @module analytics/engine/PredictiveExecutionEngine
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PredictiveExecutionEngine = void 0;
exports.getPredictiveEngine = getPredictiveEngine;
const uuid_1 = require("uuid");
const events_1 = require("events");
const PolicyEngine_js_1 = require("../../governance/PolicyEngine.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const types_js_1 = require("./types.js");
const DEFAULT_CONFIG = {
    enablePolicyChecks: true,
    enableAuditLog: true,
    enableCaching: true,
    defaultLimits: {
        maxExecutionTimeMs: 30000, // 30 seconds
        maxMemoryMb: 512,
        maxTokens: 10000,
        maxDataRows: 100000,
    },
};
const MAX_LIMITS = {
    maxExecutionTimeMs: 300000, // 5 minutes
    maxMemoryMb: 2048,
    maxTokens: 50000,
    maxDataRows: 1000000,
};
// ============================================================================
// Predictive Execution Engine
// ============================================================================
class PredictiveExecutionEngine extends events_1.EventEmitter {
    config;
    policyEngine;
    modelRegistry;
    predictionCache;
    auditEvents;
    constructor(config, policyEngine) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.policyEngine = policyEngine || new PolicyEngine_js_1.PolicyEngine();
        this.modelRegistry = new Map();
        this.predictionCache = new Map();
        this.auditEvents = [];
        logger_js_1.default.info('[PredictiveEngine] Initialized with governance enforcement');
    }
    // ==========================================================================
    // Model Registration
    // ==========================================================================
    /**
     * Register a prediction model with the engine.
     */
    registerModel(model) {
        const modelKey = `${model.type}:${model.version}`;
        this.modelRegistry.set(modelKey, model);
        logger_js_1.default.info(`[PredictiveEngine] Registered model: ${modelKey}`);
    }
    /**
     * Get a registered model by type and version.
     */
    getModel(type, version = 'latest') {
        const modelKey = `${type}:${version}`;
        const model = this.modelRegistry.get(modelKey);
        if (!model) {
            throw new types_js_1.PredictionError(`Model not found: ${modelKey}`, 'MODEL_NOT_FOUND', { type, version });
        }
        return model;
    }
    // ==========================================================================
    // Main Prediction Execution
    // ==========================================================================
    /**
     * Execute a prediction with full governance enforcement.
     */
    async predict(request) {
        const predictionId = (0, uuid_1.v4)();
        const startTime = Date.now();
        logger_js_1.default.info(`[PredictiveEngine] Starting prediction ${predictionId}`, {
            type: request.type,
            tenantId: request.tenantId,
        });
        try {
            // Step 1: Check cache
            if (this.config.enableCaching && request.options?.enableCaching !== false) {
                const cached = this.checkCache(request);
                if (cached) {
                    logger_js_1.default.info(`[PredictiveEngine] Cache hit for ${predictionId}`);
                    return cached;
                }
            }
            // Step 2: Pre-execution policy check
            const governanceVerdict = await this.checkPolicy(request, predictionId);
            if (governanceVerdict.action === 'DENY') {
                throw new types_js_1.PredictionError(`Policy denied prediction: ${governanceVerdict.reasons.join(', ')}`, 'POLICY_DENIED', { verdict: governanceVerdict });
            }
            // Step 3: Validate and normalize limits
            const limits = this.normalizeLimits(request.options);
            // Step 4: Create execution context
            const context = this.createExecutionContext(predictionId, limits);
            // Step 5: Get model
            const model = this.getModel(request.type);
            // Step 6: Execute prediction with resource monitoring
            const output = await this.executeWithLimits(model, request, context);
            // Step 7: Validate output
            this.validateOutput(output, request.type);
            // Step 8: Build metadata envelope
            const metadata = await this.buildMetadata(predictionId, request, model, governanceVerdict, context, startTime);
            // Step 9: Post-execution validation
            this.validateMetadata(metadata);
            // Step 10: Create response
            const response = { output, metadata };
            // Step 11: Cache result
            if (this.config.enableCaching && request.options?.enableCaching !== false) {
                this.cacheResult(request, response);
            }
            // Step 12: Emit audit event
            if (this.config.enableAuditLog) {
                this.emitAuditEvent({
                    eventType: 'prediction_executed',
                    predictionId,
                    predictionType: request.type,
                    tenantId: request.tenantId,
                    agentId: request.agentId,
                    confidence: metadata.confidence,
                    dataSources: metadata.dataSources.map((ds) => ds.type),
                    governanceVerdict: governanceVerdict.action,
                    timestamp: new Date().toISOString(),
                });
            }
            logger_js_1.default.info(`[PredictiveEngine] Completed prediction ${predictionId}`, {
                confidence: metadata.confidence,
                executionTime: metadata.executionTime,
            });
            return response;
        }
        catch (error) {
            // Emit failure audit event
            if (this.config.enableAuditLog) {
                this.emitAuditEvent({
                    eventType: 'prediction_failed',
                    predictionId,
                    predictionType: request.type,
                    tenantId: request.tenantId,
                    agentId: request.agentId,
                    governanceVerdict: 'DENY',
                    errorCode: error instanceof types_js_1.PredictionError ? error.code : 'INVALID_INPUT',
                    errorMessage: error instanceof Error ? error.message : String(error),
                    timestamp: new Date().toISOString(),
                });
            }
            logger_js_1.default.error(`[PredictiveEngine] Prediction failed ${predictionId}`, { error });
            throw error;
        }
    }
    // ==========================================================================
    // Policy Enforcement
    // ==========================================================================
    async checkPolicy(request, predictionId) {
        if (!this.config.enablePolicyChecks) {
            return {
                action: 'ALLOW',
                reasons: [],
                policyIds: [],
                metadata: {
                    timestamp: new Date().toISOString(),
                    evaluator: 'predictive-engine-bypass',
                    latencyMs: 0,
                    simulation: false,
                },
                provenance: {
                    origin: 'predictive-execution-engine',
                    confidence: 1.0,
                },
            };
        }
        const policyContext = {
            stage: 'runtime',
            tenantId: request.tenantId,
            payload: {
                predictionId,
                predictionType: request.type,
                agentId: request.agentId,
                inputs: request.inputs,
                options: request.options,
            },
        };
        return this.policyEngine.check(policyContext);
    }
    // ==========================================================================
    // Resource Limit Management
    // ==========================================================================
    normalizeLimits(options) {
        const limits = {
            maxExecutionTimeMs: options?.maxExecutionTimeMs || this.config.defaultLimits.maxExecutionTimeMs,
            maxMemoryMb: options?.maxMemoryMb || this.config.defaultLimits.maxMemoryMb,
            maxTokens: options?.maxTokens || this.config.defaultLimits.maxTokens,
            maxDataRows: options?.maxDataRows || this.config.defaultLimits.maxDataRows,
        };
        // Enforce maximum limits
        limits.maxExecutionTimeMs = Math.min(limits.maxExecutionTimeMs, MAX_LIMITS.maxExecutionTimeMs);
        limits.maxMemoryMb = Math.min(limits.maxMemoryMb, MAX_LIMITS.maxMemoryMb);
        limits.maxTokens = Math.min(limits.maxTokens, MAX_LIMITS.maxTokens);
        limits.maxDataRows = Math.min(limits.maxDataRows, MAX_LIMITS.maxDataRows);
        return limits;
    }
    createExecutionContext(predictionId, limits) {
        return {
            predictionId,
            startTime: Date.now(),
            limits,
            resourceUsage: {
                cpuMs: 0,
                memoryMb: 0,
            },
            abortController: new AbortController(),
        };
    }
    // ==========================================================================
    // Execution with Limits
    // ==========================================================================
    async executeWithLimits(model, request, context) {
        // Set timeout
        const timeoutId = setTimeout(() => {
            context.abortController.abort();
        }, context.limits.maxExecutionTimeMs);
        try {
            // Execute model
            const output = await model.executor(request, context);
            // Check if aborted
            if (context.abortController.signal.aborted) {
                throw new types_js_1.PredictionError(`Execution timeout after ${context.limits.maxExecutionTimeMs}ms`, 'TIMEOUT', { limit: context.limits.maxExecutionTimeMs });
            }
            // Update resource usage
            context.resourceUsage.cpuMs = Date.now() - context.startTime;
            // Check memory (approximate)
            const memoryUsage = process.memoryUsage();
            context.resourceUsage.memoryMb = memoryUsage.heapUsed / 1024 / 1024;
            if (context.resourceUsage.memoryMb > context.limits.maxMemoryMb) {
                throw new types_js_1.PredictionError(`Memory limit exceeded: ${context.resourceUsage.memoryMb}MB > ${context.limits.maxMemoryMb}MB`, 'BUDGET_EXCEEDED', { usage: context.resourceUsage.memoryMb, limit: context.limits.maxMemoryMb });
            }
            return output;
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
    // ==========================================================================
    // Validation
    // ==========================================================================
    validateOutput(output, type) {
        if (!output) {
            throw new types_js_1.PredictionError('Prediction output is null or undefined', 'INVALID_OUTPUT');
        }
        // Validate predictionId
        if (!output.predictionId || typeof output.predictionId !== 'string') {
            throw new types_js_1.PredictionError('Missing or invalid predictionId', 'INVALID_OUTPUT');
        }
        // Type-specific validation
        if ('value' in output) {
            // PredictionScore
            if (typeof output.value !== 'number') {
                throw new types_js_1.PredictionError('PredictionScore.value must be a number', 'INVALID_OUTPUT');
            }
            if (output.confidence === undefined || output.confidence < 0 || output.confidence > 1) {
                throw new types_js_1.PredictionError('PredictionScore.confidence must be between 0 and 1', 'INVALID_OUTPUT');
            }
        }
        else if ('hypotheses' in output) {
            // RankedHypothesis
            if (!Array.isArray(output.hypotheses) || output.hypotheses.length === 0) {
                throw new types_js_1.PredictionError('RankedHypothesis must have at least one hypothesis', 'INVALID_OUTPUT');
            }
        }
        else if ('forecast' in output) {
            // TrendForecast
            if (!Array.isArray(output.forecast) || output.forecast.length === 0) {
                throw new types_js_1.PredictionError('TrendForecast must have at least one forecast point', 'INVALID_OUTPUT');
            }
        }
    }
    validateMetadata(metadata) {
        const required = [
            'predictionId',
            'predictionType',
            'modelVersion',
            'governanceVerdict',
            'capabilityAuthorization',
            'tenantId',
            'confidence',
            'assumptions',
            'limitations',
            'dataSources',
            'dataFreshness',
            'executionTime',
            'resourceUsage',
            'explanation',
            'timestamp',
        ];
        for (const field of required) {
            if (!(field in metadata)) {
                throw new types_js_1.PredictionError(`Missing required metadata field: ${field}`, 'METADATA_INCOMPLETE', { missingField: field });
            }
        }
        // Validate confidence range
        if (metadata.confidence < 0 || metadata.confidence > 1) {
            throw new types_js_1.PredictionError('Metadata confidence must be between 0 and 1', 'METADATA_INCOMPLETE');
        }
        // Validate data sources
        if (!Array.isArray(metadata.dataSources) || metadata.dataSources.length === 0) {
            throw new types_js_1.PredictionError('Metadata must declare at least one data source', 'METADATA_INCOMPLETE');
        }
        // Validate explanation
        if (!metadata.explanation.method || metadata.explanation.topFactors.length === 0) {
            throw new types_js_1.PredictionError('Metadata explanation must include method and topFactors', 'METADATA_INCOMPLETE');
        }
    }
    // ==========================================================================
    // Metadata Construction
    // ==========================================================================
    async buildMetadata(predictionId, request, model, governanceVerdict, context, startTime) {
        // Calculate confidence (this is a simplified version; real implementation would be more sophisticated)
        const confidenceFactors = {
            dataQuality: 0.9, // Would be computed from actual data
            dataFreshness: 0.85, // Would be computed from data timestamps
            modelAccuracy: model.accuracy.value,
            inputCompleteness: this.assessInputCompleteness(request.inputs),
        };
        const confidence = (0, types_js_1.calculateConfidence)(confidenceFactors);
        // Build data sources (simplified; real implementation would track actual queries)
        const dataSources = [
            {
                type: 'policy_state',
                query: 'getPolicyState(tenantId)',
                timestamp: new Date().toISOString(),
                recordCount: 100, // Example
            },
        ];
        // Build data freshness
        const dataFreshness = {
            oldestRecord: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
            youngestRecord: new Date().toISOString(),
            stalenessTolerance: request.options?.stalenessTolerance || 'P7D', // 7 days
        };
        // Build explanation
        const explanation = {
            method: `${model.type} v${model.version}`,
            topFactors: [
                'Historical trend analysis',
                'Policy compliance state',
                'Recent audit outcomes',
            ],
        };
        const metadata = {
            predictionId,
            predictionType: request.type,
            modelVersion: model.version,
            governanceVerdict,
            capabilityAuthorization: request.agentId || 'system',
            tenantId: request.tenantId,
            confidence,
            assumptions: ['Historical patterns continue', 'No major policy changes'],
            limitations: ['Based on available data only', 'Confidence decays over time'],
            dataSources,
            dataFreshness,
            executionTime: Date.now() - startTime,
            resourceUsage: context.resourceUsage,
            explanation,
            timestamp: new Date().toISOString(),
        };
        return metadata;
    }
    assessInputCompleteness(inputs) {
        // Simplified: count non-null/non-undefined inputs
        const keys = Object.keys(inputs);
        if (keys.length === 0)
            return 0;
        const complete = keys.filter((k) => inputs[k] !== null && inputs[k] !== undefined).length;
        return complete / keys.length;
    }
    // ==========================================================================
    // Caching
    // ==========================================================================
    checkCache(request) {
        const cacheKey = this.getCacheKey(request);
        const cached = this.predictionCache.get(cacheKey);
        if (!cached)
            return null;
        // Check expiration
        if (Date.now() > cached.expiresAt) {
            this.predictionCache.delete(cacheKey);
            return null;
        }
        return cached.response;
    }
    cacheResult(request, response) {
        const cacheKey = this.getCacheKey(request);
        const cacheTTL = 5 * 60 * 1000; // 5 minutes
        const expiresAt = Date.now() + cacheTTL;
        this.predictionCache.set(cacheKey, { response, expiresAt });
    }
    getCacheKey(request) {
        const keyObj = {
            type: request.type,
            tenantId: request.tenantId,
            inputs: request.inputs,
        };
        return JSON.stringify(keyObj);
    }
    // ==========================================================================
    // Audit
    // ==========================================================================
    emitAuditEvent(event) {
        this.auditEvents.push(event);
        this.emit('audit', event);
        logger_js_1.default.info('[PredictiveEngine] Audit event', event);
    }
    getAuditEvents() {
        return [...this.auditEvents];
    }
    clearAuditEvents() {
        this.auditEvents = [];
    }
    // ==========================================================================
    // Utilities
    // ==========================================================================
    getRegisteredModels() {
        return Array.from(this.modelRegistry.keys());
    }
    clearCache() {
        this.predictionCache.clear();
    }
}
exports.PredictiveExecutionEngine = PredictiveExecutionEngine;
// ============================================================================
// Factory
// ============================================================================
let engineInstance = null;
function getPredictiveEngine(config, policyEngine) {
    if (!engineInstance) {
        engineInstance = new PredictiveExecutionEngine(config, policyEngine);
    }
    return engineInstance;
}
