/**
 * Liveness Detection Module
 *
 * Anti-spoofing measures for facial biometric verification including
 * passive, active, and hybrid liveness detection.
 */

import { LivenessAssessment, LivenessType, LivenessResult } from '@intelgraph/biometrics';

// ============================================================================
// Types
// ============================================================================

export type SpoofType = 'PHOTO' | 'VIDEO' | 'MASK' | 'DEEPFAKE' | 'CUTOUT' | 'SCREEN' | 'NONE';

export interface LivenessCheck {
  name: string;
  passed: boolean;
  score: number;
  confidence: number;
  details?: Record<string, unknown>;
}

export interface PassiveLivenessInput {
  // Texture analysis
  laplacianVariance: number;
  colorHistogram: number[];
  localBinaryPatterns: number[];

  // Depth analysis (if available)
  hasDepthMap: boolean;
  depthVariance?: number;

  // Reflection analysis
  specularReflections: number;
  diffuseReflections: number;

  // Moiré pattern detection
  moireScore: number;

  // Screen detection
  screenPatternScore: number;
  pixelGridScore: number;

  // Image statistics
  jpegArtifacts: number;
  noisePattern: number;
  edgeSharpness: number;
}

export interface ActiveLivenessInput {
  // Challenge-response
  challengeType: 'BLINK' | 'SMILE' | 'TURN_HEAD' | 'NOD' | 'OPEN_MOUTH' | 'RAISE_EYEBROW';
  challengeCompleted: boolean;
  responseTime: number; // milliseconds

  // Motion analysis
  naturalMotion: boolean;
  motionSmothness: number;

  // 3D consistency
  depthConsistency: number;
  perspectiveConsistency: number;

  // Timing
  blinkRate?: number; // blinks per minute
  microExpressions?: number;
}

export interface DeepfakeDetectionInput {
  // Face consistency
  faceBoundaryBlur: number;
  blendingArtifacts: number;

  // Temporal consistency (for video)
  frameConsistency: number;
  flickerScore: number;

  // Physiological signals
  ppgSignalPresent: boolean;
  ppgSignalStrength?: number;

  // GAN artifact detection
  ganArtifactScore: number;
  compressionInconsistency: number;

  // Eye analysis
  cornealReflectionConsistency: number;
  pupilReactionNatural: boolean;
}

// ============================================================================
// Passive Liveness Detection
// ============================================================================

export class PassiveLivenessDetector {
  private thresholds = {
    laplacianVariance: 100, // Minimum variance for real face
    moireThreshold: 0.3,
    screenPatternThreshold: 0.4,
    specularThreshold: 0.5,
    jpegArtifactThreshold: 0.6
  };

  /**
   * Detect spoofing using passive analysis
   */
  detect(input: PassiveLivenessInput): LivenessAssessment {
    const checks: LivenessCheck[] = [];
    let totalScore = 0;
    let totalWeight = 0;

    // Texture analysis (detects printed photos)
    const textureScore = this.analyzeTexture(input);
    checks.push(textureScore);
    totalScore += textureScore.score * 0.25;
    totalWeight += 0.25;

    // Screen detection (detects digital displays)
    const screenScore = this.detectScreen(input);
    checks.push(screenScore);
    totalScore += screenScore.score * 0.20;
    totalWeight += 0.20;

    // Moiré pattern detection
    const moireScore = this.detectMoire(input);
    checks.push(moireScore);
    totalScore += moireScore.score * 0.15;
    totalWeight += 0.15;

    // Reflection analysis
    const reflectionScore = this.analyzeReflections(input);
    checks.push(reflectionScore);
    totalScore += reflectionScore.score * 0.20;
    totalWeight += 0.20;

    // Depth analysis (if available)
    if (input.hasDepthMap) {
      const depthScore = this.analyzeDepth(input);
      checks.push(depthScore);
      totalScore += depthScore.score * 0.20;
      totalWeight += 0.20;
    }

    const normalizedScore = totalWeight > 0 ? totalScore / totalWeight * 100 : 0;
    const allPassed = checks.every(c => c.passed);
    const confidence = checks.reduce((sum, c) => sum + c.confidence, 0) / checks.length;

    // Determine spoof type if detected
    let spoofType: SpoofType = 'NONE';
    if (!allPassed || normalizedScore < 50) {
      if (!screenScore.passed) spoofType = 'SCREEN';
      else if (!moireScore.passed) spoofType = 'PHOTO';
      else if (!textureScore.passed) spoofType = 'PHOTO';
    }

    return {
      type: LivenessType.PASSIVE,
      result: normalizedScore >= 70 ? LivenessResult.LIVE :
              normalizedScore >= 40 ? LivenessResult.UNCERTAIN : LivenessResult.SPOOF,
      confidence,
      score: normalizedScore,
      spoofType: spoofType === 'NONE' ? undefined : spoofType,
      checks,
      timestamp: new Date().toISOString()
    };
  }

