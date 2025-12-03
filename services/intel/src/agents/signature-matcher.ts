/**
 * Signature Matching Agent
 *
 * Intelligent agent for matching detected waveforms against
 * known signal signature databases. Implements multi-criteria
 * matching with confidence scoring and adaptive learning.
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { v4 as uuidv4 } from 'uuid';
import {
  SignalSignature,
  SignatureMatch,
  WaveformCharacteristics,
  ConfidenceLevel,
  ModulationType,
} from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Configuration for signature matching
 */
export interface SignatureMatcherConfig {
  frequencyTolerancePercent: number;
  bandwidthTolerancePercent: number;
  minMatchScore: number;
  maxCandidates: number;
  enableSpectralFingerprinting: boolean;
  enableTimingAnalysis: boolean;
  adaptiveLearningEnabled: boolean;
}

const DEFAULT_CONFIG: SignatureMatcherConfig = {
  frequencyTolerancePercent: 0.5,
  bandwidthTolerancePercent: 10,
  minMatchScore: 0.4,
  maxCandidates: 10,
  enableSpectralFingerprinting: true,
  enableTimingAnalysis: true,
  adaptiveLearningEnabled: false,
};

/**
 * Feature weights for scoring
 */
interface FeatureWeights {
  frequency: number;
  bandwidth: number;
  modulation: number;
  spectralFingerprint: number;
  timing: number;
  harmonics: number;
}

const DEFAULT_WEIGHTS: FeatureWeights = {
  frequency: 0.25,
  bandwidth: 0.15,
  modulation: 0.20,
  spectralFingerprint: 0.20,
  timing: 0.10,
  harmonics: 0.10,
};

/**
 * SignatureMatcher - Agent for matching waveforms to known signatures
 */
export class SignatureMatcher {
  private config: SignatureMatcherConfig;
  private signatures: Map<string, SignalSignature>;
  private featureWeights: FeatureWeights;
  private matchHistory: Array<{
    signatureId: string;
    matchScore: number;
    timestamp: Date;
  }>;

  constructor(config: Partial<SignatureMatcherConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.signatures = new Map();
    this.featureWeights = { ...DEFAULT_WEIGHTS };
    this.matchHistory = [];
  }

  /**
   * Load signatures from database or configuration
   */
  async loadSignatures(signatures: SignalSignature[]): Promise<void> {
    for (const sig of signatures) {
      this.signatures.set(sig.id, sig);
    }
    logger.info({
      message: 'Signatures loaded',
      count: signatures.length,
    });
  }

  /**
   * Add or update a single signature
   */
  addSignature(signature: SignalSignature): void {
    this.signatures.set(signature.id, signature);
  }

  /**
   * Remove a signature
   */
  removeSignature(signatureId: string): boolean {
    return this.signatures.delete(signatureId);
  }

  /**
   * Match waveform against all known signatures
   */
  async matchWaveform(
    waveform: WaveformCharacteristics,
  ): Promise<SignatureMatch[]> {
    const startTime = Date.now();
    const candidates: SignatureMatch[] = [];

    for (const signature of this.signatures.values()) {
      // Skip expired signatures
      if (signature.validTo && new Date() > signature.validTo) {
        continue;
      }

      // Skip signatures not yet valid
      if (signature.validFrom && new Date() < signature.validFrom) {
        continue;
      }

      const match = this.computeMatch(waveform, signature);
      if (match.matchScore >= this.config.minMatchScore) {
        candidates.push(match);
      }
    }

    // Sort by match score descending
    candidates.sort((a, b) => b.matchScore - a.matchScore);

    // Limit to max candidates
    const results = candidates.slice(0, this.config.maxCandidates);

    // Update match history for adaptive learning
    if (this.config.adaptiveLearningEnabled) {
      for (const match of results) {
        this.matchHistory.push({
          signatureId: match.signatureId,
          matchScore: match.matchScore,
          timestamp: new Date(),
        });
      }
      this.pruneMatchHistory();
    }

    const matchTime = Date.now() - startTime;
    logger.debug({
      message: 'Signature matching completed',
      matchTimeMs: matchTime,
      signaturesSearched: this.signatures.size,
      matchesFound: results.length,
    });

    return results;
  }

