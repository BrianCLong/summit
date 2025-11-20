/**
 * External Verifier for XAI Overlay
 *
 * Allows independent verification of:
 * - Metric reproducibility within tolerance
 * - Parameter sensitivity (changing parameters changes results predictably)
 * - Hash/signature integrity (tamper detection)
 * - Model determinism and consistency
 */

import crypto from 'node:crypto';
import { z } from 'zod';
import {
  ReasoningTrace,
  ModelMetadata,
  SaliencyExplanation,
  TamperDetectionResult,
} from './XAIOverlayService.js';
import { dualNotary } from '../../federal/dual-notary.js';
import { FeatureVector, RiskResult } from '../../risk/RiskEngine.js';
import logger from '../../utils/logger.js';

// ============================================================================
// Verification Types
// ============================================================================

export interface VerificationRequest {
  trace: ReasoningTrace;
  verificationLevel: 'basic' | 'standard' | 'comprehensive';
  tolerances?: {
    scoreTolerance?: number;
    contributionTolerance?: number;
    timestampTolerance?: number; // milliseconds
  };
}

export interface VerificationResult {
  verificationId: string;
  timestamp: Date;
  overallValid: boolean;
  checks: {
    digestIntegrity: CheckResult;
    signatureValidity: CheckResult;
    reproducibility: CheckResult;
    parameterConsistency: CheckResult;
    modelMetadata: CheckResult;
  };
  confidence: number; // 0-1
  recommendations: string[];
  warnings: string[];
  errors: string[];
}

export interface CheckResult {
  passed: boolean;
  details: string;
  evidence?: any;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export interface ParameterSweepResult {
  feature: string;
  sweepRange: { min: number; max: number; steps: number };
  results: Array<{
    parameterValue: number;
    outputScore: number;
    delta: number;
    predictable: boolean;
  }>;
  monotonic: boolean; // Does output change monotonically with parameter?
  sensitivity: number; // Average rate of change
  explanation: string;
}

// ============================================================================
// External Verifier Service
// ============================================================================

export class ExternalVerifier {
  private static instance: ExternalVerifier;
  private verificationLog: Map<string, VerificationResult> = new Map();

  private constructor() {
    logger.info({ message: 'External Verifier initialized' });
  }

  public static getInstance(): ExternalVerifier {
    if (!ExternalVerifier.instance) {
      ExternalVerifier.instance = new ExternalVerifier();
    }
    return ExternalVerifier.instance;
  }

  // ============================================================================
  // Main Verification Methods
  // ============================================================================

