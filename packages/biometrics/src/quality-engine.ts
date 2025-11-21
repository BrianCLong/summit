/**
 * Biometric Quality Assessment Engine
 *
 * Comprehensive quality assessment for biometric samples across
 * multiple modalities including face, fingerprint, iris, and more.
 */

import {
  BiometricModality,
  BiometricQuality,
  BiometricTemplate,
  QualityError
} from './types.js';

// ============================================================================
// Quality Metrics
// ============================================================================

export interface QualityMetrics {
  overall: number;
  components: {
    resolution?: number;
    contrast?: number;
    sharpness?: number;
    lighting?: number;
    uniformity?: number;
    noise?: number;
    occlusion?: number;
    pose?: number;
    expression?: number;
    compression?: number;
  };
  issues: QualityIssue[];
  recommendations: string[];
}

export interface QualityIssue {
  code: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  impact: number; // Score reduction
}

export interface QualityThresholds {
  minimum: number;
  acceptable: number;
  good: number;
  excellent: number;
}

// ============================================================================
// Face Quality Assessment
// ============================================================================

export interface FaceQualityInput {
  imageWidth: number;
  imageHeight: number;
  faceWidth: number;
  faceHeight: number;
  brightness: number; // 0-255
  contrast: number; // 0-100
  sharpness: number; // 0-100
  eyesOpen: boolean;
  mouthClosed: boolean;
  frontal: boolean;
  poseYaw: number; // degrees
  posePitch: number; // degrees
  poseRoll: number; // degrees
  occlusionPercent: number;
  illuminationUniformity: number; // 0-100
  backgroundUniformity: number; // 0-100
  jpegQuality?: number; // 0-100
}

export class FaceQualityAssessor {
  private thresholds: QualityThresholds = {
    minimum: 40,
    acceptable: 60,
    good: 75,
    excellent: 90
  };

  /**
   * Assess face image quality
   */
  assess(input: FaceQualityInput): QualityMetrics {
    const issues: QualityIssue[] = [];
    const recommendations: string[] = [];
    const components: QualityMetrics['components'] = {};

    // Resolution assessment
    const minFaceSize = 90; // ICAO minimum inter-eye distance equivalent
    const facePixels = Math.min(input.faceWidth, input.faceHeight);
    components.resolution = Math.min(100, (facePixels / minFaceSize) * 50);
    if (facePixels < minFaceSize) {
      issues.push({
        code: 'LOW_RESOLUTION',
        severity: 'HIGH',
        description: `Face size ${facePixels}px below minimum ${minFaceSize}px`,
        impact: 20
      });
      recommendations.push('Capture image with higher resolution or move closer to subject');
    }

    // Lighting assessment
    const idealBrightness = 127;
    const brightnessDiff = Math.abs(input.brightness - idealBrightness);
    components.lighting = Math.max(0, 100 - brightnessDiff * 0.5);
    if (input.brightness < 50) {
      issues.push({
        code: 'UNDEREXPOSED',
        severity: 'MEDIUM',
        description: 'Image is too dark',
        impact: 15
      });
      recommendations.push('Increase lighting or adjust camera exposure');
    } else if (input.brightness > 200) {
      issues.push({
        code: 'OVEREXPOSED',
        severity: 'MEDIUM',
        description: 'Image is too bright',
        impact: 15
      });
      recommendations.push('Reduce lighting or adjust camera exposure');
    }

    // Contrast assessment
    components.contrast = input.contrast;
    if (input.contrast < 40) {
      issues.push({
        code: 'LOW_CONTRAST',
        severity: 'MEDIUM',
        description: 'Image has low contrast',
        impact: 10
      });
      recommendations.push('Improve lighting contrast');
    }

    // Sharpness assessment
    components.sharpness = input.sharpness;
    if (input.sharpness < 50) {
      issues.push({
        code: 'BLURRY',
        severity: 'HIGH',
        description: 'Image is not sharp',
        impact: 20
      });
      recommendations.push('Ensure camera is focused and subject is stationary');
    }

    // Pose assessment
    const maxYaw = 15;
    const maxPitch = 15;
    const maxRoll = 10;
    const poseScore = Math.max(0, 100 -
      Math.abs(input.poseYaw) * 2 -
      Math.abs(input.posePitch) * 2 -
      Math.abs(input.poseRoll) * 3
    );
    components.pose = poseScore;

    if (Math.abs(input.poseYaw) > maxYaw) {
      issues.push({
        code: 'NON_FRONTAL_YAW',
        severity: 'MEDIUM',
        description: `Face yaw ${input.poseYaw}° exceeds ±${maxYaw}°`,
        impact: 10
      });
      recommendations.push('Subject should face the camera directly');
    }
    if (Math.abs(input.posePitch) > maxPitch) {
      issues.push({
        code: 'NON_FRONTAL_PITCH',
        severity: 'MEDIUM',
        description: `Face pitch ${input.posePitch}° exceeds ±${maxPitch}°`,
        impact: 10
      });
      recommendations.push('Subject should look straight ahead');
    }
    if (Math.abs(input.poseRoll) > maxRoll) {
      issues.push({
        code: 'HEAD_TILT',
        severity: 'LOW',
        description: `Head roll ${input.poseRoll}° exceeds ±${maxRoll}°`,
        impact: 5
      });
      recommendations.push('Subject should keep head level');
    }

    // Expression assessment
    components.expression = (input.eyesOpen ? 50 : 0) + (input.mouthClosed ? 50 : 25);
    if (!input.eyesOpen) {
      issues.push({
        code: 'EYES_CLOSED',
        severity: 'HIGH',
        description: 'Eyes are closed',
        impact: 25
      });
      recommendations.push('Ensure eyes are open');
    }
    if (!input.mouthClosed) {
      issues.push({
        code: 'MOUTH_OPEN',
        severity: 'LOW',
        description: 'Mouth is open',
        impact: 5
      });
      recommendations.push('Subject should close mouth');
    }

    // Occlusion assessment
    components.occlusion = Math.max(0, 100 - input.occlusionPercent);
    if (input.occlusionPercent > 10) {
      issues.push({
        code: 'FACE_OCCLUDED',
        severity: input.occlusionPercent > 30 ? 'HIGH' : 'MEDIUM',
        description: `${input.occlusionPercent}% of face is occluded`,
        impact: input.occlusionPercent * 0.5
      });
      recommendations.push('Remove objects covering face (glasses, masks, hair)');
    }

    // Uniformity assessment
    components.uniformity = (input.illuminationUniformity + input.backgroundUniformity) / 2;
    if (input.illuminationUniformity < 60) {
      issues.push({
        code: 'UNEVEN_LIGHTING',
        severity: 'MEDIUM',
        description: 'Uneven facial illumination',
        impact: 10
      });
      recommendations.push('Use diffused, even lighting');
    }

    // Compression assessment
    if (input.jpegQuality !== undefined) {
      components.compression = input.jpegQuality;
      if (input.jpegQuality < 70) {
        issues.push({
          code: 'HIGH_COMPRESSION',
          severity: 'MEDIUM',
          description: 'Image has high compression artifacts',
          impact: 10
        });
        recommendations.push('Use higher quality image format or less compression');
      }
    }

    // Calculate overall score
    let overall = 100;
    for (const issue of issues) {
      overall -= issue.impact;
    }
    overall = Math.max(0, Math.min(100, overall));

    return {
      overall,
      components,
      issues,
      recommendations
    };
  }

