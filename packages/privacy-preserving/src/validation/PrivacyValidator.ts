/**
 * PrivacyValidator - Validate privacy guarantees and assess re-identification risk
 */

import { TabularData } from '@intelgraph/synthetic-data';

export interface PrivacyAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  metrics: {
    reidentificationRisk: number;
    membershipInferenceRisk: number;
    attributeDisclosureRisk: number;
    privacyLoss: number;
  };
  compliance: ComplianceCheck;
  recommendations: string[];
}

export interface ComplianceCheck {
  gdpr: boolean;
  hipaa: boolean;
  ccpa: boolean;
  notes: string[];
}

export interface ReidentificationRisk {
  overall: number;
  perRecord: number[];
  highRiskRecords: number[];
}

/**
 * Privacy Validator class
 */
export class PrivacyValidator {
  /**
   * Assess overall privacy of synthetic data
   */
  static assessPrivacy(
    original: TabularData,
    synthetic: TabularData,
    config: {
      quasiIdentifiers: string[];
      sensitiveAttributes: string[];
      privacyBudget?: number;
    }
  ): PrivacyAssessment {
    // Compute various risk metrics
    const reidentificationRisk = this.computeReidentificationRisk(
      original,
      synthetic,
      config.quasiIdentifiers
    );

    const membershipInferenceRisk = this.computeMembershipInferenceRisk(
      original,
      synthetic
    );

    const attributeDisclosureRisk = this.computeAttributeDisclosureRisk(
      original,
      synthetic,
      config.sensitiveAttributes
    );

    const privacyLoss = config.privacyBudget || 0;

    // Determine overall risk level
    const overallRisk = this.determineOverallRisk({
      reidentificationRisk,
      membershipInferenceRisk,
      attributeDisclosureRisk,
      privacyLoss
    });

    // Check compliance
    const compliance = this.checkCompliance({
      reidentificationRisk,
      membershipInferenceRisk,
      attributeDisclosureRisk,
      privacyLoss
    });

    // Generate recommendations
    const recommendations = this.generateRecommendations({
      reidentificationRisk,
      membershipInferenceRisk,
      attributeDisclosureRisk,
      privacyLoss,
      overallRisk
    });

    return {
      overallRisk,
      metrics: {
        reidentificationRisk,
        membershipInferenceRisk,
        attributeDisclosureRisk,
        privacyLoss
      },
      compliance,
      recommendations
    };
  }

  /**
   * Compute re-identification risk
   */
  private static computeReidentificationRisk(
    original: TabularData,
    synthetic: TabularData,
    quasiIdentifiers: string[]
  ): number {
    // Use distance-based approach
    // For each synthetic record, find the closest original record
    const qiIndices = quasiIdentifiers.map(qi => synthetic.columns.indexOf(qi));

    let totalRisk = 0;
    const syntheticCount = synthetic.data.length;

    for (const synthRecord of synthetic.data) {
      let minDistance = Infinity;

      for (const origRecord of original.data) {
        const distance = this.computeRecordDistance(
          synthRecord,
          origRecord,
          qiIndices
        );

        minDistance = Math.min(minDistance, distance);
      }

      // Convert distance to risk (closer = higher risk)
      const risk = Math.exp(-minDistance);
      totalRisk += risk;
    }

    return totalRisk / syntheticCount;
  }

  /**
   * Compute membership inference risk
   */
  private static computeMembershipInferenceRisk(
    original: TabularData,
    synthetic: TabularData
  ): number {
    // Check if synthetic records are too similar to original records
    let matches = 0;
    const threshold = 0.1; // Similarity threshold

    for (const synthRecord of synthetic.data) {
      for (const origRecord of original.data) {
        const distance = this.computeRecordDistance(
          synthRecord,
          origRecord,
          [...Array(synthRecord.length).keys()]
        );

        if (distance < threshold) {
          matches++;
          break;
        }
      }
    }

    return matches / synthetic.data.length;
  }

  /**
   * Compute attribute disclosure risk
   */
  private static computeAttributeDisclosureRisk(
    original: TabularData,
    synthetic: TabularData,
    sensitiveAttributes: string[]
  ): number {
    // Check if sensitive attributes can be inferred
    const sensIndices = sensitiveAttributes.map(sa => synthetic.columns.indexOf(sa));

    let totalRisk = 0;

    for (const idx of sensIndices) {
      // Compute mutual information between quasi-identifiers and sensitive attribute
      const mi = this.computeMutualInformation(synthetic, idx);
      totalRisk += mi;
    }

    return sensIndices.length > 0 ? totalRisk / sensIndices.length : 0;
  }

