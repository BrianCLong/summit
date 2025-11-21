import {
  VendorAssessment,
  Contract,
  SupplyChainNode,
} from '@intelgraph/supply-chain-types';

/**
 * Vendor onboarding workflow
 */
export interface VendorOnboarding {
  vendorId: string;
  stage: 'initial-review' | 'due-diligence' | 'security-assessment' | 'legal-review' | 'approved' | 'rejected';
  startedAt: Date;
  completedAt?: Date;
  checklist: Array<{
    item: string;
    status: 'pending' | 'in-progress' | 'completed' | 'failed';
    completedAt?: Date;
    notes?: string;
  }>;
  documents: Array<{
    type: string;
    name: string;
    url: string;
    uploadedAt: Date;
    verifiedAt?: Date;
  }>;
  approvers: Array<{
    role: string;
    userId: string;
    approvedAt?: Date;
    decision?: 'approve' | 'reject' | 'request-changes';
    notes?: string;
  }>;
}

/**
 * Vendor monitoring configuration
 */
export interface VendorMonitoringConfig {
  vendorId: string;
  assessmentFrequency: 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
  securityMonitoring: boolean;
  financialMonitoring: boolean;
  complianceMonitoring: boolean;
  performanceMonitoring: boolean;
  alertThresholds: {
    riskScoreDecrease: number;
    securityIncident: boolean;
    complianceViolation: boolean;
    performanceDegradation: number;
  };
}

/**
 * Fourth-party (sub-supplier) risk data
 */
export interface FourthPartyRisk {
  vendorId: string; // The third party
  subVendorId: string; // The fourth party
  subVendorName: string;
  relationship: string;
  criticalityToVendor: 'low' | 'medium' | 'high' | 'critical';
  hasAccess: boolean;
  dataShared: boolean;
  riskScore: number;
  lastAssessed: Date;
}

/**
 * Third-party risk manager for vendor lifecycle management
 */
export class ThirdPartyRiskManager {
  /**
   * Initiate vendor onboarding process
   */
  initiateOnboarding(vendorId: string, vendorName: string): VendorOnboarding {
    const checklist = [
      { item: 'Business information collected', status: 'pending' as const },
      { item: 'Financial statements reviewed', status: 'pending' as const },
      { item: 'Security questionnaire completed', status: 'pending' as const },
      { item: 'References checked', status: 'pending' as const },
      { item: 'Compliance certifications verified', status: 'pending' as const },
      { item: 'Insurance documentation reviewed', status: 'pending' as const },
      { item: 'Contract terms negotiated', status: 'pending' as const },
      { item: 'Legal review completed', status: 'pending' as const },
      { item: 'Executive approval obtained', status: 'pending' as const },
    ];

    return {
      vendorId,
      stage: 'initial-review',
      startedAt: new Date(),
      checklist,
      documents: [],
      approvers: [
        { role: 'Procurement', userId: '' },
        { role: 'Security', userId: '' },
        { role: 'Legal', userId: '' },
        { role: 'Finance', userId: '' },
        { role: 'Executive', userId: '' },
      ],
    };
  }