  /**
   * Check if quality meets minimum threshold
   */
  meetsMinimum(metrics: QualityMetrics): boolean {
    return metrics.overall >= this.thresholds.minimum;
  }

  /**
   * Get quality level
   */
  getQualityLevel(score: number): 'POOR' | 'ACCEPTABLE' | 'GOOD' | 'EXCELLENT' {
    if (score >= this.thresholds.excellent) return 'EXCELLENT';
    if (score >= this.thresholds.good) return 'GOOD';
    if (score >= this.thresholds.acceptable) return 'ACCEPTABLE';
    return 'POOR';
  }
}

// ============================================================================
// Fingerprint Quality Assessment
// ============================================================================

export interface FingerprintQualityInput {
  imageWidth: number;
  imageHeight: number;
  dpi: number;
  minutiaeCount: number;
  ridgeClarity: number; // 0-100
  ridgeFrequency: number; // ridges per mm
  moistureLevel: 'DRY' | 'NORMAL' | 'WET';
  pressure: 'LOW' | 'NORMAL' | 'HIGH';
  coverage: number; // percentage of sensor covered
  contrast: number; // 0-100
  nfiqScore?: number; // NIST Fingerprint Image Quality
}

export class FingerprintQualityAssessor {
  private thresholds: QualityThresholds = {
    minimum: 35,
    acceptable: 50,
    good: 70,
    excellent: 85
  };