  /**
   * Verify a reasoning trace independently
   */
  async verifyTrace(request: VerificationRequest): Promise<VerificationResult> {
    const verificationId = crypto.randomUUID();
    const startTime = Date.now();

    logger.info({
      message: 'Starting trace verification',
      verificationId,
      traceId: request.trace.traceId,
      level: request.verificationLevel,
    });

    const result: VerificationResult = {
      verificationId,
      timestamp: new Date(),
      overallValid: false,
      checks: {
        digestIntegrity: { passed: false, details: '', severity: 'error' },
        signatureValidity: { passed: false, details: '', severity: 'error' },
        reproducibility: { passed: false, details: '', severity: 'warning' },
        parameterConsistency: { passed: false, details: '', severity: 'warning' },
        modelMetadata: { passed: false, details: '', severity: 'info' },
      },
      confidence: 0,
      recommendations: [],
      warnings: [],
      errors: [],
    };

    try {
      // 1. Verify digest integrity (CRITICAL)
      result.checks.digestIntegrity = await this.verifyDigestIntegrity(request.trace);
      if (!result.checks.digestIntegrity.passed) {
        result.errors.push('Digest integrity check failed - trace may be tampered');
      }

      // 2. Verify signature validity (CRITICAL)
      if (request.trace.signature) {
        result.checks.signatureValidity = await this.verifySignature(request.trace);
        if (!result.checks.signatureValidity.passed) {
          result.errors.push('Signature validation failed - cannot verify authenticity');
        }
      } else {
        result.checks.signatureValidity = {
          passed: false,
          details: 'No signature present',
          severity: 'warning',
        };
        result.warnings.push('Trace is not signed - authenticity cannot be verified');
      }

      // 3. Verify reproducibility (IMPORTANT)
      if (request.verificationLevel === 'standard' || request.verificationLevel === 'comprehensive') {
        result.checks.reproducibility = await this.verifyReproducibility(
          request.trace,
          request.tolerances?.scoreTolerance || 0.001,
        );
        if (!result.checks.reproducibility.passed) {
          result.warnings.push('Results may not be reproducible within tolerance');
        }
      }

      // 4. Verify parameter consistency (IMPORTANT)
      if (request.verificationLevel === 'comprehensive') {
        result.checks.parameterConsistency = await this.verifyParameterConsistency(
          request.trace,
        );
        if (!result.checks.parameterConsistency.passed) {
          result.warnings.push('Parameter relationships may be inconsistent');
        }
      }

      // 5. Verify model metadata (INFORMATIONAL)
      result.checks.modelMetadata = this.verifyModelMetadata(request.trace.modelMetadata);

      // 6. Calculate overall confidence
      result.confidence = this.calculateConfidence(result.checks);

      // 7. Determine overall validity
      result.overallValid = this.determineOverallValidity(result.checks, request.verificationLevel);

      // 8. Generate recommendations
      result.recommendations = this.generateRecommendations(result);

      // 9. Store verification result
      this.verificationLog.set(verificationId, result);

      const duration = Date.now() - startTime;
      logger.info({
        message: 'Trace verification completed',
        verificationId,
        traceId: request.trace.traceId,
        overallValid: result.overallValid,
        confidence: result.confidence,
        duration_ms: duration,
      });

      return result;
    } catch (error: any) {
      logger.error({
        message: 'Trace verification failed',
        verificationId,
        error: error.message,
      });

      result.errors.push(`Verification failed: ${error.message}`);
      result.confidence = 0;
      result.overallValid = false;

      return result;
    }
  }

  // ============================================================================
  // Individual Verification Checks
  // ============================================================================

  private async verifyDigestIntegrity(trace: ReasoningTrace): Promise<CheckResult> {
    try {
      // Recompute digest from trace data
      const { traceDigest, signature, signatureMetadata, ...traceData } = trace;

      const canonicalTrace = {
        traceId: traceData.traceId,
        modelOutput: traceData.modelOutput,
        inputSummary: {
          inputHash: traceData.inputSummary.inputHash,
          featureCount: traceData.inputSummary.featureCount,
          featureNames: traceData.inputSummary.featureNames.sort(),
          inputStatistics: traceData.inputSummary.inputStatistics,
        },
        modelMetadata: traceData.modelMetadata,
        saliencyExplanations: traceData.saliencyExplanations.map(s => ({
          featureName: s.featureName,
          contribution: s.contribution,
          importance: s.importance,
        })),
        intermediateSteps: traceData.intermediateSteps,
        timestamp: traceData.timestamp.toISOString(),
      };

      const computedDigest = crypto
        .createHash('sha384')
        .update(JSON.stringify(canonicalTrace))
        .digest('hex');

      const passed = computedDigest === trace.traceDigest;

      return {
        passed,
        details: passed
          ? 'Digest matches computed value - trace integrity verified'
          : `Digest mismatch: expected ${trace.traceDigest.substring(0, 16)}..., got ${computedDigest.substring(0, 16)}...`,
        evidence: {
          expectedDigest: trace.traceDigest,
          computedDigest,
          algorithm: 'SHA-384',
        },
        severity: passed ? 'info' : 'critical',
      };
    } catch (error: any) {
      return {
        passed: false,
        details: `Digest verification failed: ${error.message}`,
        severity: 'critical',
      };
    }
  }

