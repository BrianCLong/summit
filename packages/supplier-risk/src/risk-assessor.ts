import {
  SupplyChainNode,
  RiskAssessment,
  RiskCategory,
  RiskLevel,
  FinancialHealthMetrics,
  CybersecurityPosture,
  ESGScore,
} from '@intelgraph/supply-chain-types';

/**
 * Comprehensive supplier risk assessment
 */
export interface SupplierRiskAssessment {
  nodeId: string;
  overallRiskScore: number; // 0-100
  overallRiskLevel: RiskLevel;
  assessmentDate: Date;
  categoryRisks: RiskAssessment[];
  financialHealth?: FinancialHealthMetrics;
  cybersecurityPosture?: CybersecurityPosture;
  esgScore?: ESGScore;
  recommendations: string[];
  mitigationPriorities: Array<{
    category: RiskCategory;
    priority: 'low' | 'medium' | 'high' | 'critical';
    action: string;
  }>;
}

/**
 * Financial health assessment configuration
 */
export interface FinancialHealthConfig {
  revenueThresholds: { min: number; max: number };
  profitMarginThresholds: { min: number; max: number };
  debtToEquityThresholds: { max: number };
  creditRatingWeights: Record<string, number>;
}

/**
 * Cybersecurity assessment configuration
 */
export interface CybersecurityConfig {
  requiredCertifications: string[];
  vulnerabilityThresholds: {
    critical: number;
    high: number;
    medium: number;
  };
  minSecurityScore: number;
}

/**
 * ESG assessment configuration
 */
export interface ESGConfig {
  minOverallScore: number;
  minEnvironmentalScore: number;
  minSocialScore: number;
  minGovernanceScore: number;
  requiredCertifications: string[];
}

/**
 * Supplier risk assessor with comprehensive risk evaluation capabilities
 */
export class SupplierRiskAssessor {
  /**
   * Perform comprehensive supplier risk assessment
   */
  async assessSupplier(
    node: SupplyChainNode,
    financialMetrics?: FinancialHealthMetrics,
    cyberPosture?: CybersecurityPosture,
    esgScore?: ESGScore
  ): Promise<SupplierRiskAssessment> {
    const categoryRisks: RiskAssessment[] = [];

    // Assess financial health
    if (financialMetrics) {
      const financialRisk = this.assessFinancialHealth(node.id, financialMetrics);
      categoryRisks.push(financialRisk);
    }

    // Assess cybersecurity posture
    if (cyberPosture) {
      const cyberRisk = this.assessCybersecurity(node.id, cyberPosture);
      categoryRisks.push(cyberRisk);
    }

    // Assess ESG
    if (esgScore) {
      const esgRisk = this.assessESG(node.id, esgScore);
      categoryRisks.push(esgRisk);
    }

    // Assess geopolitical risk
    if (node.location) {
      const geoRisk = this.assessGeopoliticalRisk(node.id, node.location.country);
      categoryRisks.push(geoRisk);
    }

    // Assess operational risk based on node properties
    const operationalRisk = this.assessOperationalRisk(node);
    categoryRisks.push(operationalRisk);

    // Calculate overall risk score
    const overallRiskScore = this.calculateOverallRisk(categoryRisks);
    const overallRiskLevel = this.scoreToLevel(overallRiskScore);

    // Generate recommendations
    const recommendations = this.generateRecommendations(categoryRisks, node);
    const mitigationPriorities = this.identifyMitigationPriorities(categoryRisks);

    return {
      nodeId: node.id,
      overallRiskScore,
      overallRiskLevel,
      assessmentDate: new Date(),
      categoryRisks,
      financialHealth: financialMetrics,
      cybersecurityPosture: cyberPosture,
      esgScore,
      recommendations,
      mitigationPriorities,
    };
  }

