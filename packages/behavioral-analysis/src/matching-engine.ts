/**
 * Behavioral Biometrics Matching Engine
 *
 * Algorithms for matching behavioral biometric patterns including
 * gait recognition, keystroke dynamics, and mouse movement analysis.
 */

import {
  GaitSignature,
  KeystrokeProfile,
  MouseProfile,
  TouchProfile,
  SignatureProfile,
  VoiceProfile,
  BehavioralProfile
} from './types.js';

// ============================================================================
// Types
// ============================================================================

export interface BehavioralMatchResult {
  matchId: string;
  modality: string;
  score: number;
  confidence: number;
  isMatch: boolean;
  threshold: number;
  featureScores: Record<string, number>;
  metadata: {
    processingTime: number;
    algorithmVersion: string;
    timestamp: string;
  };
}

export interface BehavioralMatchConfig {
  gaitThreshold: number;
  keystrokeThreshold: number;
  mouseThreshold: number;
  touchThreshold: number;
  signatureThreshold: number;
  voiceThreshold: number;
  fusionWeights: Record<string, number>;
}

const defaultConfig: BehavioralMatchConfig = {
  gaitThreshold: 70,
  keystrokeThreshold: 75,
  mouseThreshold: 70,
  touchThreshold: 72,
  signatureThreshold: 80,
  voiceThreshold: 75,
  fusionWeights: {
    gait: 0.15,
    keystroke: 0.20,
    mouse: 0.15,
    touch: 0.15,
    signature: 0.20,
    voice: 0.15
  }
};

// ============================================================================
// Gait Matching
// ============================================================================

export class GaitMatcher {
  private threshold: number;

  constructor(threshold = 70) {
    this.threshold = threshold;
  }

  /**
   * Compare two gait signatures
   */
  match(probe: GaitSignature, gallery: GaitSignature): BehavioralMatchResult {
    const startTime = Date.now();
    const featureScores: Record<string, number> = {};

    // Compare spatial features
    const spatialScore = this.compareSpatialFeatures(probe, gallery);
    featureScores['spatial'] = spatialScore;

    // Compare temporal features
    const temporalScore = this.compareTemporalFeatures(probe, gallery);
    featureScores['temporal'] = temporalScore;

    // Compare summary statistics
    const summaryScore = this.compareSummary(probe, gallery);
    featureScores['summary'] = summaryScore;

    // Weighted combination
    const score = spatialScore * 0.4 + temporalScore * 0.3 + summaryScore * 0.3;
    const confidence = this.calculateConfidence(probe, gallery, score);

    return {
      matchId: crypto.randomUUID(),
      modality: 'GAIT',
      score,
      confidence,
      isMatch: score >= this.threshold,
      threshold: this.threshold,
      featureScores,
      metadata: {
        processingTime: Date.now() - startTime,
        algorithmVersion: '1.0.0',
        timestamp: new Date().toISOString()
      }
    };
  }

  private compareSpatialFeatures(probe: GaitSignature, gallery: GaitSignature): number {
    if (probe.features.length === 0 || gallery.features.length === 0) return 0;

    const pf = probe.features[0].spatialFeatures;
    const gf = gallery.features[0].spatialFeatures;

    const strideDiff = 1 - Math.abs(pf.strideLength - gf.strideLength) / Math.max(pf.strideLength, gf.strideLength);
    const stepWidthDiff = 1 - Math.abs(pf.stepWidth - gf.stepWidth) / Math.max(pf.stepWidth, gf.stepWidth, 0.1);
    const cadenceDiff = 1 - Math.abs(pf.cadence - gf.cadence) / Math.max(pf.cadence, gf.cadence);
    const velocityDiff = 1 - Math.abs(pf.velocity - gf.velocity) / Math.max(pf.velocity, gf.velocity);

    return ((strideDiff + stepWidthDiff + cadenceDiff + velocityDiff) / 4) * 100;
  }

  private compareTemporalFeatures(probe: GaitSignature, gallery: GaitSignature): number {
    if (probe.features.length === 0 || gallery.features.length === 0) return 0;

    const pt = probe.features[0].temporalFeatures;
    const gt = gallery.features[0].temporalFeatures;

    const swingDiff = 1 - Math.abs(pt.swingTime - gt.swingTime) / Math.max(pt.swingTime, gt.swingTime);
    const stanceDiff = 1 - Math.abs(pt.stanceTime - gt.stanceTime) / Math.max(pt.stanceTime, gt.stanceTime);
    const stepTimeDiff = 1 - Math.abs(pt.stepTime - gt.stepTime) / Math.max(pt.stepTime, gt.stepTime);

    return ((swingDiff + stanceDiff + stepTimeDiff) / 3) * 100;
  }

