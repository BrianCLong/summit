/**
 * Compliance Analyzer - Risk Assessment and Analysis
 * Comprehensive compliance analysis and risk assessment
 */

import {
  SanctionDesignation,
  RiskAssessment,
  ComplianceRiskLevel,
  SanctionMatch,
  Violation,
  ViolationType,
  IndirectExposure,
  GeographicRisk,
  SectorRisk,
  OwnershipRisk,
  RiskFactor,
  ComplianceReport,
  RiskItem,
  TransactionDetails,
  ComplianceCheck
} from '../types/index.js';

export interface AnalysisConfig {
  // Risk Thresholds
  highRiskThreshold: number; // 0-100
  criticalRiskThreshold: number; // 0-100

  // Geographic Risk
  highRiskCountries: string[];
  sanctionedCountries: string[];

  // Sector Risk
  regulatedSectors: string[];
  highRiskSectors: string[];

  // Ownership Risk
  minOwnershipTransparency: number; // 0-100
  maxOwnershipTiers: number;

  // Analysis Depth
  analyzeIndirectExposure: boolean;
  maxIndirectExposureLevels: number;
  analyzeOwnershipStructure: boolean;
}

export class ComplianceAnalyzer {
  private config: AnalysisConfig;
  private riskAssessments: Map<string, RiskAssessment>;
  private violations: Map<string, Violation>;
  private complianceChecks: Map<string, ComplianceCheck>;

  constructor(config: AnalysisConfig) {
    this.config = config;
    this.riskAssessments = new Map();
    this.violations = new Map();
    this.complianceChecks = new Map();
  }

  /**
   * Perform comprehensive risk assessment
   */
  async assessRisk(
    entityId: string,
    entityName: string,
    designation?: SanctionDesignation,
    sanctionMatches: SanctionMatch[] = []
  ): Promise<RiskAssessment> {
    const assessment: RiskAssessment = {
      entityId,
      assessmentDate: new Date(),
      overallRisk: ComplianceRiskLevel.LOW,
      sanctionMatches,
      indirectExposure: [],
      geographicRisk: await this.analyzeGeographicRisk(designation),
      sectorRisk: await this.analyzeSectorRisk(designation),
      ownershipRisk: await this.analyzeOwnershipRisk(designation),
      riskScore: 0,
      riskFactors: [],
      mitigationMeasures: [],
      residualRisk: ComplianceRiskLevel.LOW,
      recommendations: [],
      assessedBy: 'system',
      metadata: {}
    };

    // Analyze indirect exposure if configured
    if (this.config.analyzeIndirectExposure && designation) {
      assessment.indirectExposure = await this.analyzeIndirectExposure(designation);
    }

    // Calculate risk factors
    assessment.riskFactors = this.calculateRiskFactors(assessment);

    // Calculate overall risk score
    assessment.riskScore = this.calculateRiskScore(assessment.riskFactors);

    // Determine overall risk level
    assessment.overallRisk = this.determineRiskLevel(assessment.riskScore);

    // Generate recommendations
    assessment.recommendations = this.generateRecommendations(assessment);

    // Generate mitigation measures
    assessment.mitigationMeasures = this.generateMitigationMeasures(assessment);

    // Calculate residual risk
    assessment.residualRisk = this.calculateResidualRisk(
      assessment.overallRisk,
      assessment.mitigationMeasures
    );

    // Store assessment
    this.riskAssessments.set(entityId, assessment);

    return assessment;
  }

  /**
   * Analyze exposure to sanctioned entities
   */
  async analyzeExposure(
    entityId: string,
    relationships: Array<{
      entityId: string;
      entityName: string;
      relationship: IndirectExposure['relationship'];
      sanctioned: boolean;
    }>
  ): Promise<IndirectExposure[]> {
    const exposures: IndirectExposure[] = [];

    for (const rel of relationships) {
      const exposureLevel = this.calculateExposureLevel(
        rel.relationship,
        rel.sanctioned
      );

      if (exposureLevel > 0) {
        exposures.push({
          entityId: rel.entityId,
          entityName: rel.entityName,
          relationship: rel.relationship,
          exposureLevel,
          sanctioned: rel.sanctioned
        });
      }
    }

    return exposures.sort((a, b) => b.exposureLevel - a.exposureLevel);
  }

