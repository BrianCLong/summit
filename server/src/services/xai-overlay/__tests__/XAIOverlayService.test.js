"use strict";
/**
 * Tests for XAI Overlay Service
 *
 * Covers:
 * - Reproducibility within tolerance
 * - Parameter sensitivity (changing parameters changes results predictably)
 * - Tamper detection (hash mismatch triggers alarms)
 * - Cryptographic signing and verification
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
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
globals_1.jest.mock('../../../federal/dual-notary.js', () => ({
    __esModule: true,
    dualNotary: {
        notarizeRoot: globals_1.jest.fn(async () => ({
            rootHash: 'mock-root',
            hsmSignature: 'mock-signature',
            tsaResponse: 'mock-tsa',
            notarizedBy: 'mock-notary',
            timestamp: new Date().toISOString(),
        })),
        verifyNotarizedRoot: globals_1.jest.fn(async () => ({ valid: true })),
        healthCheck: globals_1.jest.fn(async () => ({ status: 'ok' })),
    },
}));
let XAIOverlayService;
let externalVerifier;
(0, globals_1.describe)('XAI Overlay Service', () => {
    let xaiService;
    (0, globals_1.beforeEach)(async () => {
        if (!XAIOverlayService) {
            ({ XAIOverlayService } = await Promise.resolve().then(() => __importStar(require('../XAIOverlayService.js'))));
            ({ externalVerifier } = await Promise.resolve().then(() => __importStar(require('../ExternalVerifier.js'))));
        }
        XAIOverlayService.instance = undefined;
        xaiService = XAIOverlayService.getInstance({
            enableSigning: false, // Disable for tests (no HSM available)
            enableTamperDetection: true,
            reproducibilityTolerance: 0.001,
            parameterSensitivityThreshold: 0.05,
        });
        xaiService.clearCache();
    });
    (0, globals_1.describe)('Reproducibility Tests', () => {
        (0, globals_1.it)('should produce identical results for identical inputs', async () => {
            const features = {
                transaction_frequency: 0.5,
                network_centrality: 0.7,
                temporal_anomaly: 0.3,
                geo_dispersion: 0.2,
            };
            const trace1 = await xaiService.computeRiskWithExplanation(features, '24h');
            const trace2 = await xaiService.computeRiskWithExplanation(features, '24h');
            // Scores should be identical (deterministic model)
            (0, globals_1.expect)(trace1.modelOutput.score).toBe(trace2.modelOutput.score);
            // Input hashes should be identical
            (0, globals_1.expect)(trace1.inputSummary.inputHash).toBe(trace2.inputSummary.inputHash);
            // Risk bands should be identical
            (0, globals_1.expect)(trace1.modelOutput.band).toBe(trace2.modelOutput.band);
        });
        (0, globals_1.it)('should verify reproducibility within tolerance', async () => {
            const features = {
                transaction_frequency: 0.5,
                network_centrality: 0.7,
                temporal_anomaly: 0.3,
                geo_dispersion: 0.2,
            };
            const originalTrace = await xaiService.computeRiskWithExplanation(features, '7d');
            const reproducibilityCheck = await xaiService.verifyReproducibility(originalTrace.traceId, features, '7d');
            (0, globals_1.expect)(reproducibilityCheck.isReproducible).toBe(true);
            (0, globals_1.expect)(reproducibilityCheck.withinTolerance).toBe(true);
            // Check that differences are minimal
            for (const diff of reproducibilityCheck.differences) {
                (0, globals_1.expect)(diff.difference).toBeLessThanOrEqual(0.001);
            }
        });
        (0, globals_1.it)('should detect non-reproducibility when inputs change', async () => {
            const originalFeatures = {
                transaction_frequency: 0.5,
                network_centrality: 0.7,
            };
            const originalTrace = await xaiService.computeRiskWithExplanation(originalFeatures, '24h');
            // Changed features
            const changedFeatures = {
                transaction_frequency: 0.6, // Changed!
                network_centrality: 0.7,
            };
            const reproducibilityCheck = await xaiService.verifyReproducibility(originalTrace.traceId, changedFeatures, '24h');
            // Should detect the difference
            (0, globals_1.expect)(reproducibilityCheck.differences.length).toBeGreaterThan(0);
            // Depending on sensitivity, might not be reproducible
            const scoreDiff = reproducibilityCheck.differences.find((d) => d.field === 'riskScore');
            (0, globals_1.expect)(scoreDiff).toBeDefined();
            (0, globals_1.expect)(scoreDiff.difference).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('Parameter Sensitivity Tests', () => {
        (0, globals_1.it)('should detect parameter changes affect results predictably', async () => {
            const baseFeatures = {
                transaction_frequency: 0.5,
                network_centrality: 0.5,
                temporal_anomaly: 0.5,
            };
            const sensitivity = await xaiService.analyzeParameterSensitivity(baseFeatures, '24h', 'transaction_frequency', 10);
            (0, globals_1.expect)(sensitivity.sensitivity).toBeGreaterThan(0);
            // Scores should be different
            const baseScore = sensitivity.baseTrace.modelOutput.score;
            const variedScore = sensitivity.variedTrace.modelOutput.score;
            (0, globals_1.expect)(baseScore).not.toBe(variedScore);
            // Explanation should be present
            (0, globals_1.expect)(sensitivity.explanation).toContain('transaction_frequency');
            (0, globals_1.expect)(sensitivity.explanation.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should identify significant vs insignificant parameter changes', async () => {
            const baseFeatures = {
                transaction_frequency: 0.5,
                network_centrality: 0.5,
            };
            // Small change (1%) - may not be significant
            const smallChange = await xaiService.analyzeParameterSensitivity(baseFeatures, '24h', 'transaction_frequency', 1);
            // Large change (50%) - should be significant
            const largeChange = await xaiService.analyzeParameterSensitivity(baseFeatures, '24h', 'transaction_frequency', 50);
            // Large change should have higher sensitivity
            (0, globals_1.expect)(largeChange.sensitivity).toBeGreaterThan(smallChange.sensitivity);
        });
        (0, globals_1.it)('should track direction of parameter influence', async () => {
            const baseFeatures = {
                transaction_frequency: 0.5,
                network_centrality: 0.5,
            };
            const sensitivity = await xaiService.analyzeParameterSensitivity(baseFeatures, '24h', 'network_centrality', 20);
            const baseScore = sensitivity.baseTrace.modelOutput.score;
            const variedScore = sensitivity.variedTrace.modelOutput.score;
            // Increasing network_centrality should increase risk (positive weight)
            // Check explanation contains direction
            const direction = variedScore > baseScore ? 'increases' : 'decreases';
            (0, globals_1.expect)(sensitivity.explanation).toContain(direction);
        });
    });
    (0, globals_1.describe)('Tamper Detection Tests', () => {
        (0, globals_1.it)('should detect when trace digest is modified', async () => {
            const features = {
                transaction_frequency: 0.5,
                network_centrality: 0.7,
            };
            const trace = await xaiService.computeRiskWithExplanation(features, '24h');
            // Tamper with the digest
            const tamperedTrace = { ...trace, traceDigest: 'tampered_digest_value' };
            const tamperResult = await xaiService.detectTampering(tamperedTrace);
            (0, globals_1.expect)(tamperResult.isTampered).toBe(true);
            (0, globals_1.expect)(tamperResult.originalDigest).toBe('tampered_digest_value');
            (0, globals_1.expect)(tamperResult.computedDigest).not.toBe('tampered_digest_value');
            (0, globals_1.expect)(tamperResult.verificationErrors.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should detect when model output is modified', async () => {
            const features = {
                transaction_frequency: 0.5,
                network_centrality: 0.7,
            };
            const trace = await xaiService.computeRiskWithExplanation(features, '24h');
            // Tamper with the model output
            const tamperedTrace = {
                ...trace,
                modelOutput: {
                    ...trace.modelOutput,
                    score: 0.999, // Changed score
                },
            };
            const tamperResult = await xaiService.detectTampering(tamperedTrace);
            (0, globals_1.expect)(tamperResult.isTampered).toBe(true);
            (0, globals_1.expect)(tamperResult.verificationErrors).toEqual(globals_1.expect.arrayContaining([globals_1.expect.stringContaining('Digest mismatch')]));
        });
        (0, globals_1.it)('should require dual control on tampering', async () => {
            const features = {
                transaction_frequency: 0.5,
            };
            const trace = await xaiService.computeRiskWithExplanation(features, '24h');
            // Tamper with trace
            const tamperedTrace = { ...trace, traceDigest: 'fake_digest' };
            const tamperResult = await xaiService.detectTampering(tamperedTrace);
            (0, globals_1.expect)(tamperResult.isTampered).toBe(true);
            (0, globals_1.expect)(tamperResult.dualControlRequired).toBe(true);
        });
        (0, globals_1.it)('should pass when trace is not tampered', async () => {
            const features = {
                transaction_frequency: 0.5,
                network_centrality: 0.7,
            };
            const trace = await xaiService.computeRiskWithExplanation(features, '24h');
            const tamperResult = await xaiService.detectTampering(trace);
            (0, globals_1.expect)(tamperResult.isTampered).toBe(false);
            (0, globals_1.expect)(tamperResult.originalDigest).toBe(tamperResult.computedDigest);
            (0, globals_1.expect)(tamperResult.verificationErrors.length).toBe(0);
        });
    });
    (0, globals_1.describe)('Saliency & Explanation Tests', () => {
        (0, globals_1.it)('should generate human-readable explanations for all features', async () => {
            const features = {
                transaction_frequency: 0.8,
                network_centrality: 0.6,
                temporal_anomaly: 0.4,
                geo_dispersion: 0.3,
            };
            const trace = await xaiService.computeRiskWithExplanation(features, '24h');
            (0, globals_1.expect)(trace.saliencyExplanations.length).toBe(4);
            for (const explanation of trace.saliencyExplanations) {
                (0, globals_1.expect)(explanation.humanReadable).toBeTruthy();
                (0, globals_1.expect)(explanation.humanReadable.length).toBeGreaterThan(0);
                (0, globals_1.expect)(explanation.importance).toMatch(/critical|high|medium|low/i);
                (0, globals_1.expect)(explanation.direction).toMatch(/increases_risk|decreases_risk|neutral/i);
            }
        });
        (0, globals_1.it)('should calculate contribution percentages correctly', async () => {
            const features = {
                transaction_frequency: 0.5,
                network_centrality: 0.5,
            };
            const trace = await xaiService.computeRiskWithExplanation(features, '24h');
            const totalPercent = trace.saliencyExplanations.reduce((sum, exp) => sum + exp.contributionPercent, 0);
            // Total should be approximately 100% (allowing for rounding)
            (0, globals_1.expect)(totalPercent).toBeGreaterThan(99);
            (0, globals_1.expect)(totalPercent).toBeLessThanOrEqual(100.1);
        });
        (0, globals_1.it)('should order explanations by importance', async () => {
            const features = {
                transaction_frequency: 0.1,
                network_centrality: 0.9,
                temporal_anomaly: 0.5,
            };
            const trace = await xaiService.computeRiskWithExplanation(features, '24h');
            // Check that explanations are ordered by absolute contribution
            for (let i = 0; i < trace.saliencyExplanations.length - 1; i++) {
                const current = Math.abs(trace.saliencyExplanations[i].contribution);
                const next = Math.abs(trace.saliencyExplanations[i + 1].contribution);
                (0, globals_1.expect)(current).toBeGreaterThanOrEqual(next);
            }
        });
    });
    (0, globals_1.describe)('Model Metadata Tests', () => {
        (0, globals_1.it)('should track model version and parameters', async () => {
            const features = {
                transaction_frequency: 0.5,
            };
            const trace = await xaiService.computeRiskWithExplanation(features, '7d');
            (0, globals_1.expect)(trace.modelMetadata.modelName).toBeTruthy();
            (0, globals_1.expect)(trace.modelMetadata.modelVersion).toBeTruthy();
            (0, globals_1.expect)(trace.modelMetadata.modelType).toBe('risk_engine');
            (0, globals_1.expect)(trace.modelMetadata.parameters).toBeDefined();
            (0, globals_1.expect)(trace.modelMetadata.parameters.window).toBe('7d');
        });
        (0, globals_1.it)('should track intermediate computational steps', async () => {
            const features = {
                transaction_frequency: 0.5,
                network_centrality: 0.7,
            };
            const trace = await xaiService.computeRiskWithExplanation(features, '24h');
            (0, globals_1.expect)(trace.intermediateSteps.length).toBeGreaterThan(0);
            // Check for expected steps
            const stepNames = trace.intermediateSteps.map((s) => s.step);
            (0, globals_1.expect)(stepNames).toContain('feature_extraction');
            (0, globals_1.expect)(stepNames).toContain('weighted_sum');
            (0, globals_1.expect)(stepNames).toContain('sigmoid_activation');
            (0, globals_1.expect)(stepNames).toContain('risk_banding');
        });
    });
    (0, globals_1.describe)('Cache Management Tests', () => {
        (0, globals_1.it)('should cache traces by ID', async () => {
            const features = {
                transaction_frequency: 0.5,
            };
            const trace = await xaiService.computeRiskWithExplanation(features, '24h');
            const retrieved = xaiService.getTrace(trace.traceId);
            (0, globals_1.expect)(retrieved).toBeDefined();
            (0, globals_1.expect)(retrieved.traceId).toBe(trace.traceId);
        });
        (0, globals_1.it)('should respect cache size limits', async () => {
            XAIOverlayService.instance = undefined;
            const smallService = XAIOverlayService.getInstance({
                maxCacheSize: 100,
                cacheExplanations: true,
                enableSigning: false,
                enableTamperDetection: true,
            });
            // Generate more traces than cache size
            for (let i = 0; i < 110; i++) {
                await smallService.computeRiskWithExplanation({ transaction_frequency: i / 10 }, '24h');
            }
            const stats = smallService.getCacheStatistics();
            (0, globals_1.expect)(stats.size).toBeLessThanOrEqual(100);
        });
        (0, globals_1.it)('should clear cache on demand', async () => {
            const features = {
                transaction_frequency: 0.5,
            };
            await xaiService.computeRiskWithExplanation(features, '24h');
            let stats = xaiService.getCacheStatistics();
            (0, globals_1.expect)(stats.size).toBeGreaterThan(0);
            xaiService.clearCache();
            stats = xaiService.getCacheStatistics();
            (0, globals_1.expect)(stats.size).toBe(0);
        });
    });
});
(0, globals_1.describe)('External Verifier', () => {
    let xaiService;
    (0, globals_1.beforeEach)(async () => {
        if (!XAIOverlayService) {
            ({ XAIOverlayService } = await Promise.resolve().then(() => __importStar(require('../XAIOverlayService.js'))));
            ({ externalVerifier } = await Promise.resolve().then(() => __importStar(require('../ExternalVerifier.js'))));
        }
        xaiService = XAIOverlayService.getInstance({
            enableSigning: false,
            enableTamperDetection: true,
        });
        xaiService.clearCache();
    });
    (0, globals_1.describe)('Verification Tests', () => {
        (0, globals_1.it)('should verify digest integrity', async () => {
            const features = {
                transaction_frequency: 0.5,
                network_centrality: 0.7,
            };
            const trace = await xaiService.computeRiskWithExplanation(features, '24h');
            const verificationResult = await externalVerifier.verifyTrace({
                trace,
                verificationLevel: 'basic',
            });
            (0, globals_1.expect)(verificationResult.overallValid).toBe(true);
            (0, globals_1.expect)(verificationResult.checks.digestIntegrity.passed).toBe(true);
            (0, globals_1.expect)(verificationResult.confidence).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should fail verification for tampered traces', async () => {
            const features = {
                transaction_frequency: 0.5,
            };
            const trace = await xaiService.computeRiskWithExplanation(features, '24h');
            // Tamper with the trace
            const tamperedTrace = {
                ...trace,
                modelOutput: { ...trace.modelOutput, score: 0.999 },
            };
            const verificationResult = await externalVerifier.verifyTrace({
                trace: tamperedTrace,
                verificationLevel: 'comprehensive',
            });
            (0, globals_1.expect)(verificationResult.overallValid).toBe(false);
            (0, globals_1.expect)(verificationResult.checks.digestIntegrity.passed).toBe(false);
            (0, globals_1.expect)(verificationResult.errors.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should verify parameter consistency', async () => {
            const features = {
                transaction_frequency: 0.5,
                network_centrality: 0.7,
                temporal_anomaly: 0.3,
            };
            const trace = await xaiService.computeRiskWithExplanation(features, '24h');
            const verificationResult = await externalVerifier.verifyTrace({
                trace,
                verificationLevel: 'comprehensive',
            });
            (0, globals_1.expect)(verificationResult.checks.parameterConsistency.passed).toBe(true);
        });
        (0, globals_1.it)('should provide recommendations based on checks', async () => {
            const features = {
                transaction_frequency: 0.5,
            };
            const trace = await xaiService.computeRiskWithExplanation(features, '24h');
            const verificationResult = await externalVerifier.verifyTrace({
                trace,
                verificationLevel: 'standard',
            });
            (0, globals_1.expect)(verificationResult.recommendations.length).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('Parameter Sweep Tests', () => {
        (0, globals_1.it)('should perform parameter sweep and detect monotonic behavior', async () => {
            const baseFeatures = {
                transaction_frequency: 0.5,
                network_centrality: 0.5,
            };
            const computeFunction = async (features) => {
                const trace = await xaiService.computeRiskWithExplanation(features, '24h');
                return trace.modelOutput.score;
            };
            const sweepResult = await externalVerifier.performParameterSweep(baseFeatures, 'network_centrality', 0.1, 0.9, 5, computeFunction);
            (0, globals_1.expect)(sweepResult.results.length).toBe(5);
            (0, globals_1.expect)(sweepResult.monotonic).toBe(true); // Should be monotonic for positive weight
            (0, globals_1.expect)(sweepResult.sensitivity).toBeGreaterThan(0);
            (0, globals_1.expect)(sweepResult.explanation).toContain('network_centrality');
        });
        (0, globals_1.it)('should detect predictable vs unpredictable parameter behavior', async () => {
            const baseFeatures = {
                transaction_frequency: 0.5,
            };
            const computeFunction = async (features) => {
                const trace = await xaiService.computeRiskWithExplanation(features, '24h');
                return trace.modelOutput.score;
            };
            const sweepResult = await externalVerifier.performParameterSweep(baseFeatures, 'transaction_frequency', 0.0, 1.0, 10, computeFunction);
            // All points should be predictable for a simple linear model
            for (const point of sweepResult.results) {
                (0, globals_1.expect)(point.predictable).toBe(true);
            }
        });
    });
});