  /**
   * Assess financial health
   */
  assessFinancialHealth(
    nodeId: string,
    metrics: FinancialHealthMetrics
  ): RiskAssessment {
    const indicators: Array<{ name: string; value: any; impact: 'positive' | 'negative' | 'neutral' }> = [];
    let score = 100; // Start with perfect score and deduct

    // Assess credit rating
    if (metrics.creditRating) {
      const rating = metrics.creditRating.toUpperCase();
      const ratingScores: Record<string, number> = {
        'AAA': 0, 'AA': 5, 'A': 10,
        'BBB': 20, 'BB': 40, 'B': 60,
        'CCC': 80, 'CC': 90, 'C': 95, 'D': 100,
      };
      const ratingScore = ratingScores[rating] || 50;
      score -= ratingScore * 0.3;
      indicators.push({
        name: 'Credit Rating',
        value: rating,
        impact: ratingScore < 20 ? 'positive' : 'negative',
      });
    }

    // Assess profit margin
    if (metrics.profitMargin !== undefined) {
      if (metrics.profitMargin < 0) {
        score -= 25;
        indicators.push({
          name: 'Profit Margin',
          value: `${(metrics.profitMargin * 100).toFixed(2)}%`,
          impact: 'negative',
        });
      } else if (metrics.profitMargin < 0.05) {
        score -= 15;
        indicators.push({
          name: 'Profit Margin',
          value: `${(metrics.profitMargin * 100).toFixed(2)}%`,
          impact: 'negative',
        });
      } else {
        indicators.push({
          name: 'Profit Margin',
          value: `${(metrics.profitMargin * 100).toFixed(2)}%`,
          impact: 'positive',
        });
      }
    }

    // Assess debt to equity
    if (metrics.debtToEquity !== undefined) {
      if (metrics.debtToEquity > 2) {
        score -= 20;
        indicators.push({
          name: 'Debt to Equity',
          value: metrics.debtToEquity.toFixed(2),
          impact: 'negative',
        });
      } else if (metrics.debtToEquity > 1) {
        score -= 10;
        indicators.push({
          name: 'Debt to Equity',
          value: metrics.debtToEquity.toFixed(2),
          impact: 'neutral',
        });
      } else {
        indicators.push({
          name: 'Debt to Equity',
          value: metrics.debtToEquity.toFixed(2),
          impact: 'positive',
        });
      }
    }

    // Assess current ratio
    if (metrics.currentRatio !== undefined) {
      if (metrics.currentRatio < 1) {
        score -= 15;
        indicators.push({
          name: 'Current Ratio',
          value: metrics.currentRatio.toFixed(2),
          impact: 'negative',
        });
      } else {
        indicators.push({
          name: 'Current Ratio',
          value: metrics.currentRatio.toFixed(2),
          impact: 'positive',
        });
      }
    }

    // Assess bankruptcy risk
    if (metrics.bankruptcyRisk !== undefined) {
      score -= metrics.bankruptcyRisk * 50; // High bankruptcy risk significantly impacts score
      indicators.push({
        name: 'Bankruptcy Risk',
        value: `${(metrics.bankruptcyRisk * 100).toFixed(2)}%`,
        impact: metrics.bankruptcyRisk > 0.5 ? 'negative' : 'neutral',
      });
    }

    score = Math.max(0, Math.min(100, score));
    const level = this.scoreToLevel(score);

    return {
      id: crypto.randomUUID(),
      nodeId,
      category: 'financial',
      level,
      score,
      indicators,
      mitigations: this.getFinancialMitigations(level),
      assessedAt: new Date(),
    };
  }

  /**
   * Assess cybersecurity posture
   */
  assessCybersecurity(
    nodeId: string,
    posture: CybersecurityPosture
  ): RiskAssessment {
    const indicators: Array<{ name: string; value: any; impact: 'positive' | 'negative' | 'neutral' }> = [];
    let score = posture.securityScore;

    // Assess certifications
    const requiredCerts = ['ISO 27001', 'SOC 2', 'NIST'];
    const hasCerts = requiredCerts.filter(cert =>
      posture.certifications.some(c => c.includes(cert))
    );
    indicators.push({
      name: 'Security Certifications',
      value: posture.certifications.join(', '),
      impact: hasCerts.length >= 2 ? 'positive' : 'negative',
    });

    if (hasCerts.length === 0) {
      score -= 20;
    } else if (hasCerts.length < 2) {
      score -= 10;
    }

    // Assess vulnerabilities
    const { critical, high, medium, low } = posture.vulnerabilities;
    const vulnScore = (critical * 10) + (high * 5) + (medium * 2) + low;

    if (critical > 0) {
      score -= 30;
      indicators.push({
        name: 'Critical Vulnerabilities',
        value: critical,
        impact: 'negative',
      });
    }

    if (high > 5) {
      score -= 20;
      indicators.push({
        name: 'High Vulnerabilities',
        value: high,
        impact: 'negative',
      });
    }

    // Assess incident history
    const recentIncidents = posture.incidentHistory.filter(
      inc => !inc.resolved || (new Date().getTime() - inc.date.getTime()) < 365 * 24 * 60 * 60 * 1000
    );

    const criticalIncidents = recentIncidents.filter(inc => inc.severity === 'critical');
    if (criticalIncidents.length > 0) {
      score -= 25;
      indicators.push({
        name: 'Critical Security Incidents',
        value: criticalIncidents.length,
        impact: 'negative',
      });
    }

    score = Math.max(0, Math.min(100, score));
    const level = this.scoreToLevel(score);

    return {
      id: crypto.randomUUID(),
      nodeId,
      category: 'cybersecurity',
      level,
      score,
      indicators,
      mitigations: this.getCyberMitigations(level, posture),
      assessedAt: new Date(),
    };
  }