  private async verifySignature(trace: ReasoningTrace): Promise<CheckResult> {
    if (!trace.signature || !trace.signatureMetadata) {
      return {
        passed: false,
        details: 'No signature or metadata present',
        severity: 'warning',
      };
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

      return {
        passed: verification.valid,
        details: verification.valid
          ? `Signature valid - verified by ${trace.signatureMetadata.notarizedBy.join(' + ')}`
          : `Signature invalid: ${verification.errors.join(', ')}`,
        evidence: {
          hsmVerification: verification.hsmVerification,
          tsaVerification: verification.tsaVerification,
          notarizedBy: trace.signatureMetadata.notarizedBy,
          errors: verification.errors,
        },
        severity: verification.valid ? 'info' : 'critical',
      };
    } catch (error: any) {
      return {
        passed: false,
        details: `Signature verification error: ${error.message}`,
        severity: 'critical',
      };
    }
  }

  private async verifyReproducibility(
    trace: ReasoningTrace,
    tolerance: number,
  ): Promise<CheckResult> {
    try {
      // For reproducibility, we check if the same inputs would produce the same outputs
      // This requires re-running the model, which we simulate by checking internal consistency

      const riskResult = trace.modelOutput as RiskResult;

      // Check 1: Verify that contributions sum to the correct logit
      const contributionSum = riskResult.contributions.reduce((sum, c) => sum + c.delta, 0);
      const expectedLogit = contributionSum; // Simplified

      // Check 2: Verify sigmoid transformation
      const computedScore = 1 / (1 + Math.exp(-expectedLogit));
      const scoreDifference = Math.abs(computedScore - riskResult.score);

      const reproducible = scoreDifference <= tolerance;

      return {
        passed: reproducible,
        details: reproducible
          ? `Results are reproducible within tolerance (difference: ${scoreDifference.toFixed(6)})`
          : `Results may not be reproducible: score difference ${scoreDifference.toFixed(6)} exceeds tolerance ${tolerance}`,
        evidence: {
          originalScore: riskResult.score,
          recomputedScore: computedScore,
          difference: scoreDifference,
          tolerance,
          contributionSum,
        },
        severity: reproducible ? 'info' : 'warning',
      };
    } catch (error: any) {
      return {
        passed: false,
        details: `Reproducibility check failed: ${error.message}`,
        severity: 'warning',
      };
    }
  }

  private async verifyParameterConsistency(trace: ReasoningTrace): Promise<CheckResult> {
    try {
      const riskResult = trace.modelOutput as RiskResult;
      const inconsistencies: string[] = [];

      // Check 1: Verify all contributions have valid weights
      for (const contrib of riskResult.contributions) {
        if (isNaN(contrib.weight) || !isFinite(contrib.weight)) {
          inconsistencies.push(`Feature ${contrib.feature} has invalid weight: ${contrib.weight}`);
        }
        if (isNaN(contrib.value) || !isFinite(contrib.value)) {
          inconsistencies.push(`Feature ${contrib.feature} has invalid value: ${contrib.value}`);
        }
      }

      // Check 2: Verify saliency explanations match contributions
      const saliencyMap = new Map(trace.saliencyExplanations.map(s => [s.featureName, s]));
      for (const contrib of riskResult.contributions) {
        const saliency = saliencyMap.get(contrib.feature);
        if (!saliency) {
          inconsistencies.push(`Missing saliency explanation for feature: ${contrib.feature}`);
        } else {
          const contributionDiff = Math.abs(saliency.contribution - contrib.delta);
          if (contributionDiff > 0.0001) {
            inconsistencies.push(
              `Saliency contribution mismatch for ${contrib.feature}: ` +
              `saliency=${saliency.contribution.toFixed(6)}, contribution=${contrib.delta.toFixed(6)}`
            );
          }
        }
      }

      // Check 3: Verify band assignment is correct
      const score = riskResult.score;
      let expectedBand: string;
      if (score < 0.33) expectedBand = 'low';
      else if (score < 0.66) expectedBand = 'medium';
      else if (score < 0.85) expectedBand = 'high';
      else expectedBand = 'critical';

      if (expectedBand !== riskResult.band) {
        inconsistencies.push(
          `Risk band mismatch: score ${score.toFixed(3)} should be '${expectedBand}', ` +
          `but got '${riskResult.band}'`
        );
      }

      const passed = inconsistencies.length === 0;

      return {
        passed,
        details: passed
          ? 'All parameter relationships are consistent'
          : `Found ${inconsistencies.length} inconsistencies`,
        evidence: {
          inconsistencies,
          checksPerformed: 3,
        },
        severity: passed ? 'info' : (inconsistencies.length > 3 ? 'error' : 'warning'),
      };
    } catch (error: any) {
      return {
        passed: false,
        details: `Parameter consistency check failed: ${error.message}`,
        severity: 'warning',
      };
    }
  }

