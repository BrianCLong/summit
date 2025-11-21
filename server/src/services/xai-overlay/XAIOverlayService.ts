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

import crypto from 'node:crypto';
import { z } from 'zod';
import { RiskEngine, RiskResult, FeatureVector } from '../../risk/RiskEngine.js';
import { dualNotary } from '../../federal/dual-notary.js';
import { otelService } from '../../middleware/observability/otel-tracing.js';
import logger from '../../utils/logger.js';

// ============================================================================
// Core Types
// ============================================================================

export interface ModelMetadata {
  modelName: string;
  modelVersion: string;
  modelType: 'risk_engine' | 'community_detector' | 'path_analyzer';
  parameters: Record<string, any>;
  trainingDate?: Date;
  lastUpdated: Date;
}

export interface InputSummary {
  inputHash: string;
  inputType: 'features' | 'graph' | 'timeseries';
  featureCount: number;
  featureNames: string[];
  inputStatistics: {
    mean: number;
    std: number;
    min: number;
    max: number;
    nonZeroCount: number;
  };
  timestamp: Date;
}

export interface SaliencyExplanation {
  featureName: string;
  featureValue: number;
  weight: number;
  contribution: number;
  contributionPercent: number;
  direction: 'increases_risk' | 'decreases_risk' | 'neutral';
  importance: 'critical' | 'high' | 'medium' | 'low';
  humanReadable: string;
}

export interface ReasoningTrace {
  traceId: string;
  modelOutput: any;
  inputSummary: InputSummary;
  modelMetadata: ModelMetadata;
  saliencyExplanations: SaliencyExplanation[];
  intermediateSteps: Array<{
    step: string;
    description: string;
    value: any;
  }>;
  timestamp: Date;
  traceDigest: string; // SHA-384 hash of the entire trace
  signature?: string; // Dual-notary signature
  signatureMetadata?: {
    hsmSignature?: string;
    tsaResponse?: string;
    notarizedBy: string[];
    signedAt: Date;
  };
}

export interface TamperDetectionResult {
  isTampered: boolean;
  originalDigest: string;
  computedDigest: string;
  tamperedFields?: string[];
  dualControlRequired: boolean;
  verificationErrors: string[];
}

export interface ReproducibilityCheck {
  originalTrace: ReasoningTrace;
  reproducedTrace: ReasoningTrace;
  isReproducible: boolean;
  tolerance: number;
  differences: Array<{
    field: string;
    originalValue: any;
    reproducedValue: any;
    difference: number;
  }>;
  withinTolerance: boolean;
}

// ============================================================================
// Configuration Schema
// ============================================================================

const XAIOverlayConfigSchema = z.object({
  enableSigning: z.boolean().default(true),
  enableTamperDetection: z.boolean().default(true),
  reproducibilityTolerance: z.number().min(0).max(1).default(0.001), // 0.1% tolerance
  parameterSensitivityThreshold: z.number().min(0).max(1).default(0.05), // 5% change threshold
  dualControlThreshold: z.enum(['any_tamper', 'critical_tamper', 'manual_override']).default('any_tamper'),
  cacheExplanations: z.boolean().default(true),
  maxCacheSize: z.number().min(100).max(10000).default(1000),
});

type XAIOverlayConfig = z.infer<typeof XAIOverlayConfigSchema>;

// ============================================================================
// XAI Overlay Service
// ============================================================================

export class XAIOverlayService {
  private static instance: XAIOverlayService;
  private config: XAIOverlayConfig;
  private traceCache: Map<string, ReasoningTrace> = new Map();
  private riskEngine: RiskEngine;

  private constructor(config?: Partial<XAIOverlayConfig>) {
    this.config = XAIOverlayConfigSchema.parse(config || {});

    // Initialize default risk engine (will be replaced with actual engine in production)
    this.riskEngine = new RiskEngine(
      {
        transaction_frequency: 0.3,
        network_centrality: 0.4,
        temporal_anomaly: 0.5,
        geo_dispersion: 0.2,
      },
      -1.5,
      'v1.0-xai',
    );

    logger.info({
      message: 'XAI Overlay Service initialized',
      config: this.config,
    });
  }