  /**
   * Assess ESG score
   */
  assessESG(nodeId: string, esg: ESGScore): RiskAssessment {
    const indicators: Array<{ name: string; value: any; impact: 'positive' | 'negative' | 'neutral' }> = [];
    let score = esg.overallScore;

    indicators.push({
      name: 'Environmental Score',
      value: esg.environmentalScore,
      impact: esg.environmentalScore >= 70 ? 'positive' : 'negative',
    });

    indicators.push({
      name: 'Social Score',
      value: esg.socialScore,
      impact: esg.socialScore >= 70 ? 'positive' : 'negative',
    });

    indicators.push({
      name: 'Governance Score',
      value: esg.governanceScore,
      impact: esg.governanceScore >= 70 ? 'positive' : 'negative',
    });

    // Assess violations
    const recentViolations = esg.violations.filter(
      v => (new Date().getTime() - v.date.getTime()) < 365 * 24 * 60 * 60 * 1000
    );

    const criticalViolations = recentViolations.filter(v => v.severity === 'critical');
    if (criticalViolations.length > 0) {
      score -= criticalViolations.length * 15;
      indicators.push({
        name: 'Critical ESG Violations',
        value: criticalViolations.length,
        impact: 'negative',
      });
    }

    score = Math.max(0, Math.min(100, score));
    const level = this.scoreToLevel(score);

    return {
      id: crypto.randomUUID(),
      nodeId,
      category: 'esg',
      level,
      score,
      indicators,
      mitigations: this.getESGMitigations(level),
      assessedAt: new Date(),
    };
  }

  /**
   * Assess geopolitical risk
   */
  assessGeopoliticalRisk(nodeId: string, country: string): RiskAssessment {
    const indicators: Array<{ name: string; value: any; impact: 'positive' | 'negative' | 'neutral' }> = [];

    // Simplified geopolitical risk scoring
    // In production, integrate with external geopolitical risk APIs
    const highRiskCountries = [
      'North Korea', 'Iran', 'Syria', 'Venezuela', 'Myanmar',
    ];

    const mediumRiskCountries = [
      'Russia', 'Belarus', 'Cuba', 'Sudan', 'Zimbabwe',
    ];

    let score = 100;
    let level: RiskLevel = 'low';

    if (highRiskCountries.includes(country)) {
      score = 20;
      level = 'critical';
      indicators.push({
        name: 'Sanctions Risk',
        value: 'High - Country subject to international sanctions',
        impact: 'negative',
      });
    } else if (mediumRiskCountries.includes(country)) {
      score = 50;
      level = 'high';
      indicators.push({
        name: 'Sanctions Risk',
        value: 'Medium - Country under partial sanctions',
        impact: 'negative',
      });
    } else {
      indicators.push({
        name: 'Sanctions Risk',
        value: 'Low',
        impact: 'positive',
      });
    }

    return {
      id: crypto.randomUUID(),
      nodeId,
      category: 'geopolitical',
      level,
      score,
      indicators,
      mitigations: this.getGeopoliticalMitigations(country),
      assessedAt: new Date(),
    };
  }

  /**
   * Assess operational risk
   */
  assessOperationalRisk(node: SupplyChainNode): RiskAssessment {
    const indicators: Array<{ name: string; value: any; impact: 'positive' | 'negative' | 'neutral' }> = [];
    let score = 100;

    // Assess node status
    if (node.status === 'suspended') {
      score -= 50;
      indicators.push({
        name: 'Operational Status',
        value: 'Suspended',
        impact: 'negative',
      });
    } else if (node.status === 'under-review') {
      score -= 20;
      indicators.push({
        name: 'Operational Status',
        value: 'Under Review',
        impact: 'negative',
      });
    } else if (node.status === 'inactive') {
      score -= 30;
      indicators.push({
        name: 'Operational Status',
        value: 'Inactive',
        impact: 'negative',
      });
    } else {
      indicators.push({
        name: 'Operational Status',
        value: 'Active',
        impact: 'positive',
      });
    }

    // Assess criticality
    indicators.push({
      name: 'Criticality',
      value: node.criticality,
      impact: node.criticality === 'critical' ? 'negative' : 'neutral',
    });

    // Higher tier = more risk (less direct control)
    if (node.tier > 3) {
      score -= 15;
      indicators.push({
        name: 'Supply Chain Tier',
        value: node.tier,
        impact: 'negative',
      });
    }

    score = Math.max(0, Math.min(100, score));
    const level = this.scoreToLevel(score);

    return {
      id: crypto.randomUUID(),
      nodeId: node.id,
      category: 'operational',
      level,
      score,
      indicators,
      mitigations: this.getOperationalMitigations(node),
      assessedAt: new Date(),
    };
  }