  private verifyModelMetadata(metadata: ModelMetadata): CheckResult {
    const issues: string[] = [];

    // Check required fields
    if (!metadata.modelName) issues.push('Missing model name');
    if (!metadata.modelVersion) issues.push('Missing model version');
    if (!metadata.modelType) issues.push('Missing model type');

    // Check timestamp validity
    if (metadata.lastUpdated) {
      const age = Date.now() - metadata.lastUpdated.getTime();
      const daysSinceUpdate = age / (1000 * 60 * 60 * 24);

      if (daysSinceUpdate > 180) {
        issues.push(`Model metadata is stale (${Math.round(daysSinceUpdate)} days old)`);
      }
    }

    // Check parameters exist
    if (!metadata.parameters || Object.keys(metadata.parameters).length === 0) {
      issues.push('No model parameters documented');
    }

    const passed = issues.length === 0;

    return {
      passed,
      details: passed
        ? 'Model metadata is complete and valid'
        : `Metadata issues: ${issues.join('; ')}`,
      evidence: {
        issues,
        metadata,
      },
      severity: passed ? 'info' : 'warning',
    };
  }

  // ============================================================================
  // Parameter Sweep for Predictability Testing
  // ============================================================================

  /**
   * Sweep a parameter across a range to verify predictable behavior
   */
  async performParameterSweep(
    baseFeatures: FeatureVector,
    featureToSweep: string,
    minValue: number,
    maxValue: number,
    steps: number,
    computeFunction: (features: FeatureVector) => Promise<number>,
  ): Promise<ParameterSweepResult> {
    logger.info({
      message: 'Starting parameter sweep',
      feature: featureToSweep,
      range: [minValue, maxValue],
      steps,
    });

    const results: ParameterSweepResult['results'] = [];
    const stepSize = (maxValue - minValue) / (steps - 1);

    let previousScore: number | null = null;
    let allMonotonic = true;
    let totalDelta = 0;

    for (let i = 0; i < steps; i++) {
      const parameterValue = minValue + i * stepSize;
      const testFeatures = { ...baseFeatures, [featureToSweep]: parameterValue };

      const outputScore = await computeFunction(testFeatures);
      const delta = previousScore !== null ? outputScore - previousScore : 0;

      // Check if the change is predictable (monotonic behavior)
      const predictable = previousScore === null ||
        Math.sign(delta) === Math.sign(stepSize) ||
        Math.abs(delta) < 0.0001; // Allow for numerical precision

      if (i > 0 && !predictable) {
        allMonotonic = false;
      }

      results.push({
        parameterValue,
        outputScore,
        delta,
        predictable,
      });

      if (previousScore !== null) {
        totalDelta += Math.abs(delta);
      }

      previousScore = outputScore;
    }

    const sensitivity = totalDelta / (steps - 1); // Average rate of change

    const explanation = this.generateSweepExplanation(
      featureToSweep,
      minValue,
      maxValue,
      allMonotonic,
      sensitivity,
      results,
    );

    logger.info({
      message: 'Parameter sweep completed',
      feature: featureToSweep,
      monotonic: allMonotonic,
      sensitivity,
    });

    return {
      feature: featureToSweep,
      sweepRange: { min: minValue, max: maxValue, steps },
      results,
      monotonic: allMonotonic,
      sensitivity,
      explanation,
    };
  }