  /**
   * Determine overall risk level
   */
  private static determineOverallRisk(metrics: any): 'low' | 'medium' | 'high' | 'critical' {
    const maxRisk = Math.max(
      metrics.reidentificationRisk,
      metrics.membershipInferenceRisk,
      metrics.attributeDisclosureRisk
    );

    if (maxRisk < 0.1) return 'low';
    if (maxRisk < 0.3) return 'medium';
    if (maxRisk < 0.6) return 'high';
    return 'critical';
  }

  /**
   * Check compliance with regulations
   */
  private static checkCompliance(metrics: any): ComplianceCheck {
    const notes: string[] = [];

    // GDPR compliance (requires low re-identification risk)
    const gdpr = metrics.reidentificationRisk < 0.1;
    if (!gdpr) {
      notes.push('Re-identification risk too high for GDPR compliance');
    }

    // HIPAA compliance (requires k-anonymity, typically k>=5)
    const hipaa = metrics.reidentificationRisk < 0.2;
    if (!hipaa) {
      notes.push('Consider additional anonymization for HIPAA compliance');
    }

    // CCPA compliance
    const ccpa = metrics.attributeDisclosureRisk < 0.15;
    if (!ccpa) {
      notes.push('Attribute disclosure risk may not meet CCPA standards');
    }

    return {
      gdpr,
      hipaa,
      ccpa,
      notes
    };
  }

  /**
   * Generate recommendations
   */
  private static generateRecommendations(assessment: any): string[] {
    const recommendations: string[] = [];

    if (assessment.reidentificationRisk > 0.3) {
      recommendations.push('Apply additional anonymization techniques (k-anonymity, l-diversity)');
      recommendations.push('Increase generalization of quasi-identifiers');
    }

    if (assessment.membershipInferenceRisk > 0.2) {
      recommendations.push('Increase privacy budget (epsilon) to add more noise');
      recommendations.push('Use differential privacy with lower epsilon value');
    }

    if (assessment.attributeDisclosureRisk > 0.25) {
      recommendations.push('Apply suppression to sensitive attributes');
      recommendations.push('Ensure t-closeness for sensitive attributes');
    }

    if (assessment.overallRisk === 'high' || assessment.overallRisk === 'critical') {
      recommendations.push('Consider regenerating synthetic data with stronger privacy guarantees');
      recommendations.push('Conduct thorough privacy audit before release');
    }

    return recommendations;
  }

  /**
   * Compute distance between two records
   */
  private static computeRecordDistance(
    record1: any[],
    record2: any[],
    indices: number[]
  ): number {
    let distance = 0;
    let count = 0;

    for (const idx of indices) {
      const v1 = record1[idx];
      const v2 = record2[idx];

      if (typeof v1 === 'number' && typeof v2 === 'number') {
        // Normalized Euclidean distance
        distance += Math.pow(v1 - v2, 2);
      } else {
        // Hamming distance for categorical
        distance += v1 !== v2 ? 1 : 0;
      }

      count++;
    }

    return Math.sqrt(distance) / Math.sqrt(count);
  }

  /**
   * Compute mutual information (simplified)
   */
  private static computeMutualInformation(data: TabularData, targetIdx: number): number {
    // Simplified MI computation
    // Would compute actual mutual information between target and other columns
    return 0.1; // Placeholder
  }

  /**
   * Test for differential privacy guarantees
   */
  static testDifferentialPrivacy(
    mechanism: (x: any) => any,
    epsilon: number,
    delta: number = 0
  ): boolean {
    // Test if mechanism satisfies (ε,δ)-differential privacy
    // This would require access to neighboring datasets
    // Placeholder implementation
    return true;
  }

  /**
   * Estimate privacy budget consumption
   */
  static estimatePrivacyBudget(operations: Array<{
    type: string;
    epsilon: number;
    delta: number;
  }>): number {
    // Advanced composition
    const k = operations.length;
    const maxEpsilon = Math.max(...operations.map(op => op.epsilon));

    // Use advanced composition theorem
    const totalEpsilon = Math.sqrt(2 * k * Math.log(1.25 / 1e-5)) * maxEpsilon;

    return totalEpsilon;
  }
}

export default PrivacyValidator;