  private analyzeTexture(input: PassiveLivenessInput): LivenessCheck {
    const score = Math.min(100, input.laplacianVariance / this.thresholds.laplacianVariance * 100);
    return {
      name: 'TEXTURE_ANALYSIS',
      passed: score >= 60,
      score,
      confidence: 0.8
    };
  }

  private detectScreen(input: PassiveLivenessInput): LivenessCheck {
    const screenScore = 100 - (input.screenPatternScore + input.pixelGridScore) * 50;
    return {
      name: 'SCREEN_DETECTION',
      passed: screenScore >= 70,
      score: Math.max(0, screenScore),
      confidence: 0.85
    };
  }

  private detectMoire(input: PassiveLivenessInput): LivenessCheck {
    const score = (1 - input.moireScore) * 100;
    return {
      name: 'MOIRE_DETECTION',
      passed: score >= 70,
      score: Math.max(0, score),
      confidence: 0.75
    };
  }

  private analyzeReflections(input: PassiveLivenessInput): LivenessCheck {
    // Real faces have more diffuse, less specular reflections
    const ratio = input.diffuseReflections / (input.specularReflections + 0.01);
    const score = Math.min(100, ratio * 30);
    return {
      name: 'REFLECTION_ANALYSIS',
      passed: score >= 50,
      score,
      confidence: 0.7
    };
  }

  private analyzeDepth(input: PassiveLivenessInput): LivenessCheck {
    const score = input.depthVariance ? Math.min(100, input.depthVariance * 10) : 0;
    return {
      name: 'DEPTH_ANALYSIS',
      passed: score >= 60,
      score,
      confidence: 0.9
    };
  }
}

// ============================================================================
// Active Liveness Detection
// ============================================================================

