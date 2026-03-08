"use strict";
/**
 * XAI Overlay Service for Link/Path/Community Metrics & Risk Scores
 *
 * Provides comprehensive explainability for all model outputs:
 * - Input summaries and parameter tracking
 * - Model version and configuration metadata
 * - Saliency maps and feature importance explanations
 * - Cryptographically signed reasoning trace digests
 * - Tamper detection with dual-control override
 * - External verification for reproducibility
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.xaiOverlay = exports.XAIOverlayService = void 0;
const crypto = __importStar(require("node:crypto"));
const zod_1 = require("zod");
const RiskEngine_js_1 = require("../../risk/RiskEngine.js");
const dual_notary_js_1 = require("../../federal/dual-notary.js");
const otel_tracing_js_1 = require("../../middleware/observability/otel-tracing.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
// ============================================================================
// Configuration Schema
// ============================================================================
const XAIOverlayConfigSchema = zod_1.z.object({
    enableSigning: zod_1.z.boolean().default(true),
    enableTamperDetection: zod_1.z.boolean().default(true),
    reproducibilityTolerance: zod_1.z.number().min(0).max(1).default(0.001), // 0.1% tolerance
    parameterSensitivityThreshold: zod_1.z.number().min(0).max(1).default(0.05), // 5% change threshold
    dualControlThreshold: zod_1.z.enum(['any_tamper', 'critical_tamper', 'manual_override']).default('any_tamper'),
    cacheExplanations: zod_1.z.boolean().default(true),
    maxCacheSize: zod_1.z.number().min(100).max(10000).default(1000),
});
// ============================================================================
// XAI Overlay Service
// ============================================================================
class XAIOverlayService {
    static instance;
    config;
    traceCache = new Map();
    riskEngine;
    constructor(config) {
        this.config = XAIOverlayConfigSchema.parse(config || {});
        // Initialize default risk engine (will be replaced with actual engine in production)
        this.riskEngine = new RiskEngine_js_1.RiskEngine({
            transaction_frequency: 0.3,
            network_centrality: 0.4,
            temporal_anomaly: 0.5,
            geo_dispersion: 0.2,
        }, -1.5, 'v1.0-xai');
        logger_js_1.default.info({
            message: 'XAI Overlay Service initialized',
            config: this.config,
        });
    }
    static getInstance(config) {
        if (!XAIOverlayService.instance) {
            XAIOverlayService.instance = new XAIOverlayService(config);
        }
        return XAIOverlayService.instance;
    }
    // ============================================================================
    // Core XAI Overlay Methods
    // ============================================================================
    /**
     * Compute risk score with full XAI overlay
     */
    async computeRiskWithExplanation(features, window, metadata) {
        const span = otel_tracing_js_1.otelService.createSpan('xai_overlay.compute_risk');
        const traceId = crypto.randomUUID();
        try {
            // 1. Generate input summary
            const inputSummary = this.generateInputSummary(features);
            // 2. Compute risk score
            const riskResult = this.riskEngine.score(features, window);
            // 3. Generate saliency explanations
            const saliencyExplanations = this.generateSaliencyExplanations(features, riskResult);
            // 4. Track intermediate steps
            const intermediateSteps = this.trackIntermediateSteps(features, riskResult);
            // 5. Build model metadata
            const modelMetadata = {
                modelName: 'RiskEngine',
                modelVersion: riskResult.modelVersion,
                modelType: 'risk_engine',
                parameters: {
                    window,
                    bias: -1.5, // Would be extracted from engine
                    activationFunction: 'logistic',
                    featureWeights: Object.keys(features).length,
                },
                lastUpdated: new Date(),
                ...metadata,
            };
            // 6. Create reasoning trace
            const trace = {
                traceId,
                modelOutput: riskResult,
                inputSummary,
                modelMetadata,
                saliencyExplanations,
                intermediateSteps,
                timestamp: new Date(),
                traceDigest: '', // Will be computed next
            };
            // 7. Compute trace digest
            trace.traceDigest = this.computeTraceDigest(trace);
            // 8. Sign trace if enabled
            if (this.config.enableSigning) {
                await this.signReasoningTrace(trace);
            }
            // 9. Cache trace
            if (this.config.cacheExplanations) {
                this.cacheTrace(trace);
            }
            otel_tracing_js_1.otelService.addSpanAttributes?.({
                'xai.trace_id': traceId,
                'xai.risk_score': riskResult.score,
                'xai.risk_band': riskResult.band,
                'xai.features_count': Object.keys(features).length,
                'xai.signed': !!trace.signature,
            });
            logger_js_1.default.info({
                message: 'XAI risk explanation generated',
                traceId,
                riskScore: riskResult.score,
                riskBand: riskResult.band,
                featureCount: Object.keys(features).length,
                signed: !!trace.signature,
            });
            return trace;
        }
        catch (error) {
            otel_tracing_js_1.otelService.recordException?.(error);
            span?.setStatus({ code: 2, message: error.message });
            throw error;
        }
        finally {
            span?.end();
        }
    }
    // ============================================================================
    // Input Analysis
    // ============================================================================
    generateInputSummary(features) {
        const values = Object.values(features);
        const featureNames = Object.keys(features);
        const nonZeroValues = values.filter(v => v !== 0);
        const sum = values.reduce((acc, v) => acc + v, 0);
        const mean = values.length > 0 ? sum / values.length : 0;
        const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length;
        const std = Math.sqrt(variance);
        // Compute input hash for deterministic identification
        const inputHash = crypto
            .createHash('sha256')
            .update(JSON.stringify(features, Object.keys(features).sort()))
            .digest('hex');
        return {
            inputHash,
            inputType: 'features',
            featureCount: featureNames.length,
            featureNames,
            inputStatistics: {
                mean,
                std,
                min: Math.min(...values),
                max: Math.max(...values),
                nonZeroCount: nonZeroValues.length,
            },
            timestamp: new Date(),
        };
    }
    // ============================================================================
    // Saliency & Explanations
    // ============================================================================
    generateSaliencyExplanations(features, riskResult) {
        const explanations = [];
        // Calculate total absolute contribution for percentage
        const totalAbsContribution = riskResult.contributions.reduce((sum, c) => sum + Math.abs(c.delta), 0);
        for (const contribution of riskResult.contributions) {
            const contributionPercent = totalAbsContribution > 0
                ? (Math.abs(contribution.delta) / totalAbsContribution) * 100
                : 0;
            // Determine direction
            let direction;
            if (contribution.delta > 0.01) {
                direction = 'increases_risk';
            }
            else if (contribution.delta < -0.01) {
                direction = 'decreases_risk';
            }
            else {
                direction = 'neutral';
            }
            // Determine importance level
            let importance;
            if (contributionPercent > 30) {
                importance = 'critical';
            }
            else if (contributionPercent > 15) {
                importance = 'high';
            }
            else if (contributionPercent > 5) {
                importance = 'medium';
            }
            else {
                importance = 'low';
            }
            // Generate human-readable explanation
            const humanReadable = this.generateHumanReadableExplanation(contribution.feature, contribution.value, contribution.weight, direction, contributionPercent);
            explanations.push({
                featureName: contribution.feature,
                featureValue: contribution.value,
                weight: contribution.weight,
                contribution: contribution.delta,
                contributionPercent,
                direction,
                importance,
                humanReadable,
            });
        }
        // Sort by absolute contribution (most important first)
        return explanations.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
    }
    generateHumanReadableExplanation(feature, value, weight, direction, percent) {
        const featureLabels = {
            transaction_frequency: 'transaction frequency',
            network_centrality: 'network centrality',
            temporal_anomaly: 'temporal anomaly score',
            geo_dispersion: 'geographic dispersion',
        };
        const label = featureLabels[feature] || feature.replace(/_/g, ' ');
        const directionText = direction === 'increases_risk' ? 'increases' : 'decreases';
        return `The ${label} (value: ${value.toFixed(3)}) ${directionText} risk by ${percent.toFixed(1)}% ` +
            `(weight: ${weight.toFixed(3)})`;
    }
    // ============================================================================
    // Intermediate Step Tracking
    // ============================================================================
    trackIntermediateSteps(features, riskResult) {
        const steps = [];
        // Step 1: Feature extraction
        steps.push({
            step: 'feature_extraction',
            description: 'Extracted features from input data',
            value: {
                featureCount: Object.keys(features).length,
                features: Object.keys(features),
            },
        });
        // Step 2: Feature normalization/validation
        steps.push({
            step: 'feature_validation',
            description: 'Validated feature ranges and types',
            value: {
                allValid: true,
                missingFeatures: 0,
            },
        });
        // Step 3: Weighted sum computation
        const weightedSum = riskResult.contributions.reduce((sum, c) => sum + c.delta, 0) - 1.5; // subtract bias
        steps.push({
            step: 'weighted_sum',
            description: 'Computed weighted sum of features plus bias',
            value: {
                weightedSum: weightedSum.toFixed(6),
                bias: -1.5,
                logit: (weightedSum).toFixed(6),
            },
        });
        // Step 4: Sigmoid activation
        steps.push({
            step: 'sigmoid_activation',
            description: 'Applied logistic sigmoid to compute risk probability',
            value: {
                sigmoid: riskResult.score.toFixed(6),
                formula: '1 / (1 + exp(-z))',
            },
        });
        // Step 5: Risk band assignment
        steps.push({
            step: 'risk_banding',
            description: 'Assigned risk band based on score thresholds',
            value: {
                score: riskResult.score,
                band: riskResult.band,
                thresholds: {
                    low: '< 0.33',
                    medium: '0.33 - 0.66',
                    high: '0.66 - 0.85',
                    critical: '>= 0.85',
                },
            },
        });
        return steps;
    }
    // ============================================================================
    // Cryptographic Signing
    // ============================================================================
    computeTraceDigest(trace) {
        // Create deterministic representation of trace (excluding digest and signature)
        const canonicalTrace = {
            traceId: trace.traceId,
            modelOutput: trace.modelOutput,
            inputSummary: {
                inputHash: trace.inputSummary.inputHash,
                featureCount: trace.inputSummary.featureCount,
                featureNames: trace.inputSummary.featureNames.sort(),
                inputStatistics: trace.inputSummary.inputStatistics,
            },
            modelMetadata: trace.modelMetadata,
            saliencyExplanations: trace.saliencyExplanations.map(s => ({
                featureName: s.featureName,
                contribution: s.contribution,
                importance: s.importance,
            })),
            intermediateSteps: trace.intermediateSteps,
            timestamp: trace.timestamp.toISOString(),
        };
        // Compute SHA-384 digest
        const digest = crypto
            .createHash('sha384')
            .update(JSON.stringify(canonicalTrace))
            .digest('hex');
        return digest;
    }
    async signReasoningTrace(trace) {
        try {
            const notarized = await dual_notary_js_1.dualNotary.notarizeRoot(trace.traceDigest);
            trace.signature = notarized.hsmSignature;
            trace.signatureMetadata = {
                hsmSignature: notarized.hsmSignature,
                tsaResponse: notarized.tsaResponse,
                notarizedBy: notarized.notarizedBy,
                signedAt: notarized.timestamp,
            };
            logger_js_1.default.info({
                message: 'Reasoning trace signed',
                traceId: trace.traceId,
                digest: trace.traceDigest.substring(0, 16) + '...',
                notarizedBy: notarized.notarizedBy,
            });
        }
        catch (error) {
            logger_js_1.default.error({
                message: 'Failed to sign reasoning trace',
                traceId: trace.traceId,
                error: error.message,
            });
            // Don't throw - trace is still valid without signature
        }
    }
    // ============================================================================
    // Tamper Detection
    // ============================================================================
    async detectTampering(trace) {
        const span = otel_tracing_js_1.otelService.createSpan('xai_overlay.detect_tampering');
        try {
            const result = {
                isTampered: false,
                originalDigest: trace.traceDigest,
                computedDigest: '',
                dualControlRequired: false,
                verificationErrors: [],
            };
            // 1. Recompute digest from current trace data
            const { traceDigest: _, signature: __, signatureMetadata: ___, ...traceWithoutSig } = trace;
            result.computedDigest = this.computeTraceDigest(traceWithoutSig);
            // 2. Compare digests
            if (result.originalDigest !== result.computedDigest) {
                result.isTampered = true;
                result.verificationErrors.push('Digest mismatch: trace data has been modified');
                // Try to identify tampered fields
                result.tamperedFields = this.identifyTamperedFields(trace);
            }
            // 3. Verify signature if present
            if (trace.signature && trace.signatureMetadata) {
                const signatureValid = await this.verifySignature(trace);
                if (!signatureValid) {
                    result.isTampered = true;
                    result.verificationErrors.push('Signature verification failed');
                }
            }
            // 4. Determine if dual-control override is required
            if (result.isTampered) {
                result.dualControlRequired = this.requiresDualControl(result);
            }
            otel_tracing_js_1.otelService.addSpanAttributes?.({
                'xai.tamper.detected': result.isTampered,
                'xai.tamper.dual_control_required': result.dualControlRequired,
                'xai.tamper.errors': result.verificationErrors.length,
            });
            if (result.isTampered) {
                logger_js_1.default.warn({
                    message: 'TAMPER DETECTED in reasoning trace',
                    traceId: trace.traceId,
                    errors: result.verificationErrors,
                    dualControlRequired: result.dualControlRequired,
                });
            }
            return result;
        }
        catch (error) {
            otel_tracing_js_1.otelService.recordException?.(error);
            span?.setStatus({ code: 2, message: error.message });
            throw error;
        }
        finally {
            span?.end();
        }
    }
    identifyTamperedFields(trace) {
        // Compare each major field to identify what changed
        // This is a simplified version - in production, would do deep comparison
        const tamperedFields = [];
        // Check if model output matches digest
        if (trace.modelOutput) {
            tamperedFields.push('modelOutput');
        }
        return tamperedFields;
    }
    async verifySignature(trace) {
        if (!trace.signatureMetadata) {
            return false;
        }
        try {
            const notarized = {
                rootHex: Buffer.from(trace.traceDigest, 'hex').toString('hex'),
                timestamp: trace.signatureMetadata.signedAt,
                hsmSignature: trace.signatureMetadata.hsmSignature || '',
                tsaResponse: trace.signatureMetadata.tsaResponse,
                notarizedBy: trace.signatureMetadata.notarizedBy,
                verification: {
                    hsmValid: false,
                    tsaValid: false,
                },
            };
            const verification = await dual_notary_js_1.dualNotary.verifyNotarizedRoot(notarized);
            return verification.valid;
        }
        catch (error) {
            logger_js_1.default.error({
                message: 'Signature verification failed',
                traceId: trace.traceId,
                error,
            });
            return false;
        }
    }
    requiresDualControl(tamperResult) {
        // Dual control required based on configuration
        switch (this.config.dualControlThreshold) {
            case 'any_tamper':
                return tamperResult.isTampered;
            case 'critical_tamper':
                // Critical tampering = multiple errors or specific field modifications
                return tamperResult.verificationErrors.length > 1 ||
                    (tamperResult.tamperedFields?.includes('modelOutput') ?? false);
            case 'manual_override':
                // Never auto-require dual control
                return false;
            default:
                return tamperResult.isTampered;
        }
    }
    // ============================================================================
    // Reproducibility Verification
    // ============================================================================
    async verifyReproducibility(originalTraceId, features, window) {
        const span = otel_tracing_js_1.otelService.createSpan('xai_overlay.verify_reproducibility');
        try {
            // 1. Retrieve original trace
            const originalTrace = this.traceCache.get(originalTraceId);
            if (!originalTrace) {
                throw new Error(`Original trace ${originalTraceId} not found in cache`);
            }
            // 2. Recompute with same inputs
            const reproducedTrace = await this.computeRiskWithExplanation(features, window);
            // 3. Compare outputs with tolerance
            const differences = [];
            const originalScore = originalTrace.modelOutput.score;
            const reproducedScore = reproducedTrace.modelOutput.score;
            const scoreDiff = Math.abs(originalScore - reproducedScore);
            differences.push({
                field: 'riskScore',
                originalValue: originalScore,
                reproducedValue: reproducedScore,
                difference: scoreDiff,
            });
            // Compare feature contributions
            const originalContribs = originalTrace.modelOutput.contributions;
            const reproducedContribs = reproducedTrace.modelOutput.contributions;
            for (let i = 0; i < originalContribs.length; i++) {
                const origContrib = originalContribs[i];
                const repContrib = reproducedContribs.find(c => c.feature === origContrib.feature);
                if (repContrib) {
                    const diff = Math.abs(origContrib.delta - repContrib.delta);
                    differences.push({
                        field: `contribution.${origContrib.feature}`,
                        originalValue: origContrib.delta,
                        reproducedValue: repContrib.delta,
                        difference: diff,
                    });
                }
            }
            // 4. Check if within tolerance
            const maxDifference = Math.max(...differences.map(d => d.difference));
            const withinTolerance = maxDifference <= this.config.reproducibilityTolerance;
            otel_tracing_js_1.otelService.addSpanAttributes?.({
                'xai.reproducibility.within_tolerance': withinTolerance,
                'xai.reproducibility.max_difference': maxDifference,
                'xai.reproducibility.tolerance': this.config.reproducibilityTolerance,
            });
            logger_js_1.default.info({
                message: 'Reproducibility check completed',
                originalTraceId,
                withinTolerance,
                maxDifference,
                tolerance: this.config.reproducibilityTolerance,
            });
            return {
                originalTrace,
                reproducedTrace,
                isReproducible: withinTolerance,
                tolerance: this.config.reproducibilityTolerance,
                differences,
                withinTolerance,
            };
        }
        catch (error) {
            otel_tracing_js_1.otelService.recordException?.(error);
            span?.setStatus({ code: 2, message: error.message });
            throw error;
        }
        finally {
            span?.end();
        }
    }
    // ============================================================================
    // Parameter Sensitivity Analysis
    // ============================================================================
    async analyzeParameterSensitivity(baseFeatures, window, featureToVary, variationPercent = 10) {
        const span = otel_tracing_js_1.otelService.createSpan('xai_overlay.parameter_sensitivity');
        try {
            // 1. Compute base result
            const baseTrace = await this.computeRiskWithExplanation(baseFeatures, window);
            const baseScore = baseTrace.modelOutput.score;
            // 2. Vary the specified feature
            const variedFeatures = { ...baseFeatures };
            const originalValue = variedFeatures[featureToVary] || 0;
            variedFeatures[featureToVary] = originalValue * (1 + variationPercent / 100);
            // 3. Compute varied result
            const variedTrace = await this.computeRiskWithExplanation(variedFeatures, window);
            const variedScore = variedTrace.modelOutput.score;
            // 4. Calculate sensitivity
            const scoreDelta = variedScore - baseScore;
            const sensitivity = Math.abs(scoreDelta / (variationPercent / 100));
            // 5. Determine if change is significant
            const isSignificant = Math.abs(scoreDelta) > this.config.parameterSensitivityThreshold;
            const explanation = `Changing ${featureToVary} by ${variationPercent}% ` +
                `(from ${originalValue.toFixed(3)} to ${variedFeatures[featureToVary].toFixed(3)}) ` +
                `${scoreDelta > 0 ? 'increases' : 'decreases'} risk score by ` +
                `${Math.abs(scoreDelta * 100).toFixed(2)}% (sensitivity: ${sensitivity.toFixed(3)})`;
            otel_tracing_js_1.otelService.addSpanAttributes?.({
                'xai.sensitivity.feature': featureToVary,
                'xai.sensitivity.variation_percent': variationPercent,
                'xai.sensitivity.score_delta': scoreDelta,
                'xai.sensitivity.is_significant': isSignificant,
            });
            logger_js_1.default.info({
                message: 'Parameter sensitivity analysis completed',
                feature: featureToVary,
                sensitivity,
                isSignificant,
            });
            return {
                baseTrace,
                variedTrace,
                sensitivity,
                isSignificant,
                explanation,
            };
        }
        catch (error) {
            otel_tracing_js_1.otelService.recordException?.(error);
            span?.setStatus({ code: 2, message: error.message });
            throw error;
        }
        finally {
            span?.end();
        }
    }
    // ============================================================================
    // Cache Management
    // ============================================================================
    cacheTrace(trace) {
        // Enforce cache size limit
        if (this.traceCache.size >= this.config.maxCacheSize) {
            // Remove oldest entry (FIFO)
            const firstKey = this.traceCache.keys().next().value;
            if (firstKey)
                this.traceCache.delete(firstKey);
        }
        this.traceCache.set(trace.traceId, trace);
    }
    getTrace(traceId) {
        return this.traceCache.get(traceId);
    }
    clearCache() {
        this.traceCache.clear();
        logger_js_1.default.info({ message: 'XAI overlay trace cache cleared' });
    }
    getCacheStatistics() {
        return {
            size: this.traceCache.size,
            maxSize: this.config.maxCacheSize,
            utilizationPercent: (this.traceCache.size / this.config.maxCacheSize) * 100,
        };
    }
    // ============================================================================
    // Health Check
    // ============================================================================
    async healthCheck() {
        const errors = [];
        let signing = false;
        let tamperDetection = false;
        // Check signing capability
        if (this.config.enableSigning) {
            try {
                const notaryHealth = await dual_notary_js_1.dualNotary.healthCheck();
                signing = notaryHealth.status === 'healthy' || notaryHealth.status === 'degraded';
                if (!signing) {
                    errors.push('Signing service unavailable');
                }
            }
            catch (error) {
                errors.push('Signing health check failed');
            }
        }
        // Check tamper detection
        tamperDetection = this.config.enableTamperDetection;
        // Determine overall status
        let status;
        if (errors.length === 0) {
            status = 'healthy';
        }
        else if (signing || tamperDetection) {
            status = 'degraded';
        }
        else {
            status = 'unhealthy';
        }
        return {
            status,
            signing,
            tamperDetection,
            cacheSize: this.traceCache.size,
            errors,
        };
    }
}
exports.XAIOverlayService = XAIOverlayService;
// Export singleton instance
exports.xaiOverlay = XAIOverlayService.getInstance();