  private compareSummary(probe: GaitSignature, gallery: GaitSignature): number {
    const ps = probe.summary;
    const gs = gallery.summary;

    // Pattern match
    const patternMatch = ps.gaitPattern === gs.gaitPattern ? 1 : 0.5;

    // Velocity similarity
    const velocitySim = 1 - Math.abs(ps.averageVelocity - gs.averageVelocity) /
                        Math.max(ps.averageVelocity, gs.averageVelocity);

    // Cadence similarity
    const cadenceSim = 1 - Math.abs(ps.averageCadence - gs.averageCadence) /
                       Math.max(ps.averageCadence, gs.averageCadence);

    // Asymmetry similarity
    const asymmetrySim = 1 - Math.abs(ps.asymmetry - gs.asymmetry);

    return ((patternMatch + velocitySim + cadenceSim + asymmetrySim) / 4) * 100;
  }

  private calculateConfidence(probe: GaitSignature, gallery: GaitSignature, score: number): number {
    // Higher quality samples give higher confidence
    const probeQuality = probe.features.reduce((sum, f) => sum + f.quality, 0) /
                        (probe.features.length || 1);
    const galleryQuality = gallery.features.reduce((sum, f) => sum + f.quality, 0) /
                          (gallery.features.length || 1);
    const avgQuality = (probeQuality + galleryQuality) / 2;

    return (score / 100) * (avgQuality / 100);
  }
}

// ============================================================================
// Keystroke Dynamics Matching
// ============================================================================

export class KeystrokeMatcher {
  private threshold: number;

  constructor(threshold = 75) {
    this.threshold = threshold;
  }

  /**
   * Compare two keystroke profiles
   */
  match(probe: KeystrokeProfile, gallery: KeystrokeProfile): BehavioralMatchResult {
    const startTime = Date.now();
    const featureScores: Record<string, number> = {};

    // Compare timing statistics
    const timingScore = this.compareTimingStats(probe, gallery);
    featureScores['timing'] = timingScore;

    // Compare digraph patterns
    const digraphScore = this.compareDigraphs(probe, gallery);
    featureScores['digraphs'] = digraphScore;

    // Compare typing characteristics
    const typingScore = this.compareTypingCharacteristics(probe, gallery);
    featureScores['typing'] = typingScore;

    // Weighted combination
    const score = timingScore * 0.4 + digraphScore * 0.35 + typingScore * 0.25;
    const confidence = Math.min(1, score / 100 * 1.1);

    return {
      matchId: crypto.randomUUID(),
      modality: 'KEYSTROKE',
      score,
      confidence,
      isMatch: score >= this.threshold,
      threshold: this.threshold,
      featureScores,
      metadata: {
        processingTime: Date.now() - startTime,
        algorithmVersion: '1.0.0',
        timestamp: new Date().toISOString()
      }
    };
  }

  private compareTimingStats(probe: KeystrokeProfile, gallery: KeystrokeProfile): number {
    const ps = probe.statistics;
    const gs = gallery.statistics;

    // Dwell time comparison using Gaussian similarity
    const dwellSim = this.gaussianSimilarity(ps.averageDwellTime, gs.averageDwellTime,
                                              Math.max(ps.dwellTimeStdDev, gs.dwellTimeStdDev));

    // Flight time comparison
    const flightSim = this.gaussianSimilarity(ps.averageFlightTime, gs.averageFlightTime,
                                               Math.max(ps.flightTimeStdDev, gs.flightTimeStdDev));

    return ((dwellSim + flightSim) / 2) * 100;
  }

  private compareDigraphs(probe: KeystrokeProfile, gallery: KeystrokeProfile): number {
    if (!probe.digraphs || !gallery.digraphs) return 50;

    const probeMap = new Map(probe.digraphs.map(d => [d.pair, d.latency]));
    const galleryMap = new Map(gallery.digraphs.map(d => [d.pair, d.latency]));

    let matchCount = 0;
    let totalSimilarity = 0;

    for (const [pair, probeLatency] of probeMap) {
      const galleryLatency = galleryMap.get(pair);
      if (galleryLatency !== undefined) {
        matchCount++;
        const diff = Math.abs(probeLatency - galleryLatency);
        totalSimilarity += Math.exp(-diff / 50); // Exponential decay
      }
    }

    if (matchCount === 0) return 50;
    return (totalSimilarity / matchCount) * 100;
  }