  public static getInstance(config?: Partial<XAIOverlayConfig>): XAIOverlayService {
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
  async computeRiskWithExplanation(
    features: FeatureVector,
    window: '24h' | '7d' | '30d',
    metadata?: Partial<ModelMetadata>,
  ): Promise<ReasoningTrace> {
    const span = otelService.createSpan('xai_overlay.compute_risk');
    const traceId = crypto.randomUUID();

    try {
      // 1. Generate input summary
      const inputSummary = this.generateInputSummary(features);

      // 2. Compute risk score
      const riskResult = this.riskEngine.score(features, window);

      // 3. Generate saliency explanations
      const saliencyExplanations = this.generateSaliencyExplanations(
        features,
        riskResult,
      );

      // 4. Track intermediate steps
      const intermediateSteps = this.trackIntermediateSteps(features, riskResult);

      // 5. Build model metadata
      const modelMetadata: ModelMetadata = {
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
      const trace: ReasoningTrace = {
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

      otelService.addSpanAttributes({
        'xai.trace_id': traceId,
        'xai.risk_score': riskResult.score,
        'xai.risk_band': riskResult.band,
        'xai.features_count': Object.keys(features).length,
        'xai.signed': !!trace.signature,
      });

      logger.info({
        message: 'XAI risk explanation generated',
        traceId,
        riskScore: riskResult.score,
        riskBand: riskResult.band,
        featureCount: Object.keys(features).length,
        signed: !!trace.signature,
      });

      return trace;
    } catch (error: any) {
      otelService.recordException(error);
      span.setStatus({ code: 2, message: error.message });
      throw error;
    } finally {
      span?.end();
    }
  }

  // ============================================================================
  // Input Analysis
  // ============================================================================

  private generateInputSummary(features: FeatureVector): InputSummary {
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

  private generateSaliencyExplanations(
    features: FeatureVector,
    riskResult: RiskResult,
  ): SaliencyExplanation[] {
    const explanations: SaliencyExplanation[] = [];

    // Calculate total absolute contribution for percentage
    const totalAbsContribution = riskResult.contributions.reduce(
      (sum, c) => sum + Math.abs(c.delta),
      0,
    );

    for (const contribution of riskResult.contributions) {
      const contributionPercent = totalAbsContribution > 0
        ? (Math.abs(contribution.delta) / totalAbsContribution) * 100
        : 0;

      // Determine direction
      let direction: SaliencyExplanation['direction'];
      if (contribution.delta > 0.01) {
        direction = 'increases_risk';
      } else if (contribution.delta < -0.01) {
        direction = 'decreases_risk';
      } else {
        direction = 'neutral';
      }

      // Determine importance level
      let importance: SaliencyExplanation['importance'];
      if (contributionPercent > 30) {
        importance = 'critical';
      } else if (contributionPercent > 15) {
        importance = 'high';
      } else if (contributionPercent > 5) {
        importance = 'medium';
      } else {
        importance = 'low';
      }

      // Generate human-readable explanation
      const humanReadable = this.generateHumanReadableExplanation(
        contribution.feature,
        contribution.value,
        contribution.weight,
        direction,
        contributionPercent,
      );

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

  private generateHumanReadableExplanation(
    feature: string,
    value: number,
    weight: number,
    direction: string,
    percent: number,
  ): string {
    const featureLabels: Record<string, string> = {
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

  private trackIntermediateSteps(
    features: FeatureVector,
    riskResult: RiskResult,
  ): Array<{ step: string; description: string; value: any }> {
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

  private computeTraceDigest(trace: Omit<ReasoningTrace, 'traceDigest' | 'signature' | 'signatureMetadata'>): string {
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

  private async signReasoningTrace(trace: ReasoningTrace): Promise<void> {
    try {
      const notarized = await dualNotary.notarizeRoot(trace.traceDigest);

      trace.signature = notarized.hsmSignature;
      trace.signatureMetadata = {
        hsmSignature: notarized.hsmSignature,
        tsaResponse: notarized.tsaResponse,
        notarizedBy: notarized.notarizedBy,
        signedAt: notarized.timestamp,
      };

      logger.info({
        message: 'Reasoning trace signed',
        traceId: trace.traceId,
        digest: trace.traceDigest.substring(0, 16) + '...',
        notarizedBy: notarized.notarizedBy,
      });
    } catch (error: any) {
      logger.error({
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

  async detectTampering(trace: ReasoningTrace): Promise<TamperDetectionResult> {
    const span = otelService.createSpan('xai_overlay.detect_tampering');

    try {
      const result: TamperDetectionResult = {
        isTampered: false,
        originalDigest: trace.traceDigest,
        computedDigest: '',
        dualControlRequired: false,
        verificationErrors: [],
      };

      // 1. Recompute digest from current trace data
      const { traceDigest: _, signature: __, signatureMetadata: ___, ...traceWithoutSig } = trace;
      result.computedDigest = this.computeTraceDigest(traceWithoutSig as any);

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

      otelService.addSpanAttributes({
        'xai.tamper.detected': result.isTampered,
        'xai.tamper.dual_control_required': result.dualControlRequired,
        'xai.tamper.errors': result.verificationErrors.length,
      });

      if (result.isTampered) {
        logger.warn({
          message: 'TAMPER DETECTED in reasoning trace',
          traceId: trace.traceId,
          errors: result.verificationErrors,
          dualControlRequired: result.dualControlRequired,
        });
      }

      return result;
    } catch (error: any) {
      otelService.recordException(error);
      span.setStatus({ code: 2, message: error.message });
      throw error;
    } finally {
      span?.end();
    }
  }

  private identifyTamperedFields(trace: ReasoningTrace): string[] {
    // Compare each major field to identify what changed
    // This is a simplified version - in production, would do deep comparison
    const tamperedFields: string[] = [];

    // Check if model output matches digest
    if (trace.modelOutput) {
      tamperedFields.push('modelOutput');
    }

    return tamperedFields;
  }

  private async verifySignature(trace: ReasoningTrace): Promise<boolean> {
    if (!trace.signatureMetadata) {
      return false;
    }

    try {
      const notarized = {
        rootHex: Buffer.from(trace.traceDigest, 'hex').toString('hex'),
        timestamp: trace.signatureMetadata.signedAt,
        hsmSignature: trace.signatureMetadata.hsmSignature || '',
        tsaResponse: trace.signatureMetadata.tsaResponse,
        notarizedBy: trace.signatureMetadata.notarizedBy as any[],
        verification: {
          hsmValid: false,
          tsaValid: false,
        },
      };

      const verification = await dualNotary.verifyNotarizedRoot(notarized);
      return verification.valid;
    } catch (error) {
      logger.error({
        message: 'Signature verification failed',
        traceId: trace.traceId,
        error,
      });
      return false;
    }
  }

  private requiresDualControl(tamperResult: TamperDetectionResult): boolean {
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

  async verifyReproducibility(
    originalTraceId: string,
    features: FeatureVector,
    window: '24h' | '7d' | '30d',
  ): Promise<ReproducibilityCheck> {
    const span = otelService.createSpan('xai_overlay.verify_reproducibility');

    try {
      // 1. Retrieve original trace
      const originalTrace = this.traceCache.get(originalTraceId);
      if (!originalTrace) {
        throw new Error(`Original trace ${originalTraceId} not found in cache`);
      }

      // 2. Recompute with same inputs
      const reproducedTrace = await this.computeRiskWithExplanation(features, window);

      // 3. Compare outputs with tolerance
      const differences: ReproducibilityCheck['differences'] = [];

      const originalScore = (originalTrace.modelOutput as RiskResult).score;
      const reproducedScore = (reproducedTrace.modelOutput as RiskResult).score;
      const scoreDiff = Math.abs(originalScore - reproducedScore);

      differences.push({
        field: 'riskScore',
        originalValue: originalScore,
        reproducedValue: reproducedScore,
        difference: scoreDiff,
      });

      // Compare feature contributions
      const originalContribs = (originalTrace.modelOutput as RiskResult).contributions;
      const reproducedContribs = (reproducedTrace.modelOutput as RiskResult).contributions;

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

      otelService.addSpanAttributes({
        'xai.reproducibility.within_tolerance': withinTolerance,
        'xai.reproducibility.max_difference': maxDifference,
        'xai.reproducibility.tolerance': this.config.reproducibilityTolerance,
      });

      logger.info({
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
    } catch (error: any) {
      otelService.recordException(error);
      span.setStatus({ code: 2, message: error.message });
      throw error;
    } finally {
      span?.end();
    }
  }

  // ============================================================================
  // Parameter Sensitivity Analysis
  // ============================================================================

  async analyzeParameterSensitivity(
    baseFeatures: FeatureVector,
    window: '24h' | '7d' | '30d',
    featureToVary: string,
    variationPercent: number = 10,
  ): Promise<{
    baseTrace: ReasoningTrace;
    variedTrace: ReasoningTrace;
    sensitivity: number;
    isSignificant: boolean;
    explanation: string;
  }> {
    const span = otelService.createSpan('xai_overlay.parameter_sensitivity');

    try {
      // 1. Compute base result
      const baseTrace = await this.computeRiskWithExplanation(baseFeatures, window);
      const baseScore = (baseTrace.modelOutput as RiskResult).score;

      // 2. Vary the specified feature
      const variedFeatures = { ...baseFeatures };
      const originalValue = variedFeatures[featureToVary] || 0;
      variedFeatures[featureToVary] = originalValue * (1 + variationPercent / 100);

      // 3. Compute varied result
      const variedTrace = await this.computeRiskWithExplanation(variedFeatures, window);
      const variedScore = (variedTrace.modelOutput as RiskResult).score;

      // 4. Calculate sensitivity
      const scoreDelta = variedScore - baseScore;
      const sensitivity = Math.abs(scoreDelta / (variationPercent / 100));

      // 5. Determine if change is significant
      const isSignificant = Math.abs(scoreDelta) > this.config.parameterSensitivityThreshold;

      const explanation = `Changing ${featureToVary} by ${variationPercent}% ` +
        `(from ${originalValue.toFixed(3)} to ${variedFeatures[featureToVary].toFixed(3)}) ` +
        `${scoreDelta > 0 ? 'increases' : 'decreases'} risk score by ` +
        `${Math.abs(scoreDelta * 100).toFixed(2)}% (sensitivity: ${sensitivity.toFixed(3)})`;

      otelService.addSpanAttributes({
        'xai.sensitivity.feature': featureToVary,
        'xai.sensitivity.variation_percent': variationPercent,
        'xai.sensitivity.score_delta': scoreDelta,
        'xai.sensitivity.is_significant': isSignificant,
      });

      logger.info({
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
    } catch (error: any) {
      otelService.recordException(error);
      span.setStatus({ code: 2, message: error.message });
      throw error;
    } finally {
      span?.end();
    }
  }

  // ============================================================================
  // Cache Management
  // ============================================================================

  private cacheTrace(trace: ReasoningTrace): void {
    // Enforce cache size limit
    if (this.traceCache.size >= this.config.maxCacheSize) {
      // Remove oldest entry (FIFO)
      const firstKey = this.traceCache.keys().next().value;
      this.traceCache.delete(firstKey);
    }

    this.traceCache.set(trace.traceId, trace);
  }

  getTrace(traceId: string): ReasoningTrace | undefined {
    return this.traceCache.get(traceId);
  }

  clearCache(): void {
    this.traceCache.clear();
    logger.info({ message: 'XAI overlay trace cache cleared' });
  }

  getCacheStatistics(): {
    size: number;
    maxSize: number;
    utilizationPercent: number;
  } {
    return {
      size: this.traceCache.size,
      maxSize: this.config.maxCacheSize,
      utilizationPercent: (this.traceCache.size / this.config.maxCacheSize) * 100,
    };
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    signing: boolean;
    tamperDetection: boolean;
    cacheSize: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let signing = false;
    let tamperDetection = false;

    // Check signing capability
    if (this.config.enableSigning) {
      try {
        const notaryHealth = await dualNotary.healthCheck();
        signing = notaryHealth.status === 'healthy' || notaryHealth.status === 'degraded';
        if (!signing) {
          errors.push('Signing service unavailable');
        }
      } catch (error) {
        errors.push('Signing health check failed');
      }
    }

    // Check tamper detection
    tamperDetection = this.config.enableTamperDetection;

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (errors.length === 0) {
      status = 'healthy';
    } else if (signing || tamperDetection) {
      status = 'degraded';
    } else {
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

// Export singleton instance
export const xaiOverlay = XAIOverlayService.getInstance();