  /**
   * Conduct vendor assessment
   */
  async conductAssessment(
    vendor: SupplyChainNode,
    assessmentType: 'initial-onboarding' | 'periodic-review' | 'incident-triggered' | 'contract-renewal'
  ): Promise<VendorAssessment> {
    // Assess different categories
    const categories = {
      financial: await this.assessFinancial(vendor),
      cybersecurity: await this.assessCybersecurity(vendor),
      operational: await this.assessOperational(vendor),
      compliance: await this.assessCompliance(vendor),
      esg: await this.assessESG(vendor),
    };

    // Calculate overall score
    const overallScore = Object.values(categories).reduce((sum, score) => sum + score, 0) / 5;

    // Determine recommendation
    let recommendation: 'approve' | 'approve-with-conditions' | 'reject' | 'monitor' | 'terminate';
    let conditions: string[] = [];

    if (overallScore >= 80) {
      recommendation = 'approve';
    } else if (overallScore >= 60) {
      recommendation = 'approve-with-conditions';
      conditions = this.generateConditions(categories);
    } else if (overallScore >= 40) {
      recommendation = assessmentType === 'initial-onboarding' ? 'reject' : 'monitor';
    } else {
      recommendation = assessmentType === 'initial-onboarding' ? 'reject' : 'terminate';
    }

    // Generate findings
    const findings = this.generateFindings(categories);

    return {
      id: crypto.randomUUID(),
      vendorId: vendor.id,
      assessmentType,
      overallScore,
      categories,
      recommendation,
      conditions: conditions.length > 0 ? conditions : undefined,
      assessmentDate: new Date(),
      nextAssessmentDue: this.calculateNextAssessmentDate(overallScore),
      findings,
    };
  }