  private compareTypingCharacteristics(probe: KeystrokeProfile, gallery: KeystrokeProfile): number {
    const ps = probe.statistics;
    const gs = gallery.statistics;

    // Typing speed similarity
    const speedDiff = Math.abs(ps.typingSpeed - gs.typingSpeed);
    const speedSim = Math.exp(-speedDiff / 20);

    // Error rate similarity
    const errorDiff = Math.abs(ps.errorRate - gs.errorRate);
    const errorSim = 1 - errorDiff;

    // Backspace frequency similarity
    const bsFreqDiff = Math.abs(ps.backspaceFrequency - gs.backspaceFrequency);
    const bsFreqSim = 1 - bsFreqDiff;

    return ((speedSim + errorSim + bsFreqSim) / 3) * 100;
  }

  private gaussianSimilarity(v1: number, v2: number, sigma: number): number {
    const diff = v1 - v2;
    return Math.exp(-(diff * diff) / (2 * sigma * sigma + 0.001));
  }
}

// ============================================================================
// Mouse Dynamics Matching
// ============================================================================

export class MouseMatcher {
  private threshold: number;

  constructor(threshold = 70) {
    this.threshold = threshold;
  }

  /**
   * Compare two mouse profiles
   */
  match(probe: MouseProfile, gallery: MouseProfile): BehavioralMatchResult {
    const startTime = Date.now();
    const featureScores: Record<string, number> = {};

    // Compare movement statistics
    const movementScore = this.compareMovementStats(probe, gallery);
    featureScores['movement'] = movementScore;

    // Compare click patterns
    const clickScore = this.compareClickPatterns(probe, gallery);
    featureScores['clicks'] = clickScore;

    // Compare patterns
    const patternScore = this.comparePatterns(probe, gallery);
    featureScores['patterns'] = patternScore;

    const score = movementScore * 0.4 + clickScore * 0.3 + patternScore * 0.3;
    const confidence = Math.min(1, score / 100);

    return {
      matchId: crypto.randomUUID(),
      modality: 'MOUSE',
      score,
      confidence,
      isMatch: score >= this.threshold,
      threshold: this.threshold,
      featureScores,
      metadata: {
        processingTime: Date.now() - startTime,
        algorithmVersion: '1.0.0',
        timestamp: new Date().toISOString()
      }
    };
  }

  private compareMovementStats(probe: MouseProfile, gallery: MouseProfile): number {
    const ps = probe.statistics;
    const gs = gallery.statistics;

    const velocitySim = 1 - Math.abs(ps.averageVelocity - gs.averageVelocity) /
                        Math.max(ps.averageVelocity, gs.averageVelocity, 1);

    const accelSim = 1 - Math.abs(ps.averageAcceleration - gs.averageAcceleration) /
                    Math.max(ps.averageAcceleration, gs.averageAcceleration, 1);

    const smoothSim = 1 - Math.abs(ps.movementSmothness - gs.movementSmothness);

    return ((velocitySim + accelSim + smoothSim) / 3) * 100;
  }

  private compareClickPatterns(probe: MouseProfile, gallery: MouseProfile): number {
    const ps = probe.statistics;
    const gs = gallery.statistics;

    const clickRateSim = 1 - Math.abs(ps.clickRate - gs.clickRate) /
                         Math.max(ps.clickRate, gs.clickRate, 0.1);

    const dblClickSim = 1 - Math.abs(ps.doubleClickSpeed - gs.doubleClickSpeed) /
                        Math.max(ps.doubleClickSpeed, gs.doubleClickSpeed, 1);

    return ((clickRateSim + dblClickSim) / 2) * 100;
  }

  private comparePatterns(probe: MouseProfile, gallery: MouseProfile): number {
    if (!probe.patterns || !gallery.patterns) return 50;

    const pp = probe.patterns;
    const gp = gallery.patterns;

    // Movement style match
    const styleMatch = pp.movementStyle === gp.movementStyle ? 100 : 50;

    // Preferred direction similarity (angle in degrees)
    const dirDiff = Math.abs(pp.preferredDirection - gp.preferredDirection);
    const dirSim = (1 - Math.min(dirDiff, 360 - dirDiff) / 180) * 100;

    return (styleMatch + dirSim) / 2;
  }
}

// ============================================================================
// Signature Dynamics Matching
// ============================================================================