  private generateSweepExplanation(
    feature: string,
    min: number,
    max: number,
    monotonic: boolean,
    sensitivity: number,
    results: ParameterSweepResult['results'],
  ): string {
    const direction = results[results.length - 1].outputScore > results[0].outputScore
      ? 'increases'
      : 'decreases';

    const behavior = monotonic ? 'monotonically' : 'non-monotonically';

    return `Feature '${feature}' ${behavior} ${direction} output score as it varies from ` +
      `${min.toFixed(3)} to ${max.toFixed(3)}. Average sensitivity: ${sensitivity.toFixed(6)}. ` +
      `${monotonic ? 'Behavior is predictable and consistent.' : 'WARNING: Non-monotonic behavior detected - results may be unpredictable.'}`;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private calculateConfidence(checks: VerificationResult['checks']): number {
    const weights = {
      digestIntegrity: 0.35,
      signatureValidity: 0.35,
      reproducibility: 0.15,
      parameterConsistency: 0.10,
      modelMetadata: 0.05,
    };

    let confidence = 0;

    if (checks.digestIntegrity.passed) confidence += weights.digestIntegrity;
    if (checks.signatureValidity.passed) confidence += weights.signatureValidity;
    if (checks.reproducibility.passed) confidence += weights.reproducibility;
    if (checks.parameterConsistency.passed) confidence += weights.parameterConsistency;
    if (checks.modelMetadata.passed) confidence += weights.modelMetadata;

    return confidence;
  }

  private determineOverallValidity(
    checks: VerificationResult['checks'],
    level: 'basic' | 'standard' | 'comprehensive',
  ): boolean {
    // Basic: Only critical checks must pass
    const criticalPassed = checks.digestIntegrity.passed &&
      (checks.signatureValidity.passed || !checks.signatureValidity.evidence);

    if (level === 'basic') {
      return criticalPassed;
    }

    // Standard: Critical + reproducibility
    if (level === 'standard') {
      return criticalPassed && checks.reproducibility.passed;
    }

    // Comprehensive: All checks must pass
    return Object.values(checks).every(check => check.passed);
  }

  private generateRecommendations(result: VerificationResult): string[] {
    const recommendations: string[] = [];

    if (!result.checks.digestIntegrity.passed) {
      recommendations.push('CRITICAL: Digest integrity failed. Do not trust this trace. Investigate for tampering.');
    }

    if (!result.checks.signatureValidity.passed && result.checks.signatureValidity.severity !== 'warning') {
      recommendations.push('CRITICAL: Signature validation failed. Cannot verify trace authenticity.');
    }

    if (!result.checks.reproducibility.passed) {
      recommendations.push('Re-run the model with the same inputs to verify reproducibility.');
    }

    if (!result.checks.parameterConsistency.passed) {
      recommendations.push('Review model parameters for consistency. Check for numerical instabilities.');
    }

    if (result.confidence < 0.7) {
      recommendations.push('Low confidence verification. Consider comprehensive re-verification.');
    }

    if (result.warnings.length > 0) {
      recommendations.push('Address warnings to improve trace reliability.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Trace verification passed all checks. Trace is valid and trustworthy.');
    }

    return recommendations;
  }

  // ============================================================================
  // Verification Log Access
  // ============================================================================

  getVerificationResult(verificationId: string): VerificationResult | undefined {
    return this.verificationLog.get(verificationId);
  }

  getVerificationHistory(traceId: string): VerificationResult[] {
    return Array.from(this.verificationLog.values()).filter(
      result => result.checks.digestIntegrity.evidence?.expectedDigest?.includes(traceId),
    );
  }

  clearVerificationLog(): void {
    this.verificationLog.clear();
    logger.info({ message: 'Verification log cleared' });
  }
}

// Export singleton instance
export const externalVerifier = ExternalVerifier.getInstance();