export class ActiveLivenessDetector {
  /**
   * Detect spoofing using active challenges
   */
  detect(input: ActiveLivenessInput): LivenessAssessment {
    const checks: LivenessCheck[] = [];

    // Challenge completion
    const challengeCheck: LivenessCheck = {
      name: 'CHALLENGE_RESPONSE',
      passed: input.challengeCompleted,
      score: input.challengeCompleted ? 100 : 0,
      confidence: 0.95,
      details: {
        challengeType: input.challengeType,
        responseTime: input.responseTime
      }
    };
    checks.push(challengeCheck);

    // Response time (too fast = replay attack)
    const minResponseTime = 500; // ms
    const maxResponseTime = 5000; // ms
    const responseTimeValid = input.responseTime >= minResponseTime && input.responseTime <= maxResponseTime;
    checks.push({
      name: 'RESPONSE_TIMING',
      passed: responseTimeValid,
      score: responseTimeValid ? 100 : 0,
      confidence: 0.8
    });

    // Natural motion
    checks.push({
      name: 'NATURAL_MOTION',
      passed: input.naturalMotion,
      score: input.naturalMotion ? 80 + input.motionSmothness * 0.2 : 20,
      confidence: 0.85
    });

    // 3D consistency
    const consistencyScore = (input.depthConsistency + input.perspectiveConsistency) / 2 * 100;
    checks.push({
      name: '3D_CONSISTENCY',
      passed: consistencyScore >= 60,
      score: consistencyScore,
      confidence: 0.9
    });

    // Blink rate (if measured)
    if (input.blinkRate !== undefined) {
      const naturalBlinkRate = input.blinkRate >= 10 && input.blinkRate <= 30;
      checks.push({
        name: 'BLINK_RATE',
        passed: naturalBlinkRate,
        score: naturalBlinkRate ? 100 : 30,
        confidence: 0.7
      });
    }

    const avgScore = checks.reduce((sum, c) => sum + c.score, 0) / checks.length;
    const allPassed = checks.every(c => c.passed);
    const confidence = checks.reduce((sum, c) => sum + c.confidence, 0) / checks.length;

    return {
      type: LivenessType.ACTIVE,
      result: allPassed && avgScore >= 70 ? LivenessResult.LIVE :
              avgScore >= 40 ? LivenessResult.UNCERTAIN : LivenessResult.SPOOF,
      confidence,
      score: avgScore,
      spoofType: !input.challengeCompleted ? 'VIDEO' : undefined,
      checks,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate a random challenge for the user
   */
  generateChallenge(): ActiveLivenessInput['challengeType'] {
    const challenges: ActiveLivenessInput['challengeType'][] = [
      'BLINK', 'SMILE', 'TURN_HEAD', 'NOD', 'OPEN_MOUTH', 'RAISE_EYEBROW'
    ];
    return challenges[Math.floor(Math.random() * challenges.length)];
  }
}

// ============================================================================
// Deepfake Detection
// ============================================================================

export class DeepfakeDetector {
  /**
   * Detect AI-generated or manipulated faces
   */
  detect(input: DeepfakeDetectionInput): LivenessAssessment {
    const checks: LivenessCheck[] = [];

    // Face boundary analysis
    const boundaryScore = (1 - input.faceBoundaryBlur) * 100;
    checks.push({
      name: 'FACE_BOUNDARY',
      passed: boundaryScore >= 70,
      score: boundaryScore,
      confidence: 0.8
    });

    // Blending artifact detection
    const blendingScore = (1 - input.blendingArtifacts) * 100;
    checks.push({
      name: 'BLENDING_ARTIFACTS',
      passed: blendingScore >= 60,
      score: blendingScore,
      confidence: 0.85
    });

    // GAN artifact detection
    const ganScore = (1 - input.ganArtifactScore) * 100;
    checks.push({
      name: 'GAN_ARTIFACTS',
      passed: ganScore >= 65,
      score: ganScore,
      confidence: 0.9
    });

    // Temporal consistency (for video)
    if (input.frameConsistency !== undefined) {
      checks.push({
        name: 'TEMPORAL_CONSISTENCY',
        passed: input.frameConsistency >= 0.8,
        score: input.frameConsistency * 100,
        confidence: 0.85
      });
    }

    // PPG signal (remote photoplethysmography - detects pulse)
    if (input.ppgSignalPresent) {
      const ppgScore = input.ppgSignalStrength ? input.ppgSignalStrength * 100 : 80;
      checks.push({
        name: 'PPG_SIGNAL',
        passed: ppgScore >= 60,
        score: ppgScore,
        confidence: 0.75
      });
    }

    // Corneal reflection
    const cornealScore = input.cornealReflectionConsistency * 100;
    checks.push({
      name: 'CORNEAL_REFLECTION',
      passed: cornealScore >= 70,
      score: cornealScore,
      confidence: 0.8
    });

    // Pupil reaction
    checks.push({
      name: 'PUPIL_REACTION',
      passed: input.pupilReactionNatural,
      score: input.pupilReactionNatural ? 100 : 20,
      confidence: 0.7
    });

    const avgScore = checks.reduce((sum, c) => sum + c.score, 0) / checks.length;
    const allPassed = checks.every(c => c.passed);
    const confidence = checks.reduce((sum, c) => sum + c.confidence, 0) / checks.length;

    let spoofType: SpoofType = 'NONE';
    if (!allPassed || avgScore < 50) {
      if (input.ganArtifactScore > 0.5) spoofType = 'DEEPFAKE';
      else if (input.frameConsistency !== undefined && input.frameConsistency < 0.6) spoofType = 'VIDEO';
    }

    return {
      type: LivenessType.PASSIVE, // Deepfake detection is passive
      result: allPassed && avgScore >= 70 ? LivenessResult.LIVE :
              avgScore >= 40 ? LivenessResult.UNCERTAIN : LivenessResult.SPOOF,
      confidence,
      score: avgScore,
      spoofType: spoofType === 'NONE' ? undefined : spoofType,
      checks,
      timestamp: new Date().toISOString()
    };
  }
}

// ============================================================================
// Hybrid Liveness Engine
// ============================================================================

export class HybridLivenessEngine {
  private passiveDetector = new PassiveLivenessDetector();
  private activeDetector = new ActiveLivenessDetector();
  private deepfakeDetector = new DeepfakeDetector();

  /**
   * Perform comprehensive liveness detection combining multiple methods
   */
  detect(
    passiveInput?: PassiveLivenessInput,
    activeInput?: ActiveLivenessInput,
    deepfakeInput?: DeepfakeDetectionInput
  ): LivenessAssessment {
    const assessments: LivenessAssessment[] = [];
    const weights: number[] = [];

    // Passive liveness
    if (passiveInput) {
      assessments.push(this.passiveDetector.detect(passiveInput));
      weights.push(0.3);
    }

    // Active liveness
    if (activeInput) {
      assessments.push(this.activeDetector.detect(activeInput));
      weights.push(0.4);
    }

    // Deepfake detection
    if (deepfakeInput) {
      assessments.push(this.deepfakeDetector.detect(deepfakeInput));
      weights.push(0.3);
    }

    if (assessments.length === 0) {
      throw new Error('At least one liveness input is required');
    }

    // Combine results
    let totalScore = 0;
    let totalWeight = 0;
    const allChecks: LivenessCheck[] = [];

    for (let i = 0; i < assessments.length; i++) {
      totalScore += assessments[i].score * weights[i];
      totalWeight += weights[i];
      allChecks.push(...assessments[i].checks);
    }

    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    const confidence = assessments.reduce((sum, a) => sum + a.confidence, 0) / assessments.length;

    // Determine final result
    let result = LivenessResult.LIVE;
    if (finalScore < 40) {
      result = LivenessResult.SPOOF;
    } else if (finalScore < 70 || assessments.some(a => a.result === LivenessResult.SPOOF)) {
      result = LivenessResult.UNCERTAIN;
    }

    // Find most likely spoof type
    let spoofType: SpoofType | undefined;
    for (const assessment of assessments) {
      if (assessment.spoofType) {
        spoofType = assessment.spoofType as SpoofType;
        break;
      }
    }

    return {
      type: LivenessType.HYBRID,
      result,
      confidence,
      score: finalScore,
      spoofType,
      checks: allChecks,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get active liveness challenge
   */
  getChallenge(): ActiveLivenessInput['challengeType'] {
    return this.activeDetector.generateChallenge();
  }
}

export default HybridLivenessEngine;