export class SignatureMatcher {
  private threshold: number;

  constructor(threshold = 80) {
    this.threshold = threshold;
  }

  /**
   * Compare two signature profiles using DTW
   */
  match(probe: SignatureProfile, gallery: SignatureProfile): BehavioralMatchResult {
    const startTime = Date.now();
    const featureScores: Record<string, number> = {};

    // Compare global features
    const globalScore = this.compareGlobalFeatures(probe, gallery);
    featureScores['global'] = globalScore;

    // Compare stroke patterns using DTW
    const strokeScore = this.compareStrokes(probe, gallery);
    featureScores['strokes'] = strokeScore;

    // Compare pressure dynamics
    const pressureScore = this.comparePressure(probe, gallery);
    featureScores['pressure'] = pressureScore;

    const score = globalScore * 0.3 + strokeScore * 0.5 + pressureScore * 0.2;
    const confidence = Math.min(1, score / 100);

    return {
      matchId: crypto.randomUUID(),
      modality: 'SIGNATURE',
      score,
      confidence,
      isMatch: score >= this.threshold,
      threshold: this.threshold,
      featureScores,
      metadata: {
        processingTime: Date.now() - startTime,
        algorithmVersion: '1.0.0',
        timestamp: new Date().toISOString()
      }
    };
  }

  private compareGlobalFeatures(probe: SignatureProfile, gallery: SignatureProfile): number {
    const pf = probe.features;
    const gf = gallery.features;

    // Duration similarity
    const durationSim = 1 - Math.abs(pf.totalDuration - gf.totalDuration) /
                        Math.max(pf.totalDuration, gf.totalDuration);

    // Length similarity
    const lengthSim = 1 - Math.abs(pf.totalLength - gf.totalLength) /
                      Math.max(pf.totalLength, gf.totalLength);

    // Stroke count similarity
    const strokeSim = 1 - Math.abs(pf.numberOfStrokes - gf.numberOfStrokes) /
                      Math.max(pf.numberOfStrokes, gf.numberOfStrokes);

    // Aspect ratio similarity
    const aspectSim = 1 - Math.abs(pf.aspectRatio - gf.aspectRatio) /
                      Math.max(pf.aspectRatio, gf.aspectRatio);

    // Slant similarity
    const slantSim = 1 - Math.abs(pf.slant - gf.slant) / 90;

    return ((durationSim + lengthSim + strokeSim + aspectSim + slantSim) / 5) * 100;
  }

  private compareStrokes(probe: SignatureProfile, gallery: SignatureProfile): number {
    // Simplified DTW-like comparison
    const minStrokes = Math.min(probe.strokes.length, gallery.strokes.length);
    if (minStrokes === 0) return 0;

    let totalSimilarity = 0;
    for (let i = 0; i < minStrokes; i++) {
      const ps = probe.strokes[i];
      const gs = gallery.strokes[i];

      // Compare stroke durations
      const durSim = 1 - Math.abs(ps.duration - gs.duration) / Math.max(ps.duration, gs.duration);

      // Compare point counts
      const pointSim = 1 - Math.abs(ps.points.length - gs.points.length) /
                       Math.max(ps.points.length, gs.points.length);

      totalSimilarity += (durSim + pointSim) / 2;
    }

    // Penalize for different stroke counts
    const strokeCountPenalty = minStrokes / Math.max(probe.strokes.length, gallery.strokes.length);

    return (totalSimilarity / minStrokes) * strokeCountPenalty * 100;
  }

  private comparePressure(probe: SignatureProfile, gallery: SignatureProfile): number {
    const pf = probe.features;
    const gf = gallery.features;

    const pressureSim = 1 - Math.abs(pf.averagePressure - gf.averagePressure);
    const velocitySim = 1 - Math.abs(pf.averageVelocity - gf.averageVelocity) /
                        Math.max(pf.averageVelocity, gf.averageVelocity, 0.1);

    return ((pressureSim + velocitySim) / 2) * 100;
  }
}

// ============================================================================
// Voice Pattern Matching
// ============================================================================

export class VoiceMatcher {
  private threshold: number;

  constructor(threshold = 75) {
    this.threshold = threshold;
  }