  /**
   * Assess fingerprint image quality
   */
  assess(input: FingerprintQualityInput): QualityMetrics {
    const issues: QualityIssue[] = [];
    const recommendations: string[] = [];
    const components: QualityMetrics['components'] = {};

    // Resolution assessment (FBI standard is 500 dpi)
    const idealDpi = 500;
    components.resolution = Math.min(100, (input.dpi / idealDpi) * 100);
    if (input.dpi < 500) {
      issues.push({
        code: 'LOW_DPI',
        severity: 'HIGH',
        description: `DPI ${input.dpi} below standard ${idealDpi}`,
        impact: 20
      });
      recommendations.push('Use scanner with minimum 500 DPI');
    }

    // Minutiae assessment
    const minMinutiae = 12; // Minimum for identification
    if (input.minutiaeCount < minMinutiae) {
      issues.push({
        code: 'LOW_MINUTIAE',
        severity: 'HIGH',
        description: `Only ${input.minutiaeCount} minutiae detected (minimum ${minMinutiae})`,
        impact: 25
      });
      recommendations.push('Reposition finger and apply consistent pressure');
    }

    // Ridge clarity
    components.sharpness = input.ridgeClarity;
    if (input.ridgeClarity < 50) {
      issues.push({
        code: 'UNCLEAR_RIDGES',
        severity: 'MEDIUM',
        description: 'Ridge patterns are not clear',
        impact: 15
      });
      recommendations.push('Clean finger and sensor surface');
    }

    // Moisture assessment
    if (input.moistureLevel === 'DRY') {
      issues.push({
        code: 'DRY_FINGER',
        severity: 'MEDIUM',
        description: 'Finger is too dry',
        impact: 10
      });
      recommendations.push('Lightly moisturize finger before capture');
    } else if (input.moistureLevel === 'WET') {
      issues.push({
        code: 'WET_FINGER',
        severity: 'MEDIUM',
        description: 'Finger is too wet',
        impact: 10
      });
      recommendations.push('Dry finger before capture');
    }

    // Pressure assessment
    if (input.pressure === 'LOW') {
      issues.push({
        code: 'LOW_PRESSURE',
        severity: 'MEDIUM',
        description: 'Insufficient pressure on sensor',
        impact: 10
      });
      recommendations.push('Apply firmer, consistent pressure');
    } else if (input.pressure === 'HIGH') {
      issues.push({
        code: 'HIGH_PRESSURE',
        severity: 'MEDIUM',
        description: 'Too much pressure distorting print',
        impact: 10
      });
      recommendations.push('Apply lighter, consistent pressure');
    }

    // Coverage assessment
    if (input.coverage < 70) {
      issues.push({
        code: 'LOW_COVERAGE',
        severity: input.coverage < 50 ? 'HIGH' : 'MEDIUM',
        description: `Only ${input.coverage}% sensor coverage`,
        impact: (100 - input.coverage) * 0.2
      });
      recommendations.push('Center finger on sensor');
    }

    // Contrast assessment
    components.contrast = input.contrast;
    if (input.contrast < 40) {
      issues.push({
        code: 'LOW_CONTRAST',
        severity: 'MEDIUM',
        description: 'Low contrast between ridges and valleys',
        impact: 10
      });
      recommendations.push('Clean sensor and adjust capture settings');
    }

    // Use NFIQ score if available
    if (input.nfiqScore !== undefined) {
      // NFIQ 1-5 scale (1 is best)
      const nfiqQuality = Math.max(0, (6 - input.nfiqScore) * 20);
      components.overall = nfiqQuality;
    }

    // Calculate overall score
    let overall = 100;
    for (const issue of issues) {
      overall -= issue.impact;
    }
    overall = Math.max(0, Math.min(100, overall));

    return {
      overall,
      components,
      issues,
      recommendations
    };
  }
}

// ============================================================================
// Iris Quality Assessment
// ============================================================================

export interface IrisQualityInput {
  imageWidth: number;
  imageHeight: number;
  irisRadius: number;
  pupilRadius: number;
  pupilDilation: number; // ratio
  occlusionByLid: number; // percentage
  occlusionByLash: number; // percentage
  motion: number; // blur metric 0-100
  interlace: number; // interlacing artifact 0-100
  specularReflection: number; // percentage of iris
  gaze: { x: number; y: number }; // deviation from center
  irisContrast: number; // 0-100
}

export class IrisQualityAssessor {
  private thresholds: QualityThresholds = {
    minimum: 45,
    acceptable: 60,
    good: 75,
    excellent: 90
  };