  // Private helper methods

  private calculateOverallRisk(categoryRisks: RiskAssessment[]): number {
    if (categoryRisks.length === 0) return 50;

    // Weighted average of category risks
    const weights: Record<RiskCategory, number> = {
      financial: 0.25,
      cybersecurity: 0.20,
      geopolitical: 0.15,
      regulatory: 0.10,
      esg: 0.10,
      operational: 0.10,
      quality: 0.05,
      delivery: 0.03,
      capacity: 0.02,
      concentration: 0.00,
    };

    let totalScore = 0;
    let totalWeight = 0;

    for (const risk of categoryRisks) {
      const weight = weights[risk.category] || 0.1;
      totalScore += risk.score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? totalScore / totalWeight : 50;
  }

  private scoreToLevel(score: number): RiskLevel {
    if (score >= 80) return 'low';
    if (score >= 60) return 'medium';
    if (score >= 40) return 'high';
    return 'critical';
  }

  private generateRecommendations(
    categoryRisks: RiskAssessment[],
    node: SupplyChainNode
  ): string[] {
    const recommendations: string[] = [];

    const highRisks = categoryRisks.filter(r => r.level === 'high' || r.level === 'critical');

    if (highRisks.length > 0) {
      recommendations.push(
        `Immediate attention required: ${highRisks.length} high/critical risk categories identified`
      );
    }

    for (const risk of highRisks) {
      if (risk.category === 'financial') {
        recommendations.push('Consider requiring financial guarantees or insurance');
      }
      if (risk.category === 'cybersecurity') {
        recommendations.push('Implement additional security controls and monitoring');
      }
      if (risk.category === 'geopolitical') {
        recommendations.push('Identify alternative suppliers in different regions');
      }
    }

    if (node.criticality === 'critical' && highRisks.length > 0) {
      recommendations.push('Consider dual-sourcing strategy due to critical node status');
    }

    return recommendations;
  }

  private identifyMitigationPriorities(
    categoryRisks: RiskAssessment[]
  ): Array<{ category: RiskCategory; priority: 'low' | 'medium' | 'high' | 'critical'; action: string }> {
    return categoryRisks
      .filter(r => r.level === 'high' || r.level === 'critical')
      .map(risk => ({
        category: risk.category,
        priority: risk.level,
        action: risk.mitigations?.[0] || 'Review and implement mitigation measures',
      }));
  }

  private getFinancialMitigations(level: RiskLevel): string[] {
    const mitigations: Record<RiskLevel, string[]> = {
      low: ['Continue regular monitoring', 'Annual financial review'],
      medium: ['Quarterly financial reviews', 'Request updated financial statements'],
      high: ['Monthly financial monitoring', 'Require financial guarantees', 'Reduce contract value'],
      critical: ['Immediate financial review', 'Identify alternative suppliers', 'Exit strategy planning'],
    };
    return mitigations[level];
  }

  private getCyberMitigations(level: RiskLevel, posture: CybersecurityPosture): string[] {
    const mitigations: string[] = [];

    if (level === 'critical' || level === 'high') {
      mitigations.push('Conduct immediate security audit');
      if (posture.vulnerabilities.critical > 0) {
        mitigations.push('Require remediation of critical vulnerabilities within 30 days');
      }
      mitigations.push('Implement enhanced security monitoring');
    }

    if (posture.certifications.length === 0) {
      mitigations.push('Require ISO 27001 or SOC 2 certification');
    }

    return mitigations;
  }

  private getESGMitigations(level: RiskLevel): string[] {
    const mitigations: Record<RiskLevel, string[]> = {
      low: ['Continue ESG monitoring', 'Annual ESG review'],
      medium: ['Request ESG improvement plan', 'Quarterly ESG reviews'],
      high: ['Require third-party ESG audit', 'Develop corrective action plan'],
      critical: ['Immediate ESG review', 'Consider supplier replacement', 'Stakeholder notification'],
    };
    return mitigations[level];
  }

  private getGeopoliticalMitigations(country: string): string[] {
    return [
      'Monitor geopolitical developments',
      'Develop contingency plans',
      'Identify alternative suppliers in different regions',
      'Review export control and sanctions compliance',
    ];
  }

  private getOperationalMitigations(node: SupplyChainNode): string[] {
    const mitigations: string[] = [];

    if (node.status === 'suspended' || node.status === 'under-review') {
      mitigations.push('Activate backup suppliers');
      mitigations.push('Monitor status changes daily');
    }

    if (node.criticality === 'critical') {
      mitigations.push('Implement dual-sourcing strategy');
      mitigations.push('Maintain strategic inventory');
    }

    if (node.tier > 3) {
      mitigations.push('Enhance visibility into sub-tier suppliers');
    }

    return mitigations;
  }
}