  /**
   * Compare two voice profiles
   */
  match(probe: VoiceProfile, gallery: VoiceProfile): BehavioralMatchResult {
    const startTime = Date.now();
    const featureScores: Record<string, number> = {};

    // Compare acoustic features
    const acousticScore = this.compareAcousticFeatures(probe, gallery);
    featureScores['acoustic'] = acousticScore;

    // Compare prosodic features
    const prosodicScore = this.compareProsody(probe, gallery);
    featureScores['prosody'] = prosodicScore;

    // Compare voice quality
    const qualityScore = this.compareVoiceQuality(probe, gallery);
    featureScores['quality'] = qualityScore;

    const score = acousticScore * 0.5 + prosodicScore * 0.3 + qualityScore * 0.2;
    const confidence = Math.min(1, score / 100);

    return {
      matchId: crypto.randomUUID(),
      modality: 'VOICE',
      score,
      confidence,
      isMatch: score >= this.threshold,
      threshold: this.threshold,
      featureScores,
      metadata: {
        processingTime: Date.now() - startTime,
        algorithmVersion: '1.0.0',
        timestamp: new Date().toISOString()
      }
    };
  }

  private compareAcousticFeatures(probe: VoiceProfile, gallery: VoiceProfile): number {
    const pf = probe.features;
    const gf = gallery.features;

    // Fundamental frequency similarity
    const f0Sim = 1 - Math.abs(pf.fundamentalFrequency - gf.fundamentalFrequency) /
                  Math.max(pf.fundamentalFrequency, gf.fundamentalFrequency);

    // Formant similarity (compare first few formants)
    const minFormants = Math.min(pf.formants.length, gf.formants.length);
    let formantSim = 0;
    for (let i = 0; i < minFormants; i++) {
      formantSim += 1 - Math.abs(pf.formants[i] - gf.formants[i]) /
                   Math.max(pf.formants[i], gf.formants[i]);
    }
    formantSim = minFormants > 0 ? formantSim / minFormants : 0.5;

    // Pitch range similarity
    const pitchRangeSim = this.comparePitchRange(pf.pitchRange, gf.pitchRange);

    return ((f0Sim + formantSim + pitchRangeSim) / 3) * 100;
  }

  private comparePitchRange(
    pr1: { min: number; max: number; mean: number },
    pr2: { min: number; max: number; mean: number }
  ): number {
    const rangeSim1 = 1 - Math.abs((pr1.max - pr1.min) - (pr2.max - pr2.min)) /
                      Math.max(pr1.max - pr1.min, pr2.max - pr2.min, 1);
    const meanSim = 1 - Math.abs(pr1.mean - pr2.mean) / Math.max(pr1.mean, pr2.mean);
    return (rangeSim1 + meanSim) / 2;
  }

  private compareProsody(probe: VoiceProfile, gallery: VoiceProfile): number {
    const pf = probe.features;
    const gf = gallery.features;

    // Speaking rate similarity
    const rateSim = 1 - Math.abs(pf.speakingRate - gf.speakingRate) /
                   Math.max(pf.speakingRate, gf.speakingRate);

    // Articulation rate similarity
    const articSim = 1 - Math.abs(pf.articulationRate - gf.articulationRate) /
                    Math.max(pf.articulationRate, gf.articulationRate);

    return ((rateSim + articSim) / 2) * 100;
  }

  private compareVoiceQuality(probe: VoiceProfile, gallery: VoiceProfile): number {
    const pf = probe.features;
    const gf = gallery.features;

    // Jitter similarity
    const jitterSim = 1 - Math.abs(pf.jitter - gf.jitter) / Math.max(pf.jitter, gf.jitter, 0.001);

    // Shimmer similarity
    const shimmerSim = 1 - Math.abs(pf.shimmer - gf.shimmer) / Math.max(pf.shimmer, gf.shimmer, 0.001);

    // HNR similarity
    const hnrSim = 1 - Math.abs(pf.harmonicToNoiseRatio - gf.harmonicToNoiseRatio) /
                  Math.max(Math.abs(pf.harmonicToNoiseRatio), Math.abs(gf.harmonicToNoiseRatio), 1);

    return ((jitterSim + shimmerSim + hnrSim) / 3) * 100;
  }
}

// ============================================================================
// Unified Behavioral Matching Engine
// ============================================================================

export class BehavioralMatchingEngine {
  private gaitMatcher: GaitMatcher;
  private keystrokeMatcher: KeystrokeMatcher;
  private mouseMatcher: MouseMatcher;
  private signatureMatcher: SignatureMatcher;
  private voiceMatcher: VoiceMatcher;
  private config: BehavioralMatchConfig;