  /**
   * Monitor vendor continuously
   */
  async monitorVendor(
    vendorId: string,
    config: VendorMonitoringConfig
  ): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    alerts: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      message: string;
      detectedAt: Date;
    }>;
    metrics: {
      currentRiskScore: number;
      previousRiskScore: number;
      trend: 'improving' | 'stable' | 'deteriorating';
    };
  }> {
    const alerts: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      message: string;
      detectedAt: Date;
    }> = [];

    // Simulate monitoring checks
    const currentRiskScore = 75; // Would fetch from assessment
    const previousRiskScore = 80;
    const scoreDelta = currentRiskScore - previousRiskScore;

    if (Math.abs(scoreDelta) >= config.alertThresholds.riskScoreDecrease) {
      alerts.push({
        type: 'risk-score-change',
        severity: scoreDelta < 0 ? 'high' : 'low',
        message: `Risk score changed by ${scoreDelta} points`,
        detectedAt: new Date(),
      });
    }

    const trend = scoreDelta > 2 ? 'improving' : scoreDelta < -2 ? 'deteriorating' : 'stable';
    const status = currentRiskScore >= 70 ? 'healthy' : currentRiskScore >= 50 ? 'warning' : 'critical';

    return {
      status,
      alerts,
      metrics: {
        currentRiskScore,
        previousRiskScore,
        trend,
      },
    };
  }

  /**
   * Assess fourth-party (sub-supplier) risks
   */
  async assessFourthPartyRisk(
    vendorId: string,
    subVendors: Array<{ id: string; name: string; relationship: string }>
  ): Promise<FourthPartyRisk[]> {
    return subVendors.map(sub => ({
      vendorId,
      subVendorId: sub.id,
      subVendorName: sub.name,
      relationship: sub.relationship,
      criticalityToVendor: this.assessSubVendorCriticality(sub.relationship),
      hasAccess: this.checkDataAccess(sub.relationship),
      dataShared: this.checkDataSharing(sub.relationship),
      riskScore: Math.random() * 100, // Placeholder
      lastAssessed: new Date(),
    }));
  }

  /**
   * Manage contract compliance
   */
  trackContractCompliance(
    contract: Contract,
    performance: {
      onTimeDelivery: number;
      qualityMetrics: Record<string, number>;
    }
  ): {
    compliant: boolean;
    violations: Array<{
      clause: string;
      severity: 'minor' | 'major' | 'critical';
      description: string;
    }>;
    penalties: Array<{
      type: string;
      amount?: number;
      description: string;
    }>;
  } {
    const violations: Array<{
      clause: string;
      severity: 'minor' | 'major' | 'critical';
      description: string;
    }> = [];

    const penalties: Array<{
      type: string;
      amount?: number;
      description: string;
    }> = [];

    // Check SLA compliance
    if (contract.sla) {
      if (contract.sla.deliveryTimeDays && performance.onTimeDelivery < 0.9) {
        violations.push({
          clause: 'SLA - Delivery Time',
          severity: 'major',
          description: `On-time delivery rate ${(performance.onTimeDelivery * 100).toFixed(1)}% below 90% target`,
        });
      }

      if (contract.sla.qualityTargets) {
        for (const [metric, target] of Object.entries(contract.sla.qualityTargets)) {
          const actual = performance.qualityMetrics[metric];
          if (actual !== undefined && actual < target) {
            violations.push({
              clause: `SLA - Quality: ${metric}`,
              severity: 'major',
              description: `${metric} at ${actual} below target of ${target}`,
            });
          }
        }
      }
    }

    // Calculate penalties based on violations
    for (const violation of violations) {
      if (violation.severity === 'critical') {
        penalties.push({
          type: 'financial',
          amount: 10000,
          description: `Critical SLA violation: ${violation.description}`,
        });
      }
    }

    return {
      compliant: violations.length === 0,
      violations,
      penalties,
    };
  }

  // Private helper methods

  private async assessFinancial(vendor: SupplyChainNode): Promise<number> {
    // Placeholder - would integrate with financial data sources
    return 75;
  }

  private async assessCybersecurity(vendor: SupplyChainNode): Promise<number> {
    // Placeholder - would integrate with security assessment tools
    return 80;
  }

  private async assessOperational(vendor: SupplyChainNode): Promise<number> {
    return vendor.status === 'active' ? 85 : 40;
  }

  private async assessCompliance(vendor: SupplyChainNode): Promise<number> {
    // Placeholder - would check compliance records
    return 70;
  }

  private async assessESG(vendor: SupplyChainNode): Promise<number> {
    // Placeholder - would integrate with ESG scoring services
    return 65;
  }

  private generateConditions(categories: Record<string, number>): string[] {
    const conditions: string[] = [];

    for (const [category, score] of Object.entries(categories)) {
      if (score < 70) {
        conditions.push(`Improve ${category} score to at least 70 within 90 days`);
      }
    }

    return conditions;
  }

  private generateFindings(categories: Record<string, number>): Array<{
    category: string;
    finding: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    recommendation?: string;
  }> {
    const findings: Array<{
      category: string;
      finding: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      recommendation?: string;
    }> = [];

    for (const [category, score] of Object.entries(categories)) {
      if (score < 40) {
        findings.push({
          category,
          finding: `${category} score critically low at ${score}`,
          severity: 'critical',
          recommendation: `Immediate remediation required for ${category}`,
        });
      } else if (score < 60) {
        findings.push({
          category,
          finding: `${category} score below acceptable threshold at ${score}`,
          severity: 'high',
          recommendation: `Develop improvement plan for ${category}`,
        });
      }
    }

    return findings;
  }

  private calculateNextAssessmentDate(score: number): Date {
    const now = new Date();
    let monthsUntilNext: number;

    if (score >= 80) {
      monthsUntilNext = 12; // Annual
    } else if (score >= 60) {
      monthsUntilNext = 6; // Semi-annual
    } else if (score >= 40) {
      monthsUntilNext = 3; // Quarterly
    } else {
      monthsUntilNext = 1; // Monthly
    }

    now.setMonth(now.getMonth() + monthsUntilNext);
    return now;
  }

  private assessSubVendorCriticality(relationship: string): 'low' | 'medium' | 'high' | 'critical' {
    const criticalRelationships = ['manufacturing', 'critical-component', 'data-processor'];
    const highRelationships = ['logistics', 'quality-testing', 'assembly'];

    if (criticalRelationships.some(r => relationship.toLowerCase().includes(r))) {
      return 'critical';
    }
    if (highRelationships.some(r => relationship.toLowerCase().includes(r))) {
      return 'high';
    }
    return 'medium';
  }

  private checkDataAccess(relationship: string): boolean {
    const dataAccessRelationships = ['data-processor', 'cloud-provider', 'it-services'];
    return dataAccessRelationships.some(r => relationship.toLowerCase().includes(r));
  }

  private checkDataSharing(relationship: string): boolean {
    return this.checkDataAccess(relationship);
  }
}
