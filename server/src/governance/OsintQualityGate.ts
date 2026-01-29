
/**
 * OSINT Quality Gate
 *
 * Enforces methodology standards for intelligence validation.
 * Based on OSINT Methodology V2.
 */

export interface SourceCandidate {
  id: string;
  origin: string; // Domain, IP, or Platform ID
  corroborationStatus: string;
}

export interface RiskAssessmentCandidate {
  riskScore: number;
  confidenceMin: number;
  uncertaintyRange: number;
}

export class OsintQualityGate {
  /**
   * Enforces that high-risk assessments have low uncertainty.
   *
   * Rule: High Risk (>0.8) requires Uncertainty < 0.2.
   * Rule: Confidence (1 - Uncertainty) must meet Minimum Confidence Floor.
   */
  static enforceConfidenceFloor(assessment: RiskAssessmentCandidate): { passed: boolean; reason?: string } {
    // If Risk > 0.8 (High), Uncertainty must be < 0.2
    if (assessment.riskScore > 0.8) {
      if (assessment.uncertaintyRange >= 0.2) {
        return {
          passed: false,
          reason: `High risk score (${assessment.riskScore}) requires uncertainty < 0.2 (current: ${assessment.uncertaintyRange})`
        };
      }
    }

    // Calculate effective confidence (1.0 - uncertainty width)
    // This is a simplified heuristic; actual confidence interval logic might differ.
    const effectiveConfidence = 1.0 - assessment.uncertaintyRange;

    // Enforce absolute minimum confidence floor
    if (effectiveConfidence < assessment.confidenceMin) {
        return {
          passed: false,
          reason: `Effective confidence (${effectiveConfidence}) is below required minimum (${assessment.confidenceMin})`
        };
    }

    return { passed: true };
  }

  /**
   * Validates that sources claiming corroboration are actually independent.
   *
   * Rule: Must have at least 2 sources with distinct origins.
   */
  static validateIndependence(sources: SourceCandidate[]): { passed: boolean; reason?: string } {
    if (sources.length < 2) {
      return { passed: false, reason: "Insufficient source count for corroboration (min: 2)" };
    }

    const origins = new Set<string>();
    for (const source of sources) {
      // Normalize origin (simple logic for now)
      if (source.origin) {
        const origin = source.origin.toLowerCase().trim();
        origins.add(origin);
      }
    }

    // Independence means we have multiple distinct origins
    if (origins.size < 2) {
      return {
        passed: false,
        reason: `Sources lack independence. Found ${sources.length} sources but only ${origins.size} distinct origins.`
      };
    }

    return { passed: true };
  }
}