  constructor(config: Partial<BehavioralMatchConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.gaitMatcher = new GaitMatcher(this.config.gaitThreshold);
    this.keystrokeMatcher = new KeystrokeMatcher(this.config.keystrokeThreshold);
    this.mouseMatcher = new MouseMatcher(this.config.mouseThreshold);
    this.signatureMatcher = new SignatureMatcher(this.config.signatureThreshold);
    this.voiceMatcher = new VoiceMatcher(this.config.voiceThreshold);
  }

  /**
   * Match behavioral profiles across all available modalities
   */
  matchProfiles(
    probe: BehavioralProfile,
    gallery: BehavioralProfile
  ): {
    overallScore: number;
    overallConfidence: number;
    isMatch: boolean;
    modalityResults: BehavioralMatchResult[];
  } {
    const results: BehavioralMatchResult[] = [];
    let totalWeightedScore = 0;
    let totalWeight = 0;

    // Gait matching
    if (probe.modalities.gait?.length && gallery.modalities.gait?.length) {
      const result = this.gaitMatcher.match(
        probe.modalities.gait[0],
        gallery.modalities.gait[0]
      );
      results.push(result);
      totalWeightedScore += result.score * this.config.fusionWeights.gait;
      totalWeight += this.config.fusionWeights.gait;
    }

    // Keystroke matching
    if (probe.modalities.keystroke?.length && gallery.modalities.keystroke?.length) {
      const result = this.keystrokeMatcher.match(
        probe.modalities.keystroke[0],
        gallery.modalities.keystroke[0]
      );
      results.push(result);
      totalWeightedScore += result.score * this.config.fusionWeights.keystroke;
      totalWeight += this.config.fusionWeights.keystroke;
    }

    // Mouse matching
    if (probe.modalities.mouse?.length && gallery.modalities.mouse?.length) {
      const result = this.mouseMatcher.match(
        probe.modalities.mouse[0],
        gallery.modalities.mouse[0]
      );
      results.push(result);
      totalWeightedScore += result.score * this.config.fusionWeights.mouse;
      totalWeight += this.config.fusionWeights.mouse;
    }

    // Signature matching
    if (probe.modalities.signature?.length && gallery.modalities.signature?.length) {
      const result = this.signatureMatcher.match(
        probe.modalities.signature[0],
        gallery.modalities.signature[0]
      );
      results.push(result);
      totalWeightedScore += result.score * this.config.fusionWeights.signature;
      totalWeight += this.config.fusionWeights.signature;
    }

    // Voice matching
    if (probe.modalities.voice?.length && gallery.modalities.voice?.length) {
      const result = this.voiceMatcher.match(
        probe.modalities.voice[0],
        gallery.modalities.voice[0]
      );
      results.push(result);
      totalWeightedScore += result.score * this.config.fusionWeights.voice;
      totalWeight += this.config.fusionWeights.voice;
    }

    const overallScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
    const overallConfidence = results.reduce((sum, r) => sum + r.confidence, 0) /
                             (results.length || 1);

    return {
      overallScore,
      overallConfidence,
      isMatch: overallScore >= 70 && results.filter(r => r.isMatch).length >= results.length / 2,
      modalityResults: results
    };
  }

  /**
   * Continuous authentication using behavioral biometrics
   */
  continuousAuth(
    baseline: BehavioralProfile,
    current: Partial<{
      keystroke: KeystrokeProfile;
      mouse: MouseProfile;
      touch: TouchProfile;
    }>
  ): {
    authenticated: boolean;
    confidence: number;
    anomalies: string[];
  } {
    const anomalies: string[] = [];
    let totalScore = 0;
    let checks = 0;

    if (current.keystroke && baseline.modalities.keystroke?.length) {
      const result = this.keystrokeMatcher.match(current.keystroke, baseline.modalities.keystroke[0]);
      totalScore += result.score;
      checks++;
      if (!result.isMatch) {
        anomalies.push('Keystroke pattern deviation detected');
      }
    }

    if (current.mouse && baseline.modalities.mouse?.length) {
      const result = this.mouseMatcher.match(current.mouse, baseline.modalities.mouse[0]);
      totalScore += result.score;
      checks++;
      if (!result.isMatch) {
        anomalies.push('Mouse movement pattern deviation detected');
      }
    }

    const avgScore = checks > 0 ? totalScore / checks : 0;

    return {
      authenticated: avgScore >= 65 && anomalies.length < checks,
      confidence: avgScore / 100,
      anomalies
    };
  }
}

export default BehavioralMatchingEngine;
