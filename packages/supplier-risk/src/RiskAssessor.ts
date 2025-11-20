import type {
  SupplierRiskAssessment,
  FinancialHealthScore,
  CybersecurityPosture,
  GeopoliticalRisk,
  ESGScore,
  RegulatoryCompliance,
  PerformanceScore,
  FinancialMetrics,
  SecurityControl,
  ComplianceRequirement,
} from './types';

/**
 * Supplier Risk Assessor
 *
 * Comprehensive risk assessment engine for suppliers including financial health,
 * cybersecurity posture, geopolitical risk, ESG scoring, regulatory compliance,
 * and performance monitoring.
 */
export class RiskAssessor {
  /**
   * Assess financial health of a supplier
   */
  assessFinancialHealth(
    supplierId: string,
    tenantId: string,
    metrics: FinancialMetrics,
    dataSource: string
  ): FinancialHealthScore {
    // Calculate component scores
    const profitabilityScore = this.calculateProfitabilityScore(metrics);
    const liquidityScore = this.calculateLiquidityScore(metrics);
    const solvencyScore = this.calculateSolvencyScore(metrics);

    // Overall score is weighted average
    const overallScore = (
      profitabilityScore * 0.3 +
      liquidityScore * 0.4 +
      solvencyScore * 0.3
    );

    // Determine bankruptcy risk
    const bankruptcyRisk = this.determineBankruptcyRisk(overallScore, metrics);

    // Determine trend direction (simplified)
    const trendDirection = 'stable' as const; // Would analyze historical data

    return {
      supplierId,
      tenantId,
      timestamp: new Date().toISOString(),
      metrics,
      overallScore,
      profitabilityScore,
      liquidityScore,
      solvencyScore,
      bankruptcyRisk,
      trendDirection,
      dataSource,
      dataQuality: this.assessDataQuality(metrics),
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Calculate profitability score
   */
  private calculateProfitabilityScore(metrics: FinancialMetrics): number {
    let score = 50; // Start at neutral

    if (metrics.profitMargin !== undefined) {
      if (metrics.profitMargin > 15) score += 25;
      else if (metrics.profitMargin > 10) score += 15;
      else if (metrics.profitMargin > 5) score += 5;
      else if (metrics.profitMargin < 0) score -= 30;
    }

    if (metrics.netIncomeUSD !== undefined) {
      if (metrics.netIncomeUSD > 0) score += 15;
      else score -= 20;
    }

    if (metrics.ebitdaUSD !== undefined) {
      if (metrics.ebitdaUSD > 0) score += 10;
      else score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate liquidity score
   */
  private calculateLiquidityScore(metrics: FinancialMetrics): number {
    let score = 50;

    if (metrics.currentRatio !== undefined) {
      if (metrics.currentRatio >= 2.0) score += 25;
      else if (metrics.currentRatio >= 1.5) score += 15;
      else if (metrics.currentRatio >= 1.0) score += 5;
      else if (metrics.currentRatio < 1.0) score -= 30;
    }

    if (metrics.quickRatio !== undefined) {
      if (metrics.quickRatio >= 1.5) score += 15;
      else if (metrics.quickRatio >= 1.0) score += 10;
      else if (metrics.quickRatio < 1.0) score -= 15;
    }

    if (metrics.cashFlowUSD !== undefined) {
      if (metrics.cashFlowUSD > 0) score += 10;
      else score -= 20;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate solvency score
   */
  private calculateSolvencyScore(metrics: FinancialMetrics): number {
    let score = 50;

    if (metrics.debtToEquityRatio !== undefined) {
      if (metrics.debtToEquityRatio < 0.5) score += 25;
      else if (metrics.debtToEquityRatio < 1.0) score += 15;
      else if (metrics.debtToEquityRatio < 2.0) score += 5;
      else score -= 20;
    }

    if (metrics.interestCoverageRatio !== undefined) {
      if (metrics.interestCoverageRatio > 5) score += 25;
      else if (metrics.interestCoverageRatio > 3) score += 15;
      else if (metrics.interestCoverageRatio > 1.5) score += 5;
      else score -= 25;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Determine bankruptcy risk level
   */
  private determineBankruptcyRisk(
    overallScore: number,
    metrics: FinancialMetrics
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Critical indicators
    if (metrics.currentRatio && metrics.currentRatio < 0.5) return 'critical';
    if (metrics.cashFlowUSD && metrics.cashFlowUSD < 0 && metrics.netIncomeUSD && metrics.netIncomeUSD < 0) return 'critical';

    // Score-based assessment
    if (overallScore >= 70) return 'low';
    if (overallScore >= 50) return 'medium';
    if (overallScore >= 30) return 'high';
    return 'critical';
  }

  /**
   * Assess data quality
   */
  private assessDataQuality(metrics: FinancialMetrics): 'high' | 'medium' | 'low' {
    const fields = Object.values(metrics);
    const populatedFields = fields.filter(v => v !== undefined && v !== null).length;
    const completeness = populatedFields / fields.length;

    if (completeness >= 0.8) return 'high';
    if (completeness >= 0.5) return 'medium';
    return 'low';
  }

  /**
   * Assess cybersecurity posture
   */
  assessCybersecurityPosture(
    supplierId: string,
    tenantId: string,
    controls: SecurityControl[],
    historicalIncidents: any[],
    knownVulnerabilities: { critical: number; high: number; medium: number; low: number },
    certifications?: string[],
    assessmentMethod: 'onsite_audit' | 'questionnaire' | 'third_party_report' | 'continuous_monitoring' = 'questionnaire'
  ): CybersecurityPosture {
    const controlCoverageScore = this.calculateControlCoverageScore(controls);
    const incidentHistoryScore = this.calculateIncidentHistoryScore(historicalIncidents);
    const vulnerabilityScore = this.calculateVulnerabilityScore(knownVulnerabilities);

    // Overall cybersecurity score
    const overallScore = (
      controlCoverageScore * 0.4 +
      incidentHistoryScore * 0.3 +
      vulnerabilityScore * 0.3
    );

    const riskLevel = this.determineSecurityRiskLevel(overallScore, knownVulnerabilities);

    return {
      supplierId,
      tenantId,
      timestamp: new Date().toISOString(),
      controls,
      certifications,
      historicalIncidents,
      activeThreats: historicalIncidents.filter(i => !i.resolved).length,
      knownVulnerabilities,
      overallScore,
      controlCoverageScore,
      incidentHistoryScore,
      vulnerabilityScore,
      riskLevel,
      assessmentMethod,
      lastAssessmentDate: new Date().toISOString(),
    };
  }

  /**
   * Calculate security control coverage score
   */
  private calculateControlCoverageScore(controls: SecurityControl[]): number {
    if (controls.length === 0) return 0;

    const implementedControls = controls.filter(c => c.implemented).length;
    const coverageRate = (implementedControls / controls.length) * 100;

    // Consider effectiveness
    const effectivenessBonus = controls
      .filter(c => c.implemented && c.effectiveness === 'high')
      .length / controls.length * 20;

    return Math.min(coverageRate + effectivenessBonus, 100);
  }

  /**
   * Calculate incident history score
   */
  private calculateIncidentHistoryScore(incidents: any[]): number {
    let score = 100;

    // Penalize for incidents
    const criticalIncidents = incidents.filter(i => i.severity === 'critical').length;
    const highIncidents = incidents.filter(i => i.severity === 'high').length;
    const mediumIncidents = incidents.filter(i => i.severity === 'medium').length;

    score -= criticalIncidents * 30;
    score -= highIncidents * 15;
    score -= mediumIncidents * 5;

    // Penalize for unresolved incidents
    const unresolvedIncidents = incidents.filter(i => !i.resolved).length;
    score -= unresolvedIncidents * 10;

    return Math.max(0, score);
  }

  /**
   * Calculate vulnerability score
   */
  private calculateVulnerabilityScore(vulns: { critical: number; high: number; medium: number; low: number }): number {
    let score = 100;

    score -= vulns.critical * 20;
    score -= vulns.high * 10;
    score -= vulns.medium * 3;
    score -= vulns.low * 1;

    return Math.max(0, score);
  }

  /**
   * Determine security risk level
   */
  private determineSecurityRiskLevel(
    score: number,
    vulns: { critical: number; high: number; medium: number; low: number }
  ): 'critical' | 'high' | 'medium' | 'low' {
    if (vulns.critical > 0 || score < 30) return 'critical';
    if (vulns.high > 5 || score < 50) return 'high';
    if (score < 70) return 'medium';
    return 'low';
  }

  /**
   * Assess ESG (Environmental, Social, Governance) score
   */
  assessESG(
    supplierId: string,
    tenantId: string,
    environmentalMetrics: any,
    socialMetrics: any,
    governanceMetrics: any
  ): ESGScore {
    const environmentalScore = this.calculateEnvironmentalScore(environmentalMetrics);
    const socialScore = this.calculateSocialScore(socialMetrics);
    const governanceScore = this.calculateGovernanceScore(governanceMetrics);

    // Overall ESG score (equal weighting)
    const overallESGScore = (environmentalScore + socialScore + governanceScore) / 3;

    const rating = this.determineESGRating(overallESGScore);
    const criticalIssues = this.identifyESGCriticalIssues(
      environmentalMetrics,
      socialMetrics,
      governanceMetrics
    );

    return {
      supplierId,
      tenantId,
      timestamp: new Date().toISOString(),
      environmentalMetrics,
      environmentalScore,
      socialMetrics,
      socialScore,
      governanceMetrics,
      governanceScore,
      overallESGScore,
      rating,
      criticalIssues,
      improvementAreas: this.identifyImprovementAreas(environmentalScore, socialScore, governanceScore),
      dataCompleteness: 75, // Would calculate based on populated fields
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Calculate environmental score
   */
  private calculateEnvironmentalScore(metrics: any): number {
    let score = 50;

    if (metrics.renewableEnergyPercentage !== undefined) {
      score += metrics.renewableEnergyPercentage * 0.3;
    }

    if (metrics.recyclingRate !== undefined) {
      score += metrics.recyclingRate * 0.2;
    }

    if (metrics.environmentalCertifications && metrics.environmentalCertifications.length > 0) {
      score += metrics.environmentalCertifications.length * 5;
    }

    if (metrics.environmentalIncidents !== undefined) {
      score -= metrics.environmentalIncidents * 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate social score
   */
  private calculateSocialScore(metrics: any): number {
    let score = 50;

    if (metrics.humanRightsViolations !== undefined) {
      score -= metrics.humanRightsViolations * 20;
    }

    if (metrics.supplierCodeOfConduct) {
      score += 15;
    }

    if (metrics.diversityScore !== undefined) {
      score += metrics.diversityScore * 0.2;
    }

    if (metrics.safetyIncidentRate !== undefined && metrics.safetyIncidentRate < 2.0) {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate governance score
   */
  private calculateGovernanceScore(metrics: any): number {
    let score = 50;

    if (metrics.ethicsAndComplianceProgram) {
      score += 15;
    }

    if (metrics.whistleblowerProtection) {
      score += 10;
    }

    if (metrics.regulatoryViolations !== undefined) {
      score -= metrics.regulatoryViolations * 15;
    }

    if (metrics.transparencyScore !== undefined) {
      score += metrics.transparencyScore * 0.25;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Determine ESG rating
   */
  private determineESGRating(score: number): 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'CCC' | 'CC' | 'C' {
    if (score >= 90) return 'AAA';
    if (score >= 80) return 'AA';
    if (score >= 70) return 'A';
    if (score >= 60) return 'BBB';
    if (score >= 50) return 'BB';
    if (score >= 40) return 'B';
    if (score >= 30) return 'CCC';
    if (score >= 20) return 'CC';
    return 'C';
  }

  /**
   * Identify critical ESG issues
   */
  private identifyESGCriticalIssues(envMetrics: any, socialMetrics: any, govMetrics: any): string[] {
    const issues: string[] = [];

    if (socialMetrics.humanRightsViolations > 0) {
      issues.push(`${socialMetrics.humanRightsViolations} human rights violations reported`);
    }

    if (envMetrics.environmentalIncidents > 2) {
      issues.push(`Multiple environmental incidents: ${envMetrics.environmentalIncidents}`);
    }

    if (govMetrics.regulatoryViolations > 0) {
      issues.push(`${govMetrics.regulatoryViolations} regulatory violations`);
    }

    if (!socialMetrics.supplierCodeOfConduct) {
      issues.push('No supplier code of conduct in place');
    }

    return issues;
  }

  /**
   * Identify improvement areas
   */
  private identifyImprovementAreas(envScore: number, socialScore: number, govScore: number): string[] {
    const areas: string[] = [];

    if (envScore < 60) areas.push('Environmental performance');
    if (socialScore < 60) areas.push('Social responsibility');
    if (govScore < 60) areas.push('Governance practices');

    return areas;
  }

  /**
   * Assess regulatory compliance
   */
  assessRegulatoryCompliance(
    supplierId: string,
    tenantId: string,
    requirements: ComplianceRequirement[]
  ): RegulatoryCompliance {
    const totalRequirements = requirements.filter(r => r.applicable).length;
    const compliantRequirements = requirements.filter(
      r => r.applicable && r.status === 'compliant'
    ).length;

    const complianceRate = totalRequirements > 0 ? (compliantRequirements / totalRequirements) * 100 : 100;
    const complianceScore = this.calculateComplianceScore(requirements, complianceRate);

    const activeViolations = requirements.reduce((sum, req) => {
      return sum + (req.violations?.filter(v => !v.remediated).length || 0);
    }, 0);

    const criticalViolations = requirements.reduce((sum, req) => {
      return sum + (req.violations?.filter(v => !v.remediated && v.severity === 'critical').length || 0);
    }, 0);

    const complianceRisk = this.determineComplianceRisk(complianceScore, criticalViolations);

    const activeCertifications: string[] = [];
    const expiredCertifications: string[] = [];

    return {
      supplierId,
      tenantId,
      timestamp: new Date().toISOString(),
      requirements,
      complianceScore,
      complianceRate,
      activeViolations,
      criticalViolations,
      complianceRisk,
      activeCertifications,
      expiredCertifications,
    };
  }

  /**
   * Calculate compliance score
   */
  private calculateComplianceScore(requirements: ComplianceRequirement[], complianceRate: number): number {
    let score = complianceRate;

    // Penalize for violations
    const totalViolations = requirements.reduce((sum, req) => {
      return sum + (req.violations?.length || 0);
    }, 0);

    score -= totalViolations * 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Determine compliance risk
   */
  private determineComplianceRisk(score: number, criticalViolations: number): 'critical' | 'high' | 'medium' | 'low' {
    if (criticalViolations > 0) return 'critical';
    if (score < 50) return 'high';
    if (score < 70) return 'medium';
    return 'low';
  }

  /**
   * Perform comprehensive supplier risk assessment
   */
  performComprehensiveAssessment(
    supplierId: string,
    supplierName: string,
    tenantId: string,
    components: {
      financialHealth?: FinancialHealthScore;
      cybersecurity?: CybersecurityPosture;
      geopoliticalRisk?: GeopoliticalRisk;
      esgScore?: ESGScore;
      regulatoryCompliance?: RegulatoryCompliance;
      performanceScore?: PerformanceScore;
    },
    concentrationData?: any
  ): SupplierRiskAssessment {
    // Extract individual risk scores
    const riskScores = {
      financial: components.financialHealth ? (100 - components.financialHealth.overallScore) : 50,
      cybersecurity: components.cybersecurity ? (100 - components.cybersecurity.overallScore) : 50,
      geopolitical: components.geopoliticalRisk?.overallRiskScore || 50,
      esg: components.esgScore ? (100 - components.esgScore.overallESGScore) : 50,
      compliance: components.regulatoryCompliance ? (100 - components.regulatoryCompliance.complianceScore) : 50,
      performance: components.performanceScore ? (100 - components.performanceScore.overallPerformanceScore) : 50,
    };

    // Calculate weighted overall risk score
    const overallRiskScore = (
      riskScores.financial * 0.25 +
      riskScores.cybersecurity * 0.20 +
      riskScores.geopolitical * 0.15 +
      riskScores.esg * 0.10 +
      riskScores.compliance * 0.20 +
      riskScores.performance * 0.10
    );

    const riskLevel = this.determineOverallRiskLevel(overallRiskScore);
    const riskTier = this.determineRiskTier(overallRiskScore);

    // Identify key risks
    const keyRisks = this.identifyKeyRisks(components, riskScores);

    // Generate mitigation actions
    const mitigationActions = this.generateMitigationActions(keyRisks);

    return {
      supplierId,
      supplierName,
      tenantId,
      timestamp: new Date().toISOString(),
      financialHealth: components.financialHealth,
      cybersecurityPosture: components.cybersecurity,
      geopoliticalRisk: components.geopoliticalRisk,
      esgScore: components.esgScore,
      regulatoryCompliance: components.regulatoryCompliance,
      performanceScore: components.performanceScore,
      riskScores,
      overallRiskScore,
      riskLevel,
      riskTier,
      concentrationRisk: concentrationData || {
        isStrategicSupplier: false,
        isSingleSource: false,
      },
      keyRisks,
      mitigationActions,
      approvalStatus: this.determineApprovalStatus(overallRiskScore),
      reviewFrequency: this.determineReviewFrequency(riskLevel),
      nextReviewDate: this.calculateNextReviewDate(riskLevel),
    };
  }

  /**
   * Determine overall risk level
   */
  private determineOverallRiskLevel(score: number): 'critical' | 'high' | 'medium' | 'low' {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  /**
   * Determine risk tier
   */
  private determineRiskTier(score: number): 'tier1_critical' | 'tier2_high' | 'tier3_medium' | 'tier4_low' {
    if (score >= 80) return 'tier1_critical';
    if (score >= 60) return 'tier2_high';
    if (score >= 40) return 'tier3_medium';
    return 'tier4_low';
  }

  /**
   * Identify key risks
   */
  private identifyKeyRisks(components: any, riskScores: any): any[] {
    const risks: any[] = [];

    // Financial risks
    if (riskScores.financial > 60) {
      risks.push({
        category: 'Financial',
        description: 'High financial risk detected',
        severity: riskScores.financial > 80 ? 'critical' : 'high',
        likelihood: 'high',
        impact: 'Potential supplier insolvency could disrupt supply chain',
      });
    }

    // Cybersecurity risks
    if (riskScores.cybersecurity > 60) {
      risks.push({
        category: 'Cybersecurity',
        description: 'Inadequate cybersecurity controls',
        severity: riskScores.cybersecurity > 80 ? 'critical' : 'high',
        likelihood: 'medium',
        impact: 'Data breach or security incident could compromise our data',
      });
    }

    // Add more risk identification logic...

    return risks;
  }

  /**
   * Generate mitigation actions
   */
  private generateMitigationActions(keyRisks: any[]): any[] {
    return keyRisks.map(risk => ({
      priority: risk.severity as 'critical' | 'high' | 'medium' | 'low',
      action: `Address ${risk.category.toLowerCase()} risk: ${risk.description}`,
      timeline: risk.severity === 'critical' ? '30 days' : risk.severity === 'high' ? '60 days' : '90 days',
      status: 'not_started' as const,
    }));
  }

  /**
   * Determine approval status
   */
  private determineApprovalStatus(riskScore: number): 'approved' | 'conditional' | 'rejected' | 'under_review' {
    if (riskScore < 40) return 'approved';
    if (riskScore < 60) return 'conditional';
    if (riskScore < 80) return 'under_review';
    return 'rejected';
  }

  /**
   * Determine review frequency
   */
  private determineReviewFrequency(riskLevel: string): 'monthly' | 'quarterly' | 'semi_annual' | 'annual' {
    if (riskLevel === 'critical') return 'monthly';
    if (riskLevel === 'high') return 'quarterly';
    if (riskLevel === 'medium') return 'semi_annual';
    return 'annual';
  }

  /**
   * Calculate next review date
   */
  private calculateNextReviewDate(riskLevel: string): string {
    const now = new Date();
    const months = riskLevel === 'critical' ? 1 : riskLevel === 'high' ? 3 : riskLevel === 'medium' ? 6 : 12;
    now.setMonth(now.getMonth() + months);
    return now.toISOString();
  }
}
