"use strict";
/**
 * GraphQL Resolvers for XAI Overlay Service
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.xaiOverlayResolvers = void 0;
const XAIOverlayService_js_1 = require("../../services/xai-overlay/XAIOverlayService.js");
const ExternalVerifier_js_1 = require("../../services/xai-overlay/ExternalVerifier.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
// ============================================================================
// Helper Functions
// ============================================================================
function convertFeatureVectorInput(input) {
    const features = {};
    if (input.transactionFrequency !== undefined) {
        features.transaction_frequency = input.transactionFrequency;
    }
    if (input.networkCentrality !== undefined) {
        features.network_centrality = input.networkCentrality;
    }
    if (input.temporalAnomaly !== undefined) {
        features.temporal_anomaly = input.temporalAnomaly;
    }
    if (input.geoDispersion !== undefined) {
        features.geo_dispersion = input.geoDispersion;
    }
    // Add custom features
    if (input.customFeatures && Array.isArray(input.customFeatures)) {
        for (const customFeature of input.customFeatures) {
            features[customFeature.name] = customFeature.value;
        }
    }
    return features;
}
function convertRiskWindow(window) {
    switch (window) {
        case 'WINDOW_24H':
            return '24h';
        case 'WINDOW_7D':
            return '7d';
        case 'WINDOW_30D':
            return '30d';
        default:
            return '24h';
    }
}
function convertRiskWindowToGraphQL(window) {
    switch (window) {
        case '24h':
            return 'WINDOW_24H';
        case '7d':
            return 'WINDOW_7D';
        case '30d':
            return 'WINDOW_30D';
    }
}
function convertRiskBandToGraphQL(band) {
    return band.toUpperCase();
}
// ============================================================================
// Resolvers
// ============================================================================
exports.xaiOverlayResolvers = {
    Query: {
        /**
         * Get a reasoning trace by ID
         */
        getReasoningTrace: async (_parent, args, _context) => {
            logger_js_1.default.info({ message: 'Fetching reasoning trace', traceId: args.traceId });
            const trace = XAIOverlayService_js_1.xaiOverlay.getTrace(args.traceId);
            if (!trace) {
                throw new Error(`Reasoning trace ${args.traceId} not found`);
            }
            return trace;
        },
        /**
         * Verify a trace
         */
        verifyTrace: async (_parent, args, _context) => {
            logger_js_1.default.info({
                message: 'Verifying trace',
                traceId: args.traceId,
                level: args.verificationLevel,
            });
            const trace = XAIOverlayService_js_1.xaiOverlay.getTrace(args.traceId);
            if (!trace) {
                throw new Error(`Reasoning trace ${args.traceId} not found`);
            }
            const level = args.verificationLevel.toLowerCase();
            const result = await ExternalVerifier_js_1.externalVerifier.verifyTrace({
                trace,
                verificationLevel: level,
            });
            return result;
        },
        /**
         * Get XAI overlay statistics
         */
        xaiOverlayStats: async () => {
            const stats = XAIOverlayService_js_1.xaiOverlay.getCacheStatistics();
            return {
                cacheSize: stats.size,
                maxCacheSize: stats.maxSize,
                utilizationPercent: stats.utilizationPercent,
                tracesGenerated: stats.size, // Simplified
                verificationsPerformed: 0, // Would track separately
            };
        },
        /**
         * Health check
         */
        xaiOverlayHealth: async () => {
            const health = await XAIOverlayService_js_1.xaiOverlay.healthCheck();
            return {
                status: health.status.toUpperCase(),
                signing: health.signing,
                tamperDetection: health.tamperDetection,
                cacheSize: health.cacheSize,
                errors: health.errors,
            };
        },
    },
    Mutation: {
        /**
         * Compute risk with explanation
         */
        computeRiskWithExplanation: async (_parent, args, _context) => {
            logger_js_1.default.info({ message: 'Computing risk with XAI explanation' });
            const features = convertFeatureVectorInput(args.input.features);
            const window = convertRiskWindow(args.input.window);
            const metadata = args.input.metadata || {};
            const trace = await XAIOverlayService_js_1.xaiOverlay.computeRiskWithExplanation(features, window, metadata);
            return trace;
        },
        /**
         * Verify reproducibility
         */
        verifyReproducibility: async (_parent, args, _context) => {
            logger_js_1.default.info({
                message: 'Verifying reproducibility',
                originalTraceId: args.originalTraceId,
            });
            const features = convertFeatureVectorInput(args.features);
            const window = convertRiskWindow(args.window);
            const result = await XAIOverlayService_js_1.xaiOverlay.verifyReproducibility(args.originalTraceId, features, window);
            return result;
        },
        /**
         * Analyze parameter sensitivity
         */
        analyzeParameterSensitivity: async (_parent, args, _context) => {
            logger_js_1.default.info({
                message: 'Analyzing parameter sensitivity',
                feature: args.featureToVary,
            });
            const features = convertFeatureVectorInput(args.baseFeatures);
            const window = convertRiskWindow(args.window);
            const result = await XAIOverlayService_js_1.xaiOverlay.analyzeParameterSensitivity(features, window, args.featureToVary, args.variationPercent);
            return result;
        },
        /**
         * Detect tampering
         */
        detectTampering: async (_parent, args, _context) => {
            logger_js_1.default.info({ message: 'Detecting tampering', traceId: args.traceId });
            const trace = XAIOverlayService_js_1.xaiOverlay.getTrace(args.traceId);
            if (!trace) {
                throw new Error(`Reasoning trace ${args.traceId} not found`);
            }
            const result = await XAIOverlayService_js_1.xaiOverlay.detectTampering(trace);
            return result;
        },
        /**
         * Perform parameter sweep
         */
        performParameterSweep: async (_parent, args, _context) => {
            logger_js_1.default.info({
                message: 'Performing parameter sweep',
                feature: args.input.featureToSweep,
            });
            const baseFeatures = convertFeatureVectorInput(args.input.baseFeatures);
            const window = convertRiskWindow(args.input.window);
            // Create compute function for the sweep
            const computeFunction = async (features) => {
                const trace = await XAIOverlayService_js_1.xaiOverlay.computeRiskWithExplanation(features, window);
                return trace.modelOutput.score;
            };
            const result = await ExternalVerifier_js_1.externalVerifier.performParameterSweep(baseFeatures, args.input.featureToSweep, args.input.minValue, args.input.maxValue, args.input.steps, computeFunction);
            return result;
        },
        /**
         * Clear cache
         */
        clearXAIOverlayCache: async () => {
            logger_js_1.default.info({ message: 'Clearing XAI overlay cache' });
            XAIOverlayService_js_1.xaiOverlay.clearCache();
            return true;
        },
    },
    // ============================================================================
    // Type Resolvers
    // ============================================================================
    RiskResult: {
        band: (parent) => convertRiskBandToGraphQL(parent.band),
        window: (parent) => convertRiskWindowToGraphQL(parent.window),
        computedAt: (parent) => parent.computedAt,
    },
    SaliencyExplanation: {
        direction: (parent) => parent.direction.toUpperCase(),
        importance: (parent) => parent.importance.toUpperCase(),
    },
    ModelMetadata: {
        modelType: (parent) => parent.modelType.toUpperCase(),
    },
    InputSummary: {
        inputType: (parent) => parent.inputType.toUpperCase(),
    },
    VerificationChecks: {
        digestIntegrity: (parent) => parent.digestIntegrity,
        signatureValidity: (parent) => parent.signatureValidity,
        reproducibility: (parent) => parent.reproducibility,
        parameterConsistency: (parent) => parent.parameterConsistency,
        modelMetadata: (parent) => parent.modelMetadata,
    },
    CheckResult: {
        severity: (parent) => parent.severity.toUpperCase(),
    },
};
exports.default = exports.xaiOverlayResolvers;