  /**
   * Assess iris image quality
   */
  assess(input: IrisQualityInput): QualityMetrics {
    const issues: QualityIssue[] = [];
    const recommendations: string[] = [];
    const components: QualityMetrics['components'] = {};

    // Resolution assessment
    const minIrisRadius = 70; // pixels
    components.resolution = Math.min(100, (input.irisRadius / minIrisRadius) * 50 + 50);
    if (input.irisRadius < minIrisRadius) {
      issues.push({
        code: 'LOW_RESOLUTION',
        severity: 'HIGH',
        description: `Iris radius ${input.irisRadius}px below minimum ${minIrisRadius}px`,
        impact: 20
      });
      recommendations.push('Move closer to camera or use higher resolution');
    }

    // Pupil dilation assessment
    const idealDilation = 0.4; // 40% of iris
    const dilationDiff = Math.abs(input.pupilDilation - idealDilation);
    if (input.pupilDilation < 0.2) {
      issues.push({
        code: 'PUPIL_CONSTRICTED',
        severity: 'MEDIUM',
        description: 'Pupil is too constricted',
        impact: 10
      });
      recommendations.push('Reduce ambient light');
    } else if (input.pupilDilation > 0.6) {
      issues.push({
        code: 'PUPIL_DILATED',
        severity: 'MEDIUM',
        description: 'Pupil is too dilated',
        impact: 10
      });
      recommendations.push('Increase ambient light');
    }

    // Occlusion assessment
    const totalOcclusion = input.occlusionByLid + input.occlusionByLash;
    components.occlusion = Math.max(0, 100 - totalOcclusion);
    if (totalOcclusion > 20) {
      issues.push({
        code: 'IRIS_OCCLUDED',
        severity: totalOcclusion > 40 ? 'HIGH' : 'MEDIUM',
        description: `${totalOcclusion}% iris occlusion by eyelid/lashes`,
        impact: totalOcclusion * 0.5
      });
      recommendations.push('Open eyes wider');
    }

    // Motion blur assessment
    components.sharpness = Math.max(0, 100 - input.motion);
    if (input.motion > 20) {
      issues.push({
        code: 'MOTION_BLUR',
        severity: input.motion > 40 ? 'HIGH' : 'MEDIUM',
        description: 'Motion blur detected',
        impact: input.motion * 0.3
      });
      recommendations.push('Keep head still during capture');
    }

    // Specular reflection assessment
    if (input.specularReflection > 5) {
      issues.push({
        code: 'SPECULAR_REFLECTION',
        severity: input.specularReflection > 15 ? 'HIGH' : 'MEDIUM',
        description: `${input.specularReflection}% iris affected by reflections`,
        impact: input.specularReflection * 0.5
      });
      recommendations.push('Adjust lighting to reduce reflections');
    }

    // Gaze assessment
    const gazeDeviation = Math.sqrt(input.gaze.x ** 2 + input.gaze.y ** 2);
    if (gazeDeviation > 0.15) {
      issues.push({
        code: 'OFF_AXIS_GAZE',
        severity: gazeDeviation > 0.3 ? 'HIGH' : 'MEDIUM',
        description: 'Subject not looking at camera',
        impact: gazeDeviation * 30
      });
      recommendations.push('Look directly at the camera');
    }

    // Contrast assessment
    components.contrast = input.irisContrast;
    if (input.irisContrast < 40) {
      issues.push({
        code: 'LOW_CONTRAST',
        severity: 'MEDIUM',
        description: 'Low iris texture contrast',
        impact: 10
      });
      recommendations.push('Improve illumination');
    }

    // Calculate overall score
    let overall = 100;
    for (const issue of issues) {
      overall -= issue.impact;
    }
    overall = Math.max(0, Math.min(100, overall));

    return {
      overall,
      components,
      issues,
      recommendations
    };
  }
}

// ============================================================================
// Unified Quality Engine
// ============================================================================

export class BiometricQualityEngine {
  private faceAssessor = new FaceQualityAssessor();
  private fingerprintAssessor = new FingerprintQualityAssessor();
  private irisAssessor = new IrisQualityAssessor();

  /**
   * Assess quality for any biometric modality
   */
  assess(
    modality: BiometricModality,
    input: FaceQualityInput | FingerprintQualityInput | IrisQualityInput
  ): QualityMetrics {
    switch (modality) {
      case BiometricModality.FACE:
        return this.faceAssessor.assess(input as FaceQualityInput);
      case BiometricModality.FINGERPRINT:
        return this.fingerprintAssessor.assess(input as FingerprintQualityInput);
      case BiometricModality.IRIS:
        return this.irisAssessor.assess(input as IrisQualityInput);
      default:
        throw new QualityError(`Quality assessment not implemented for ${modality}`);
    }
  }

  /**
   * Convert quality metrics to BiometricQuality
   */
  toTemplateQuality(metrics: QualityMetrics): BiometricQuality {
    return {
      score: metrics.overall,
      isAcceptable: metrics.overall >= 50,
      metrics: metrics.components,
      issues: metrics.issues.map(i => i.description),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validate template quality meets requirements
   */
  validateTemplate(
    template: BiometricTemplate,
    minimumQuality = 50
  ): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (template.quality.score < minimumQuality) {
      issues.push(`Quality score ${template.quality.score} below minimum ${minimumQuality}`);
    }

    if (!template.quality.isAcceptable) {
      issues.push('Template marked as unacceptable quality');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}

export default BiometricQualityEngine;