  /**
   * Compute match score for a single signature
   */
  private computeMatch(
    waveform: WaveformCharacteristics,
    signature: SignalSignature,
  ): SignatureMatch {
    const matchedFeatures: string[] = [];
    const unmatchedFeatures: string[] = [];
    let totalScore = 0;

    // Frequency matching
    if (signature.waveformTemplate.centerFrequencyHz !== undefined) {
      const freqDiff = Math.abs(
        waveform.centerFrequencyHz - signature.waveformTemplate.centerFrequencyHz,
      );
      const freqTolerance =
        signature.waveformTemplate.centerFrequencyHz *
        (this.config.frequencyTolerancePercent / 100);

      if (freqDiff <= freqTolerance) {
        const freqScore = 1 - freqDiff / freqTolerance;
        totalScore += freqScore * this.featureWeights.frequency;
        matchedFeatures.push('frequency');
      } else {
        unmatchedFeatures.push('frequency');
      }
    }

    // Bandwidth matching
    if (signature.waveformTemplate.bandwidthHz !== undefined) {
      const bwDiff = Math.abs(
        waveform.bandwidthHz - signature.waveformTemplate.bandwidthHz,
      );
      const bwTolerance =
        signature.waveformTemplate.bandwidthHz *
        (this.config.bandwidthTolerancePercent / 100);

      if (bwDiff <= bwTolerance) {
        const bwScore = 1 - bwDiff / bwTolerance;
        totalScore += bwScore * this.featureWeights.bandwidth;
        matchedFeatures.push('bandwidth');
      } else {
        unmatchedFeatures.push('bandwidth');
      }
    }

    // Modulation type matching
    if (signature.waveformTemplate.modulationType !== undefined) {
      const modScore = this.computeModulationScore(
        waveform.modulationType,
        signature.waveformTemplate.modulationType,
      );
      totalScore += modScore * this.featureWeights.modulation;
      if (modScore > 0.5) {
        matchedFeatures.push('modulation');
      } else {
        unmatchedFeatures.push('modulation');
      }
    }

    // Spectral fingerprint matching
    if (
      this.config.enableSpectralFingerprinting &&
      signature.spectralFingerprint &&
      waveform.spectralPeaks.length > 0
    ) {
      const spectralScore = this.computeSpectralFingerprintScore(
        waveform,
        signature.spectralFingerprint,
      );
      totalScore += spectralScore * this.featureWeights.spectralFingerprint;
      if (spectralScore > 0.5) {
        matchedFeatures.push('spectralFingerprint');
      } else {
        unmatchedFeatures.push('spectralFingerprint');
      }
    }

    // Timing pattern matching
    if (
      this.config.enableTimingAnalysis &&
      signature.timingPatterns &&
      signature.timingPatterns.length > 0
    ) {
      const timingScore = this.computeTimingScore(waveform, signature.timingPatterns);
      totalScore += timingScore * this.featureWeights.timing;
      if (timingScore > 0.5) {
        matchedFeatures.push('timing');
      } else {
        unmatchedFeatures.push('timing');
      }
    }

    // Harmonics matching
    if (
      signature.waveformTemplate.harmonics &&
      signature.waveformTemplate.harmonics.length > 0
    ) {
      const harmonicsScore = this.computeHarmonicsScore(
        waveform.harmonics,
        signature.waveformTemplate.harmonics,
      );
      totalScore += harmonicsScore * this.featureWeights.harmonics;
      if (harmonicsScore > 0.5) {
        matchedFeatures.push('harmonics');
      } else {
        unmatchedFeatures.push('harmonics');
      }
    }

    // Normalize score based on available features
    const usedWeights = this.calculateUsedWeights(signature);
    const normalizedScore = usedWeights > 0 ? totalScore / usedWeights : 0;

    return {
      signatureId: signature.id,
      signatureName: signature.name,
      matchScore: normalizedScore,
      matchedFeatures,
      unmatchedFeatures,
      confidence: this.scoreToConfidence(normalizedScore),
      timestamp: new Date(),
    };
  }

