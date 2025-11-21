/**
 * Tests for XAI Overlay Service
 *
 * Covers:
 * - Reproducibility within tolerance
 * - Parameter sensitivity (changing parameters changes results predictably)
 * - Tamper detection (hash mismatch triggers alarms)
 * - Cryptographic signing and verification
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { XAIOverlayService } from '../XAIOverlayService.js';
import { externalVerifier } from '../ExternalVerifier.js';
import { FeatureVector } from '../../../risk/RiskEngine.js';

describe('XAI Overlay Service', () => {
  let xaiService: XAIOverlayService;

  beforeEach(() => {
    xaiService = XAIOverlayService.getInstance({
      enableSigning: false, // Disable for tests (no HSM available)
      enableTamperDetection: true,
      reproducibilityTolerance: 0.001,
      parameterSensitivityThreshold: 0.05,
    });
    xaiService.clearCache();
  });

  describe('Reproducibility Tests', () => {
    it('should produce identical results for identical inputs', async () => {
      const features: FeatureVector = {
        transaction_frequency: 0.5,
        network_centrality: 0.7,
        temporal_anomaly: 0.3,
        geo_dispersion: 0.2,
      };

      const trace1 = await xaiService.computeRiskWithExplanation(features, '24h');
      const trace2 = await xaiService.computeRiskWithExplanation(features, '24h');

      // Scores should be identical (deterministic model)
      expect((trace1.modelOutput as any).score).toBe((trace2.modelOutput as any).score);

      // Input hashes should be identical
      expect(trace1.inputSummary.inputHash).toBe(trace2.inputSummary.inputHash);

      // Risk bands should be identical
      expect((trace1.modelOutput as any).band).toBe((trace2.modelOutput as any).band);
    });

    it('should verify reproducibility within tolerance', async () => {
      const features: FeatureVector = {
        transaction_frequency: 0.5,
        network_centrality: 0.7,
        temporal_anomaly: 0.3,
        geo_dispersion: 0.2,
      };

      const originalTrace = await xaiService.computeRiskWithExplanation(features, '7d');

      const reproducibilityCheck = await xaiService.verifyReproducibility(
        originalTrace.traceId,
        features,
        '7d',
      );

      expect(reproducibilityCheck.isReproducible).toBe(true);
      expect(reproducibilityCheck.withinTolerance).toBe(true);

      // Check that differences are minimal
      for (const diff of reproducibilityCheck.differences) {
        expect(diff.difference).toBeLessThanOrEqual(0.001);
      }
    });

    it('should detect non-reproducibility when inputs change', async () => {
      const originalFeatures: FeatureVector = {
        transaction_frequency: 0.5,
        network_centrality: 0.7,
      };

      const originalTrace = await xaiService.computeRiskWithExplanation(
        originalFeatures,
        '24h',
      );

      // Changed features
      const changedFeatures: FeatureVector = {
        transaction_frequency: 0.6, // Changed!
        network_centrality: 0.7,
      };

      const reproducibilityCheck = await xaiService.verifyReproducibility(
        originalTrace.traceId,
        changedFeatures,
        '24h',
      );

      // Should detect the difference
      expect(reproducibilityCheck.differences.length).toBeGreaterThan(0);

      // Depending on sensitivity, might not be reproducible
      const scoreDiff = reproducibilityCheck.differences.find(
        d => d.field === 'riskScore',
      );
      expect(scoreDiff).toBeDefined();
      expect(scoreDiff!.difference).toBeGreaterThan(0);
    });
  });

  describe('Parameter Sensitivity Tests', () => {
    it('should detect parameter changes affect results predictably', async () => {
      const baseFeatures: FeatureVector = {
        transaction_frequency: 0.5,
        network_centrality: 0.5,
        temporal_anomaly: 0.5,
      };

      const sensitivity = await xaiService.analyzeParameterSensitivity(
        baseFeatures,
        '24h',
        'transaction_frequency',
        10, // 10% increase
      );

      expect(sensitivity.sensitivity).toBeGreaterThan(0);

      // Scores should be different
      const baseScore = (sensitivity.baseTrace.modelOutput as any).score;
      const variedScore = (sensitivity.variedTrace.modelOutput as any).score;
      expect(baseScore).not.toBe(variedScore);

      // Explanation should be present
      expect(sensitivity.explanation).toContain('transaction_frequency');
      expect(sensitivity.explanation.length).toBeGreaterThan(0);
    });

    it('should identify significant vs insignificant parameter changes', async () => {
      const baseFeatures: FeatureVector = {
        transaction_frequency: 0.5,
        network_centrality: 0.5,
      };

      // Small change (1%) - may not be significant
      const smallChange = await xaiService.analyzeParameterSensitivity(
        baseFeatures,
        '24h',
        'transaction_frequency',
        1,
      );

      // Large change (50%) - should be significant
      const largeChange = await xaiService.analyzeParameterSensitivity(
        baseFeatures,
        '24h',
        'transaction_frequency',
        50,
      );

      // Large change should have higher sensitivity
      expect(largeChange.sensitivity).toBeGreaterThan(smallChange.sensitivity);
    });

    it('should track direction of parameter influence', async () => {
      const baseFeatures: FeatureVector = {
        transaction_frequency: 0.5,
        network_centrality: 0.5,
      };

      const sensitivity = await xaiService.analyzeParameterSensitivity(
        baseFeatures,
        '24h',
        'network_centrality',
        20,
      );

      const baseScore = (sensitivity.baseTrace.modelOutput as any).score;
      const variedScore = (sensitivity.variedTrace.modelOutput as any).score;

      // Increasing network_centrality should increase risk (positive weight)
      // Check explanation contains direction
      const direction = variedScore > baseScore ? 'increases' : 'decreases';
      expect(sensitivity.explanation).toContain(direction);
    });
  });

  describe('Tamper Detection Tests', () => {
    it('should detect when trace digest is modified', async () => {
      const features: FeatureVector = {
        transaction_frequency: 0.5,
        network_centrality: 0.7,
      };

      const trace = await xaiService.computeRiskWithExplanation(features, '24h');

      // Tamper with the digest
      const tamperedTrace = { ...trace, traceDigest: 'tampered_digest_value' };

      const tamperResult = await xaiService.detectTampering(tamperedTrace);

      expect(tamperResult.isTampered).toBe(true);
      expect(tamperResult.originalDigest).toBe('tampered_digest_value');
      expect(tamperResult.computedDigest).not.toBe('tampered_digest_value');
      expect(tamperResult.verificationErrors.length).toBeGreaterThan(0);
    });

    it('should detect when model output is modified', async () => {
      const features: FeatureVector = {
        transaction_frequency: 0.5,
        network_centrality: 0.7,
      };

      const trace = await xaiService.computeRiskWithExplanation(features, '24h');

      // Tamper with the model output
      const tamperedTrace = {
        ...trace,
        modelOutput: {
          ...(trace.modelOutput as any),
          score: 0.999, // Changed score
        },
      };

      const tamperResult = await xaiService.detectTampering(tamperedTrace);

      expect(tamperResult.isTampered).toBe(true);
      expect(tamperResult.verificationErrors).toContain(
        expect.stringContaining('Digest mismatch'),
      );
    });

    it('should require dual control on tampering', async () => {
      const features: FeatureVector = {
        transaction_frequency: 0.5,
      };

      const trace = await xaiService.computeRiskWithExplanation(features, '24h');

      // Tamper with trace
      const tamperedTrace = { ...trace, traceDigest: 'fake_digest' };

      const tamperResult = await xaiService.detectTampering(tamperedTrace);

      expect(tamperResult.isTampered).toBe(true);
      expect(tamperResult.dualControlRequired).toBe(true);
    });

    it('should pass when trace is not tampered', async () => {
      const features: FeatureVector = {
        transaction_frequency: 0.5,
        network_centrality: 0.7,
      };

      const trace = await xaiService.computeRiskWithExplanation(features, '24h');

      const tamperResult = await xaiService.detectTampering(trace);

      expect(tamperResult.isTampered).toBe(false);
      expect(tamperResult.originalDigest).toBe(tamperResult.computedDigest);
      expect(tamperResult.verificationErrors.length).toBe(0);
    });
  });

  describe('Saliency & Explanation Tests', () => {
    it('should generate human-readable explanations for all features', async () => {
      const features: FeatureVector = {
        transaction_frequency: 0.8,
        network_centrality: 0.6,
        temporal_anomaly: 0.4,
        geo_dispersion: 0.3,
      };

      const trace = await xaiService.computeRiskWithExplanation(features, '24h');

      expect(trace.saliencyExplanations.length).toBe(4);

      for (const explanation of trace.saliencyExplanations) {
        expect(explanation.humanReadable).toBeTruthy();
        expect(explanation.humanReadable.length).toBeGreaterThan(0);
        expect(explanation.importance).toMatch(/critical|high|medium|low/i);
        expect(explanation.direction).toMatch(/increases_risk|decreases_risk|neutral/i);
      }
    });

    it('should calculate contribution percentages correctly', async () => {
      const features: FeatureVector = {
        transaction_frequency: 0.5,
        network_centrality: 0.5,
      };

      const trace = await xaiService.computeRiskWithExplanation(features, '24h');

      const totalPercent = trace.saliencyExplanations.reduce(
        (sum, exp) => sum + exp.contributionPercent,
        0,
      );

      // Total should be approximately 100% (allowing for rounding)
      expect(totalPercent).toBeGreaterThan(99);
      expect(totalPercent).toBeLessThanOrEqual(100.1);
    });

    it('should order explanations by importance', async () => {
      const features: FeatureVector = {
        transaction_frequency: 0.1,
        network_centrality: 0.9,
        temporal_anomaly: 0.5,
      };

      const trace = await xaiService.computeRiskWithExplanation(features, '24h');

      // Check that explanations are ordered by absolute contribution
      for (let i = 0; i < trace.saliencyExplanations.length - 1; i++) {
        const current = Math.abs(trace.saliencyExplanations[i].contribution);
        const next = Math.abs(trace.saliencyExplanations[i + 1].contribution);
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });
  });

  describe('Model Metadata Tests', () => {
    it('should track model version and parameters', async () => {
      const features: FeatureVector = {
        transaction_frequency: 0.5,
      };

      const trace = await xaiService.computeRiskWithExplanation(features, '7d');

      expect(trace.modelMetadata.modelName).toBeTruthy();
      expect(trace.modelMetadata.modelVersion).toBeTruthy();
      expect(trace.modelMetadata.modelType).toBe('risk_engine');
      expect(trace.modelMetadata.parameters).toBeDefined();
      expect(trace.modelMetadata.parameters.window).toBe('7d');
    });

    it('should track intermediate computational steps', async () => {
      const features: FeatureVector = {
        transaction_frequency: 0.5,
        network_centrality: 0.7,
      };

      const trace = await xaiService.computeRiskWithExplanation(features, '24h');

      expect(trace.intermediateSteps.length).toBeGreaterThan(0);

      // Check for expected steps
      const stepNames = trace.intermediateSteps.map(s => s.step);
      expect(stepNames).toContain('feature_extraction');
      expect(stepNames).toContain('weighted_sum');
      expect(stepNames).toContain('sigmoid_activation');
      expect(stepNames).toContain('risk_banding');
    });
  });

  describe('Cache Management Tests', () => {
    it('should cache traces by ID', async () => {
      const features: FeatureVector = {
        transaction_frequency: 0.5,
      };

      const trace = await xaiService.computeRiskWithExplanation(features, '24h');

      const retrieved = xaiService.getTrace(trace.traceId);

      expect(retrieved).toBeDefined();
      expect(retrieved!.traceId).toBe(trace.traceId);
    });

    it('should respect cache size limits', async () => {
      const smallService = XAIOverlayService.getInstance({
        maxCacheSize: 5,
        cacheExplanations: true,
      });

      // Generate more traces than cache size
      for (let i = 0; i < 10; i++) {
        await smallService.computeRiskWithExplanation(
          { transaction_frequency: i / 10 },
          '24h',
        );
      }

      const stats = smallService.getCacheStatistics();
      expect(stats.size).toBeLessThanOrEqual(5);
    });

    it('should clear cache on demand', async () => {
      const features: FeatureVector = {
        transaction_frequency: 0.5,
      };

      await xaiService.computeRiskWithExplanation(features, '24h');

      let stats = xaiService.getCacheStatistics();
      expect(stats.size).toBeGreaterThan(0);

      xaiService.clearCache();

      stats = xaiService.getCacheStatistics();
      expect(stats.size).toBe(0);
    });
  });
});

describe('External Verifier', () => {
  let xaiService: XAIOverlayService;

  beforeEach(() => {
    xaiService = XAIOverlayService.getInstance({
      enableSigning: false,
      enableTamperDetection: true,
    });
    xaiService.clearCache();
  });

  describe('Verification Tests', () => {
    it('should verify digest integrity', async () => {
      const features: FeatureVector = {
        transaction_frequency: 0.5,
        network_centrality: 0.7,
      };

      const trace = await xaiService.computeRiskWithExplanation(features, '24h');

      const verificationResult = await externalVerifier.verifyTrace({
        trace,
        verificationLevel: 'basic',
      });

      expect(verificationResult.overallValid).toBe(true);
      expect(verificationResult.checks.digestIntegrity.passed).toBe(true);
      expect(verificationResult.confidence).toBeGreaterThan(0);
    });

    it('should fail verification for tampered traces', async () => {
      const features: FeatureVector = {
        transaction_frequency: 0.5,
      };

      const trace = await xaiService.computeRiskWithExplanation(features, '24h');

      // Tamper with the trace
      const tamperedTrace = {
        ...trace,
        modelOutput: { ...(trace.modelOutput as any), score: 0.999 },
      };

      const verificationResult = await externalVerifier.verifyTrace({
        trace: tamperedTrace,
        verificationLevel: 'comprehensive',
      });

      expect(verificationResult.overallValid).toBe(false);
      expect(verificationResult.checks.digestIntegrity.passed).toBe(false);
      expect(verificationResult.errors.length).toBeGreaterThan(0);
    });

    it('should verify parameter consistency', async () => {
      const features: FeatureVector = {
        transaction_frequency: 0.5,
        network_centrality: 0.7,
        temporal_anomaly: 0.3,
      };

      const trace = await xaiService.computeRiskWithExplanation(features, '24h');

      const verificationResult = await externalVerifier.verifyTrace({
        trace,
        verificationLevel: 'comprehensive',
      });

      expect(verificationResult.checks.parameterConsistency.passed).toBe(true);
    });

    it('should provide recommendations based on checks', async () => {
      const features: FeatureVector = {
        transaction_frequency: 0.5,
      };

      const trace = await xaiService.computeRiskWithExplanation(features, '24h');

      const verificationResult = await externalVerifier.verifyTrace({
        trace,
        verificationLevel: 'standard',
      });

      expect(verificationResult.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Parameter Sweep Tests', () => {
    it('should perform parameter sweep and detect monotonic behavior', async () => {
      const baseFeatures: FeatureVector = {
        transaction_frequency: 0.5,
        network_centrality: 0.5,
      };

      const computeFunction = async (features: FeatureVector): Promise<number> => {
        const trace = await xaiService.computeRiskWithExplanation(features, '24h');
        return (trace.modelOutput as any).score;
      };

      const sweepResult = await externalVerifier.performParameterSweep(
        baseFeatures,
        'network_centrality',
        0.1,
        0.9,
        5,
        computeFunction,
      );

      expect(sweepResult.results.length).toBe(5);
      expect(sweepResult.monotonic).toBe(true); // Should be monotonic for positive weight
      expect(sweepResult.sensitivity).toBeGreaterThan(0);
      expect(sweepResult.explanation).toContain('network_centrality');
    });

    it('should detect predictable vs unpredictable parameter behavior', async () => {
      const baseFeatures: FeatureVector = {
        transaction_frequency: 0.5,
      };

      const computeFunction = async (features: FeatureVector): Promise<number> => {
        const trace = await xaiService.computeRiskWithExplanation(features, '24h');
        return (trace.modelOutput as any).score;
      };

      const sweepResult = await externalVerifier.performParameterSweep(
        baseFeatures,
        'transaction_frequency',
        0.0,
        1.0,
        10,
        computeFunction,
      );

      // All points should be predictable for a simple linear model
      for (const point of sweepResult.results) {
        expect(point.predictable).toBe(true);
      }
    });
  });
});
