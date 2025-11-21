/**
 * GraphQL Resolvers for XAI Overlay Service
 */

import { xaiOverlay } from '../../services/xai-overlay/XAIOverlayService.js';
import { externalVerifier } from '../../services/xai-overlay/ExternalVerifier.js';
import { FeatureVector } from '../../risk/RiskEngine.js';
import logger from '../../utils/logger.js';

// ============================================================================
// Helper Functions
// ============================================================================

function convertFeatureVectorInput(input: any): FeatureVector {
  const features: FeatureVector = {};

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

function convertRiskWindow(window: string): '24h' | '7d' | '30d' {
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

function convertRiskWindowToGraphQL(window: '24h' | '7d' | '30d'): string {
  switch (window) {
    case '24h':
      return 'WINDOW_24H';
    case '7d':
      return 'WINDOW_7D';
    case '30d':
      return 'WINDOW_30D';
  }
}

function convertRiskBandToGraphQL(band: string): string {
  return band.toUpperCase();
}

// ============================================================================
// Resolvers
// ============================================================================

export const xaiOverlayResolvers = {
  Query: {
    /**
     * Get a reasoning trace by ID
     */
    getReasoningTrace: async (_parent: any, args: { traceId: string }, _context: any) => {
      logger.info({ message: 'Fetching reasoning trace', traceId: args.traceId });

      const trace = xaiOverlay.getTrace(args.traceId);

      if (!trace) {
        throw new Error(`Reasoning trace ${args.traceId} not found`);
      }

      return trace;
    },

    /**
     * Verify a trace
     */
    verifyTrace: async (
      _parent: any,
      args: { traceId: string; verificationLevel: string },
      _context: any,
    ) => {
      logger.info({
        message: 'Verifying trace',
        traceId: args.traceId,
        level: args.verificationLevel,
      });

      const trace = xaiOverlay.getTrace(args.traceId);

      if (!trace) {
        throw new Error(`Reasoning trace ${args.traceId} not found`);
      }

      const level = args.verificationLevel.toLowerCase() as 'basic' | 'standard' | 'comprehensive';

      const result = await externalVerifier.verifyTrace({
        trace,
        verificationLevel: level,
      });

      return result;
    },

    /**
     * Get XAI overlay statistics
     */
    xaiOverlayStats: async () => {
      const stats = xaiOverlay.getCacheStatistics();

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
      const health = await xaiOverlay.healthCheck();

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
    computeRiskWithExplanation: async (_parent: any, args: any, _context: any) => {
      logger.info({ message: 'Computing risk with XAI explanation' });

      const features = convertFeatureVectorInput(args.input.features);
      const window = convertRiskWindow(args.input.window);

      const metadata = args.input.metadata || {};

      const trace = await xaiOverlay.computeRiskWithExplanation(
        features,
        window,
        metadata,
      );

      return trace;
    },

    /**
     * Verify reproducibility
     */
    verifyReproducibility: async (_parent: any, args: any, _context: any) => {
      logger.info({
        message: 'Verifying reproducibility',
        originalTraceId: args.originalTraceId,
      });

      const features = convertFeatureVectorInput(args.features);
      const window = convertRiskWindow(args.window);

      const result = await xaiOverlay.verifyReproducibility(
        args.originalTraceId,
        features,
        window,
      );

      return result;
    },

    /**
     * Analyze parameter sensitivity
     */
    analyzeParameterSensitivity: async (_parent: any, args: any, _context: any) => {
      logger.info({
        message: 'Analyzing parameter sensitivity',
        feature: args.featureToVary,
      });

      const features = convertFeatureVectorInput(args.baseFeatures);
      const window = convertRiskWindow(args.window);

      const result = await xaiOverlay.analyzeParameterSensitivity(
        features,
        window,
        args.featureToVary,
        args.variationPercent,
      );

      return result;
    },

    /**
     * Detect tampering
     */
    detectTampering: async (_parent: any, args: { traceId: string }, _context: any) => {
      logger.info({ message: 'Detecting tampering', traceId: args.traceId });

      const trace = xaiOverlay.getTrace(args.traceId);

      if (!trace) {
        throw new Error(`Reasoning trace ${args.traceId} not found`);
      }

      const result = await xaiOverlay.detectTampering(trace);

      return result;
    },

    /**
     * Perform parameter sweep
     */
    performParameterSweep: async (_parent: any, args: any, _context: any) => {
      logger.info({
        message: 'Performing parameter sweep',
        feature: args.input.featureToSweep,
      });

      const baseFeatures = convertFeatureVectorInput(args.input.baseFeatures);
      const window = convertRiskWindow(args.input.window);

      // Create compute function for the sweep
      const computeFunction = async (features: FeatureVector): Promise<number> => {
        const trace = await xaiOverlay.computeRiskWithExplanation(features, window);
        return (trace.modelOutput as any).score;
      };

      const result = await externalVerifier.performParameterSweep(
        baseFeatures,
        args.input.featureToSweep,
        args.input.minValue,
        args.input.maxValue,
        args.input.steps,
        computeFunction,
      );

      return result;
    },

    /**
     * Clear cache
     */
    clearXAIOverlayCache: async () => {
      logger.info({ message: 'Clearing XAI overlay cache' });
      xaiOverlay.clearCache();
      return true;
    },
  },

  // ============================================================================
  // Type Resolvers
  // ============================================================================

  RiskResult: {
    band: (parent: any) => convertRiskBandToGraphQL(parent.band),
    window: (parent: any) => convertRiskWindowToGraphQL(parent.window),
    computedAt: (parent: any) => parent.computedAt,
  },

  SaliencyExplanation: {
    direction: (parent: any) => parent.direction.toUpperCase(),
    importance: (parent: any) => parent.importance.toUpperCase(),
  },

  ModelMetadata: {
    modelType: (parent: any) => parent.modelType.toUpperCase(),
  },

  InputSummary: {
    inputType: (parent: any) => parent.inputType.toUpperCase(),
  },

  VerificationChecks: {
    digestIntegrity: (parent: any) => parent.digestIntegrity,
    signatureValidity: (parent: any) => parent.signatureValidity,
    reproducibility: (parent: any) => parent.reproducibility,
    parameterConsistency: (parent: any) => parent.parameterConsistency,
    modelMetadata: (parent: any) => parent.modelMetadata,
  },

  CheckResult: {
    severity: (parent: any) => parent.severity.toUpperCase(),
  },
};

export default xaiOverlayResolvers;