  /**
   * Compute modulation type similarity score
   */
  private computeModulationScore(
    detected: ModulationType,
    template: ModulationType,
  ): number {
    if (detected === template) return 1.0;
    if (detected === 'UNKNOWN' || template === 'UNKNOWN') return 0.3;

    // Group similar modulation types
    const analogGroup: ModulationType[] = ['AM', 'FM', 'PM'];
    const digitalGroup: ModulationType[] = ['ASK', 'FSK', 'PSK', 'QAM'];
    const spreadSpectrumGroup: ModulationType[] = ['FHSS', 'DSSS', 'CDMA'];
    const multicarrierGroup: ModulationType[] = ['OFDM'];

    const groups = [analogGroup, digitalGroup, spreadSpectrumGroup, multicarrierGroup];

    for (const group of groups) {
      if (group.includes(detected) && group.includes(template)) {
        return 0.6; // Same family but different type
      }
    }

    return 0.0;
  }

  /**
   * Compute spectral fingerprint similarity
   */
  private computeSpectralFingerprintScore(
    waveform: WaveformCharacteristics,
    templateFingerprint: number[],
  ): number {
    // Extract normalized magnitudes from peaks
    const detectedFingerprint = waveform.spectralPeaks.map((p) => p.magnitudeDb);

    // Normalize both fingerprints
    const normalizedDetected = this.normalizeFingerprint(detectedFingerprint);
    const normalizedTemplate = this.normalizeFingerprint(templateFingerprint);

    // Compute cosine similarity
    const minLength = Math.min(normalizedDetected.length, normalizedTemplate.length);
    if (minLength === 0) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < minLength; i++) {
      dotProduct += normalizedDetected[i] * normalizedTemplate[i];
      normA += normalizedDetected[i] * normalizedDetected[i];
      normB += normalizedTemplate[i] * normalizedTemplate[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator > 0 ? dotProduct / denominator : 0;
  }

  /**
   * Normalize fingerprint values to 0-1 range
   */
  private normalizeFingerprint(fingerprint: number[]): number[] {
    if (fingerprint.length === 0) return [];
    const min = Math.min(...fingerprint);
    const max = Math.max(...fingerprint);
    const range = max - min;
    if (range === 0) return fingerprint.map(() => 0.5);
    return fingerprint.map((v) => (v - min) / range);
  }

  /**
   * Compute timing pattern similarity
   */
  private computeTimingScore(
    waveform: WaveformCharacteristics,
    patterns: SignalSignature['timingPatterns'],
  ): number {
    if (!patterns || patterns.length === 0) return 0;
    if (!waveform.pulseRepetitionHz && !waveform.pulseWidthUs) return 0;

    let maxScore = 0;

    for (const pattern of patterns) {
      let patternScore = 0;
      let featuresMatched = 0;

      // Match pulse repetition interval
      if (waveform.pulseRepetitionHz && pattern.intervalMs > 0) {
        const detectedIntervalMs = 1000 / waveform.pulseRepetitionHz;
        const intervalDiff = Math.abs(detectedIntervalMs - pattern.intervalMs);
        if (intervalDiff <= pattern.toleranceMs) {
          patternScore += 1 - intervalDiff / pattern.toleranceMs;
          featuresMatched++;
        }
      }

      // Match burst characteristics
      if (pattern.burstIntervalMs && waveform.dutyCycle) {
        // Simplified burst matching
        featuresMatched++;
        patternScore += 0.5;
      }

      if (featuresMatched > 0) {
        maxScore = Math.max(maxScore, patternScore / featuresMatched);
      }
    }

    return maxScore;
  }

  /**
   * Compute harmonics similarity
   */
  private computeHarmonicsScore(
    detected: number[],
    template: number[],
  ): number {
    if (detected.length === 0 || template.length === 0) return 0;

    let matches = 0;
    const tolerance = 0.02; // 2% frequency tolerance

    for (const detectedFreq of detected) {
      for (const templateFreq of template) {
        if (Math.abs(detectedFreq - templateFreq) / templateFreq < tolerance) {
          matches++;
          break;
        }
      }
    }

    return matches / Math.max(detected.length, template.length);
  }

  /**
   * Calculate total weight of features used in matching
   */
  private calculateUsedWeights(signature: SignalSignature): number {
    let total = 0;

    if (signature.waveformTemplate.centerFrequencyHz !== undefined) {
      total += this.featureWeights.frequency;
    }
    if (signature.waveformTemplate.bandwidthHz !== undefined) {
      total += this.featureWeights.bandwidth;
    }
    if (signature.waveformTemplate.modulationType !== undefined) {
      total += this.featureWeights.modulation;
    }
    if (
      this.config.enableSpectralFingerprinting &&
      signature.spectralFingerprint
    ) {
      total += this.featureWeights.spectralFingerprint;
    }
    if (
      this.config.enableTimingAnalysis &&
      signature.timingPatterns &&
      signature.timingPatterns.length > 0
    ) {
      total += this.featureWeights.timing;
    }
    if (
      signature.waveformTemplate.harmonics &&
      signature.waveformTemplate.harmonics.length > 0
    ) {
      total += this.featureWeights.harmonics;
    }

    return total;
  }

  /**
   * Convert match score to confidence level
   */
  private scoreToConfidence(score: number): ConfidenceLevel {
    if (score >= 0.9) return 'CONFIRMED';
    if (score >= 0.7) return 'HIGH';
    if (score >= 0.5) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Prune old match history entries
   */
  private pruneMatchHistory(): void {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
    this.matchHistory = this.matchHistory.filter(
      (entry) => entry.timestamp.getTime() > cutoff,
    );
  }

  /**
   * Get signature by ID
   */
  getSignature(signatureId: string): SignalSignature | undefined {
    return this.signatures.get(signatureId);
  }

  /**
   * Get all signatures
   */
  getAllSignatures(): SignalSignature[] {
    return Array.from(this.signatures.values());
  }

  /**
   * Get signatures by category
   */
  getSignaturesByCategory(category: SignalSignature['category']): SignalSignature[] {
    return Array.from(this.signatures.values()).filter(
      (s) => s.category === category,
    );
  }

  /**
   * Search signatures by name or description
   */
  searchSignatures(query: string): SignalSignature[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.signatures.values()).filter(
      (s) =>
        s.name.toLowerCase().includes(lowerQuery) ||
        s.description?.toLowerCase().includes(lowerQuery),
    );
  }

  /**
   * Get matching statistics
   */
  getStatistics(): {
    signatureCount: number;
    matchHistoryCount: number;
    topMatchedSignatures: Array<{ signatureId: string; matchCount: number }>;
  } {
    // Count matches per signature
    const matchCounts = new Map<string, number>();
    for (const entry of this.matchHistory) {
      matchCounts.set(
        entry.signatureId,
        (matchCounts.get(entry.signatureId) || 0) + 1,
      );
    }

    // Sort by match count
    const topMatched = Array.from(matchCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([signatureId, matchCount]) => ({ signatureId, matchCount }));

    return {
      signatureCount: this.signatures.size,
      matchHistoryCount: this.matchHistory.length,
      topMatchedSignatures: topMatched,
    };
  }

  /**
   * Update feature weights for adaptive learning
   */
  updateFeatureWeights(weights: Partial<FeatureWeights>): void {
    this.featureWeights = { ...this.featureWeights, ...weights };

    // Normalize weights to sum to 1
    const total = Object.values(this.featureWeights).reduce((a, b) => a + b, 0);
    if (total > 0) {
      for (const key of Object.keys(this.featureWeights) as (keyof FeatureWeights)[]) {
        this.featureWeights[key] /= total;
      }
    }
  }
}

export default SignatureMatcher;