  /**
   * Detect potential violations
   */
  async detectViolation(
    entityId: string,
    designation: SanctionDesignation,
    transactionDetails?: TransactionDetails,
    description?: string
  ): Promise<Violation> {
    const violation: Violation = {
      id: `violation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      violationType: this.determineViolationType(transactionDetails),
      regime: designation.regime,
      designationId: designation.id,
      description:
        description ||
        `Potential transaction with sanctioned entity: ${designation.name}`,
      detectedDate: new Date(),
      occurrenceDate: transactionDetails?.date || new Date(),
      violator: entityId,
      sanctionedParty: designation.name,
      transactionDetails,
      severity: this.calculateViolationSeverity(designation, transactionDetails),
      status: 'DETECTED',
      reportedToAuthorities: false,
      evidence: [],
      metadata: {}
    };

    // Store violation
    this.violations.set(violation.id, violation);

    return violation;
  }

  /**
   * Analyze compliance check results
   */
  async analyzeComplianceCheck(check: ComplianceCheck): Promise<{
    riskLevel: ComplianceRiskLevel;
    falsePositiveProbability: number;
    recommendedAction: string;
    justification: string;
  }> {
    // Store check
    this.complianceChecks.set(check.id, check);

    let falsePositiveProbability = 0;
    let recommendedAction = 'APPROVE';
    let justification = '';

    if (check.matches.length === 0) {
      return {
        riskLevel: ComplianceRiskLevel.LOW,
        falsePositiveProbability: 0,
        recommendedAction: 'APPROVE',
        justification: 'No sanctions matches found'
      };
    }

    // Analyze matches
    const highestConfidenceMatch = check.matches[0];
    const averageConfidence =
      check.matches.reduce((sum, m) => sum + m.confidence, 0) /
      check.matches.length;

    // Assess false positive probability
    if (highestConfidenceMatch.confidence < 0.9) {
      falsePositiveProbability = 1 - highestConfidenceMatch.confidence;
    }

    // Determine recommended action
    if (check.overallRisk === ComplianceRiskLevel.PROHIBITED) {
      recommendedAction = 'BLOCK';
      justification = 'High confidence match with sanctioned entity - transaction must be blocked';
    } else if (check.overallRisk === ComplianceRiskLevel.CRITICAL) {
      recommendedAction = 'ESCALATE';
      justification = 'Critical risk match - requires senior compliance review';
    } else if (check.overallRisk === ComplianceRiskLevel.HIGH) {
      recommendedAction = 'REVIEW';
      justification = 'High risk match - requires manual review and additional due diligence';
    } else if (check.overallRisk === ComplianceRiskLevel.MEDIUM) {
      recommendedAction = 'ENHANCED_DUE_DILIGENCE';
      justification = 'Medium risk - requires enhanced due diligence';
    } else {
      recommendedAction = 'APPROVE';
      justification = 'Low risk - may proceed with standard monitoring';
    }

    return {
      riskLevel: check.overallRisk,
      falsePositiveProbability,
      recommendedAction,
      justification
    };
  }

  /**
   * Generate compliance report
   */
  generateReport(
    period: { start: Date; end: Date },
    reportType: ComplianceReport['reportType'] = 'PERIODIC'
  ): ComplianceReport {
    const checks = Array.from(this.complianceChecks.values()).filter(
      c => c.timestamp >= period.start && c.timestamp <= period.end
    );

    const violations = Array.from(this.violations.values()).filter(
      v => v.detectedDate >= period.start && v.detectedDate <= period.end
    );

    const totalScreenings = checks.length;
    const matches = checks.filter(c => c.matches.length > 0).length;
    const falsePositives = this.estimateFalsePositives(checks);

    // Calculate risk distribution
    const riskDistribution = checks.reduce((acc, check) => {
      acc[check.overallRisk] = (acc[check.overallRisk] || 0) + 1;
      return acc;
    }, {} as Record<ComplianceRiskLevel, number>);

    // Identify top risks
    const topRisks = this.identifyTopRisks(checks);

    // Violations by type
    const violationsByType = violations.reduce((acc, v) => {
      acc[v.violationType] = (acc[v.violationType] || 0) + 1;
      return acc;
    }, {} as Record<ViolationType, number>);

    const unresolvedViolations = violations.filter(
      v => v.status !== 'RESOLVED' && v.status !== 'DISMISSED'
    ).length;

    // Determine overall status
    const overallStatus = this.determineComplianceStatus(
      riskDistribution,
      unresolvedViolations
    );

    // Generate findings and recommendations
    const findings = this.generateFindings(
      checks,
      violations,
      riskDistribution
    );
    const recommendations = this.generateComplianceRecommendations(
      findings,
      overallStatus
    );

    const report: ComplianceReport = {
      id: `report-${Date.now()}`,
      reportType,
      period,
      totalScreenings,
      matches,
      falsePositives,
      violations: violations.length,
      exemptions: 0, // Would need to track exemptions separately
      riskDistribution,
      topRisks,
      violationsByType,
      unresolvedViolations,
      overallStatus,
      findings,
      recommendations,
      generatedBy: 'system',
      generatedAt: new Date(),
      metadata: {}
    };

    return report;
  }

  /**
   * Get risk assessment
   */
  getRiskAssessment(entityId: string): RiskAssessment | undefined {
    return this.riskAssessments.get(entityId);
  }

  /**
   * Get violation
   */
  getViolation(violationId: string): Violation | undefined {
    return this.violations.get(violationId);
  }

  /**
   * Get all violations
   */
  getViolations(filter?: {
    status?: Violation['status'];
    severity?: ComplianceRiskLevel;
  }): Violation[] {
    let violations = Array.from(this.violations.values());

    if (filter?.status) {
      violations = violations.filter(v => v.status === filter.status);
    }

    if (filter?.severity) {
      violations = violations.filter(v => v.severity === filter.severity);
    }

    return violations;
  }

  /**
   * Update violation status
   */
  updateViolation(
    violationId: string,
    updates: Partial<Violation>
  ): Violation | undefined {
    const violation = this.violations.get(violationId);
    if (!violation) {
      return undefined;
    }

    const updated = { ...violation, ...updates };
    this.violations.set(violationId, updated);

    return updated;
  }

  /**
   * Clear all data
   */
  clearData(): void {
    this.riskAssessments.clear();
    this.violations.clear();
    this.complianceChecks.clear();
  }

  /**
   * Analyze geographic risk
   */
  private async analyzeGeographicRisk(
    designation?: SanctionDesignation
  ): Promise<GeographicRisk> {
    const countries: string[] = [];
    const highRiskCountries: string[] = [];

    if (designation) {
      // Add countries from designation
      if (designation.nationality) {
        countries.push(...designation.nationality);
      }

      designation.addresses.forEach(addr => {
        if (!countries.includes(addr.country)) {
          countries.push(addr.country);
        }
      });

      // Identify high-risk countries
      for (const country of countries) {
        if (
          this.config.highRiskCountries.includes(country) ||
          this.config.sanctionedCountries.includes(country)
        ) {
          highRiskCountries.push(country);
        }
      }
    }

    const riskScore = this.calculateGeographicRiskScore(
      countries,
      highRiskCountries
    );

    const factors: string[] = [];
    if (highRiskCountries.length > 0) {
      factors.push(`Presence in ${highRiskCountries.length} high-risk countries`);
    }
    if (this.config.sanctionedCountries.some(c => countries.includes(c))) {
      factors.push('Presence in sanctioned countries');
    }

    return {
      countries,
      highRiskCountries,
      riskScore,
      factors
    };
  }

  /**
   * Analyze sector risk
   */
  private async analyzeSectorRisk(
    designation?: SanctionDesignation
  ): Promise<SectorRisk> {
    // Would need sector information from designation
    // For now, return default
    return {
      sector: 'UNKNOWN',
      riskLevel: ComplianceRiskLevel.LOW,
      regulatedSector: false,
      factors: []
    };
  }

  /**
   * Analyze ownership risk
   */
  private async analyzeOwnershipRisk(
    designation?: SanctionDesignation
  ): Promise<OwnershipRisk> {
    let sanctionedOwners = 0;
    let ownershipTransparency = 50; // Default
    let complexStructure = false;

    if (designation?.ownership) {
      sanctionedOwners = designation.ownership.beneficialOwners.filter(
        bo => bo.sanctioned
      ).length;

      // Check for complex structures
      if (
        designation.ownership.subsidiaries.length > 5 ||
        designation.ownership.beneficialOwners.length > 10
      ) {
        complexStructure = true;
        ownershipTransparency = 30;
      }
    }

    const factors: string[] = [];
    if (sanctionedOwners > 0) {
      factors.push(`${sanctionedOwners} sanctioned beneficial owners`);
    }
    if (complexStructure) {
      factors.push('Complex ownership structure');
    }
    if (ownershipTransparency < this.config.minOwnershipTransparency) {
      factors.push('Low ownership transparency');
    }

    return {
      sanctionedOwners,
      ownershipTransparency,
      complexStructure,
      factors
    };
  }

  /**
   * Analyze indirect exposure
   */
  private async analyzeIndirectExposure(
    designation: SanctionDesignation
  ): Promise<IndirectExposure[]> {
    const exposures: IndirectExposure[] = [];

    // Analyze parent companies
    if (designation.ownership?.parentCompany) {
      exposures.push({
        entityId: designation.ownership.parentCompany,
        entityName: designation.ownership.parentCompany,
        relationship: 'PARENT',
        exposureLevel: 80,
        sanctioned: true
      });
    }

    // Analyze subsidiaries
    if (designation.ownership?.subsidiaries) {
      for (const sub of designation.ownership.subsidiaries) {
        exposures.push({
          entityId: sub,
          entityName: sub,
          relationship: 'SUBSIDIARY',
          exposureLevel: 60,
          sanctioned: false
        });
      }
    }

    // Analyze related entities
    for (const relatedId of designation.relatedEntities || []) {
      exposures.push({
        entityId: relatedId,
        entityName: relatedId,
        relationship: 'AFFILIATE',
        exposureLevel: 40,
        sanctioned: false
      });
    }

    return exposures;
  }

  /**
   * Calculate risk factors
   */
  private calculateRiskFactors(assessment: RiskAssessment): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // Sanction matches factor
    if (assessment.sanctionMatches.length > 0) {
      const avgConfidence =
        assessment.sanctionMatches.reduce((sum, m) => sum + m.confidence, 0) /
        assessment.sanctionMatches.length;

      factors.push({
        category: 'Direct Sanctions Match',
        description: `${assessment.sanctionMatches.length} sanctions matches with average confidence ${(avgConfidence * 100).toFixed(1)}%`,
        weight: 0.4,
        score: avgConfidence * 100
      });
    }

    // Geographic risk factor
    if (assessment.geographicRisk.riskScore > 0) {
      factors.push({
        category: 'Geographic Risk',
        description: assessment.geographicRisk.factors.join('; '),
        weight: 0.2,
        score: assessment.geographicRisk.riskScore
      });
    }

    // Ownership risk factor
    if (assessment.ownershipRisk.sanctionedOwners > 0) {
      factors.push({
        category: 'Ownership Risk',
        description: assessment.ownershipRisk.factors.join('; '),
        weight: 0.25,
        score:
          (assessment.ownershipRisk.sanctionedOwners /
            Math.max(assessment.ownershipRisk.sanctionedOwners, 1)) *
          100
      });
    }

    // Indirect exposure factor
    if (assessment.indirectExposure.length > 0) {
      const maxExposure = Math.max(
        ...assessment.indirectExposure.map(e => e.exposureLevel)
      );

      factors.push({
        category: 'Indirect Exposure',
        description: `Exposure to ${assessment.indirectExposure.length} related entities`,
        weight: 0.15,
        score: maxExposure
      });
    }

    return factors;
  }

  /**
   * Calculate risk score from factors
   */
  private calculateRiskScore(factors: RiskFactor[]): number {
    if (factors.length === 0) return 0;

    const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
    const weightedScore = factors.reduce(
      (sum, f) => sum + f.score * f.weight,
      0
    );

    return totalWeight > 0 ? weightedScore / totalWeight : 0;
  }

  /**
   * Determine risk level from score
   */
  private determineRiskLevel(score: number): ComplianceRiskLevel {
    if (score >= this.config.criticalRiskThreshold) {
      return ComplianceRiskLevel.CRITICAL;
    }
    if (score >= this.config.highRiskThreshold) {
      return ComplianceRiskLevel.HIGH;
    }
    if (score >= 40) {
      return ComplianceRiskLevel.MEDIUM;
    }
    return ComplianceRiskLevel.LOW;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(assessment: RiskAssessment): string[] {
    const recommendations: string[] = [];

    if (assessment.sanctionMatches.length > 0) {
      recommendations.push(
        'Conduct enhanced due diligence on all transaction parties'
      );
      recommendations.push('Verify entity identity through multiple sources');
    }

    if (assessment.geographicRisk.highRiskCountries.length > 0) {
      recommendations.push(
        'Implement additional monitoring for high-risk jurisdictions'
      );
    }

    if (assessment.ownershipRisk.sanctionedOwners > 0) {
      recommendations.push('Review beneficial ownership structure in detail');
      recommendations.push('Consider seeking legal counsel');
    }

    if (assessment.indirectExposure.length > 0) {
      recommendations.push('Map complete relationship network');
      recommendations.push('Assess indirect exposure risks');
    }

    if (assessment.overallRisk === ComplianceRiskLevel.CRITICAL) {
      recommendations.push('DO NOT PROCEED - Block all transactions');
      recommendations.push('Report to compliance officer immediately');
    }

    return recommendations;
  }

  /**
   * Generate mitigation measures
   */
  private generateMitigationMeasures(assessment: RiskAssessment): string[] {
    const measures: string[] = [];

    if (assessment.overallRisk === ComplianceRiskLevel.HIGH ||
        assessment.overallRisk === ComplianceRiskLevel.CRITICAL) {
      measures.push('Enhanced customer due diligence (EDD)');
      measures.push('Senior management approval required');
      measures.push('Ongoing monitoring with increased frequency');
    }

    if (assessment.geographicRisk.riskScore > 60) {
      measures.push('Additional verification of geographic presence');
      measures.push('Source of funds verification');
    }

    if (assessment.ownershipRisk.sanctionedOwners > 0) {
      measures.push('Ultimate beneficial owner (UBO) verification');
      measures.push('Legal opinion on sanctions implications');
    }

    return measures;
  }

  /**
   * Calculate residual risk
   */
  private calculateResidualRisk(
    originalRisk: ComplianceRiskLevel,
    mitigationMeasures: string[]
  ): ComplianceRiskLevel {
    const riskLevels = [
      ComplianceRiskLevel.LOW,
      ComplianceRiskLevel.MEDIUM,
      ComplianceRiskLevel.HIGH,
      ComplianceRiskLevel.CRITICAL,
      ComplianceRiskLevel.PROHIBITED
    ];

    const currentIndex = riskLevels.indexOf(originalRisk);

    // Can't mitigate PROHIBITED
    if (originalRisk === ComplianceRiskLevel.PROHIBITED) {
      return ComplianceRiskLevel.PROHIBITED;
    }

    // Each mitigation measure reduces risk by one level (max)
    const reduction = Math.min(
      Math.floor(mitigationMeasures.length / 2),
      currentIndex
    );

    return riskLevels[Math.max(0, currentIndex - reduction)];
  }

  /**
   * Calculate exposure level
   */
  private calculateExposureLevel(
    relationship: IndirectExposure['relationship'],
    sanctioned: boolean
  ): number {
    const baseExposure: Record<IndirectExposure['relationship'], number> = {
      PARENT: 80,
      SUBSIDIARY: 60,
      AFFILIATE: 40,
      PARTNER: 50,
      SUPPLIER: 30,
      CUSTOMER: 30,
      BENEFICIAL_OWNER: 70
    };

    let exposure = baseExposure[relationship] || 20;

    if (sanctioned) {
      exposure = Math.min(100, exposure * 1.5);
    }

    return exposure;
  }

  /**
   * Determine violation type
   */
  private determineViolationType(
    transactionDetails?: TransactionDetails
  ): ViolationType {
    // Logic to determine violation type based on transaction
    if (transactionDetails) {
      return ViolationType.DIRECT_VIOLATION;
    }
    return ViolationType.INDIRECT_VIOLATION;
  }

  /**
   * Calculate violation severity
   */
  private calculateViolationSeverity(
    designation: SanctionDesignation,
    transactionDetails?: TransactionDetails
  ): ComplianceRiskLevel {
    // High severity for active designations with significant transactions
    if (
      designation.active &&
      transactionDetails?.amount &&
      transactionDetails.amount.value > 100000
    ) {
      return ComplianceRiskLevel.CRITICAL;
    }

    if (designation.active) {
      return ComplianceRiskLevel.HIGH;
    }

    return ComplianceRiskLevel.MEDIUM;
  }

  /**
   * Calculate geographic risk score
   */
  private calculateGeographicRiskScore(
    countries: string[],
    highRiskCountries: string[]
  ): number {
    if (countries.length === 0) return 0;

    const highRiskRatio = highRiskCountries.length / countries.length;
    return highRiskRatio * 100;
  }

  /**
   * Estimate false positives
   */
  private estimateFalsePositives(checks: ComplianceCheck[]): number {
    let falsePositives = 0;

    for (const check of checks) {
      if (check.matches.length > 0) {
        const avgConfidence =
          check.matches.reduce((sum, m) => sum + m.confidence, 0) /
          check.matches.length;

        if (avgConfidence < 0.8) {
          falsePositives += 1 - avgConfidence;
        }
      }
    }

    return Math.round(falsePositives);
  }

  /**
   * Identify top risks
   */
  private identifyTopRisks(checks: ComplianceCheck[]): RiskItem[] {
    const riskMap = new Map<string, RiskItem>();

    for (const check of checks) {
      if (
        check.overallRisk === ComplianceRiskLevel.HIGH ||
        check.overallRisk === ComplianceRiskLevel.CRITICAL ||
        check.overallRisk === ComplianceRiskLevel.PROHIBITED
      ) {
        const existing = riskMap.get(check.entityName);
        if (existing) {
          existing.exposure++;
        } else {
          riskMap.set(check.entityName, {
            entity: check.entityName,
            riskLevel: check.overallRisk,
            reason: `${check.matches.length} sanctions matches`,
            exposure: 1
          });
        }
      }
    }

    return Array.from(riskMap.values())
      .sort((a, b) => b.exposure - a.exposure)
      .slice(0, 10);
  }

  /**
   * Determine compliance status
   */
  private determineComplianceStatus(
    riskDistribution: Record<ComplianceRiskLevel, number>,
    unresolvedViolations: number
  ): ComplianceReport['overallStatus'] {
    if (
      unresolvedViolations > 0 ||
      riskDistribution[ComplianceRiskLevel.PROHIBITED] > 0
    ) {
      return 'NON_COMPLIANT';
    }

    if (
      riskDistribution[ComplianceRiskLevel.CRITICAL] > 0 ||
      riskDistribution[ComplianceRiskLevel.HIGH] > 5
    ) {
      return 'NEEDS_ATTENTION';
    }

    return 'COMPLIANT';
  }

  /**
   * Generate findings
   */
  private generateFindings(
    checks: ComplianceCheck[],
    violations: Violation[],
    riskDistribution: Record<ComplianceRiskLevel, number>
  ): string[] {
    const findings: string[] = [];

    if (violations.length > 0) {
      findings.push(`${violations.length} potential violations detected`);
    }

    if (riskDistribution[ComplianceRiskLevel.CRITICAL] > 0) {
      findings.push(
        `${riskDistribution[ComplianceRiskLevel.CRITICAL]} critical risk entities identified`
      );
    }

    if (riskDistribution[ComplianceRiskLevel.HIGH] > 0) {
      findings.push(
        `${riskDistribution[ComplianceRiskLevel.HIGH]} high risk entities require review`
      );
    }

    const matchRate = checks.filter(c => c.matches.length > 0).length / checks.length;
    if (matchRate > 0.1) {
      findings.push(
        `High match rate (${(matchRate * 100).toFixed(1)}%) may indicate screening issues`
      );
    }

    return findings;
  }

  /**
   * Generate compliance recommendations
   */
  private generateComplianceRecommendations(
    findings: string[],
    status: ComplianceReport['overallStatus']
  ): string[] {
    const recommendations: string[] = [];

    if (status === 'NON_COMPLIANT') {
      recommendations.push(
        'Immediate action required to address compliance gaps'
      );
      recommendations.push('Suspend high-risk transactions pending review');
      recommendations.push('Escalate to senior management and legal counsel');
    } else if (status === 'NEEDS_ATTENTION') {
      recommendations.push('Implement enhanced monitoring procedures');
      recommendations.push('Conduct comprehensive risk assessment');
      recommendations.push('Review and update compliance policies');
    }

    if (findings.length > 3) {
      recommendations.push('Increase screening frequency');
      recommendations.push('Provide additional staff training');
    }

    recommendations.push('Maintain detailed audit trail of all decisions');
    recommendations.push('Schedule next compliance review within 30 days');

    return recommendations;
  }
}
