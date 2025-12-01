import { EventEmitter } from 'events';
import { Pool } from 'pg';
import { v4 as uuid } from 'uuid';
import type { Regulation, ImpactAssessment, AgentEvent } from '../types/index.js';
import { createAgentLogger } from '../utils/logger.js';

const logger = createAgentLogger('ComplianceImpactAssessor');

interface SystemInventory {
  systems: Array<{
    id: string;
    name: string;
    type: string;
    dataTypes: string[];
    jurisdictions: string[];
    complianceFrameworks: string[];
  }>;
  workflows: Array<{
    id: string;
    name: string;
    dataFlows: string[];
    triggers: string[];
  }>;
  policies: Array<{
    id: string;
    name: string;
    type: string;
    scope: string[];
  }>;
}

interface AnalysisResult {
  classification: {
    primaryCategory: string;
    subcategories: string[];
    industries: string[];
    dataTypes: string[];
  };
  keyRequirements: Array<{
    id: string;
    requirement: string;
    mandatory: boolean;
    deadline?: string;
  }>;
  crossBorderImplications: {
    hasImplications: boolean;
    affectedJurisdictions: string[];
  };
}

/**
 * ComplianceImpactAssessor - Evaluates how new regulations impact existing
 * systems, workflows, and policies. Identifies compliance gaps and calculates
 * risk scores.
 */
export class ComplianceImpactAssessor extends EventEmitter {
  private pg: Pool;
  private systemInventory: SystemInventory | null = null;

  constructor(pgPool?: Pool) {
    super();
    this.pg = pgPool || new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  /**
   * Load system inventory for impact analysis
   */
  async loadSystemInventory(): Promise<void> {
    try {
      // In production, this would query actual system registry
      // For now, we define a representative inventory
      this.systemInventory = {
        systems: [
          {
            id: 'sys-001',
            name: 'Customer Data Platform',
            type: 'data_platform',
            dataTypes: ['personal_data', 'behavioral_data', 'financial_data'],
            jurisdictions: ['US', 'EU', 'UK'],
            complianceFrameworks: ['GDPR', 'CCPA', 'SOC2'],
          },
          {
            id: 'sys-002',
            name: 'Analytics Engine',
            type: 'analytics',
            dataTypes: ['aggregated_data', 'personal_data'],
            jurisdictions: ['US', 'EU'],
            complianceFrameworks: ['GDPR', 'AI_ACT'],
          },
          {
            id: 'sys-003',
            name: 'Identity Management',
            type: 'iam',
            dataTypes: ['credentials', 'personal_data', 'biometric'],
            jurisdictions: ['US', 'EU', 'UK'],
            complianceFrameworks: ['GDPR', 'NIST', 'SOC2'],
          },
          {
            id: 'sys-004',
            name: 'Document Management',
            type: 'dms',
            dataTypes: ['documents', 'personal_data', 'sensitive_data'],
            jurisdictions: ['US', 'EU'],
            complianceFrameworks: ['GDPR', 'HIPAA'],
          },
        ],
        workflows: [
          {
            id: 'wf-001',
            name: 'Customer Onboarding',
            dataFlows: ['personal_data', 'identity_verification'],
            triggers: ['user_registration', 'kyc_request'],
          },
          {
            id: 'wf-002',
            name: 'Data Subject Request Handler',
            dataFlows: ['personal_data', 'audit_logs'],
            triggers: ['dsar_request', 'deletion_request'],
          },
          {
            id: 'wf-003',
            name: 'Automated Reporting',
            dataFlows: ['aggregated_data', 'financial_data'],
            triggers: ['scheduled', 'on_demand'],
          },
        ],
        policies: [
          {
            id: 'pol-001',
            name: 'Data Retention Policy',
            type: 'data_governance',
            scope: ['personal_data', 'financial_data'],
          },
          {
            id: 'pol-002',
            name: 'Access Control Policy',
            type: 'security',
            scope: ['all_systems'],
          },
          {
            id: 'pol-003',
            name: 'Consent Management Policy',
            type: 'privacy',
            scope: ['personal_data', 'marketing_data'],
          },
        ],
      };

      logger.info({
        systems: this.systemInventory.systems.length,
        workflows: this.systemInventory.workflows.length,
        policies: this.systemInventory.policies.length,
      }, 'System inventory loaded');
    } catch (error) {
      logger.error({ error }, 'Failed to load system inventory');
      throw error;
    }
  }

  /**
   * Assess impact of a regulation
   */
  async assessImpact(
    regulation: Regulation,
    analysis: AnalysisResult
  ): Promise<ImpactAssessment> {
    if (!this.systemInventory) {
      await this.loadSystemInventory();
    }

    logger.info({ regulationId: regulation.id }, 'Assessing impact');

    const impactAreas = this.identifyImpactAreas(regulation, analysis);
    const complianceGaps = this.identifyComplianceGaps(regulation, analysis);
    const riskScore = this.calculateRiskScore(impactAreas, complianceGaps, analysis);
    const severity = this.determineSeverity(riskScore);

    const assessment: ImpactAssessment = {
      id: uuid(),
      regulationId: regulation.id,
      severity,
      impactAreas,
      complianceGaps,
      riskScore,
      autoRemediationPossible: this.canAutoRemediate(complianceGaps),
      recommendedActions: this.generateRecommendations(impactAreas, complianceGaps),
      assessedAt: new Date(),
      assessedBy: 'ai',
    };

    this.emitImpactAssessed(regulation, assessment);
    return assessment;
  }

  /**
   * Identify impact areas based on regulation analysis
   */
  private identifyImpactAreas(
    regulation: Regulation,
    analysis: AnalysisResult
  ): ImpactAssessment['impactAreas'] {
    const impactAreas: ImpactAssessment['impactAreas'] = [];
    const { dataTypes, primaryCategory } = analysis.classification;
    const { affectedJurisdictions } = analysis.crossBorderImplications;

    // Find affected systems
    const affectedSystems = this.systemInventory!.systems.filter(sys => {
      const hasMatchingDataType = sys.dataTypes.some(dt => dataTypes.includes(dt));
      const hasMatchingJurisdiction = sys.jurisdictions.some(j =>
        affectedJurisdictions.includes(j) || j === regulation.jurisdiction
      );
      return hasMatchingDataType && hasMatchingJurisdiction;
    });

    if (affectedSystems.length > 0) {
      impactAreas.push({
        area: 'Data Processing Systems',
        description: `${affectedSystems.length} systems process data types covered by this regulation`,
        affectedSystems: affectedSystems.map(s => s.name),
        requiredActions: [
          'Review data processing activities',
          'Update data flow documentation',
          'Implement required controls',
        ],
        deadline: analysis.keyRequirements.find(r => r.deadline)?.deadline
          ? new Date(analysis.keyRequirements.find(r => r.deadline)!.deadline!)
          : undefined,
      });
    }

    // Find affected workflows
    const affectedWorkflows = this.systemInventory!.workflows.filter(wf =>
      wf.dataFlows.some(df => dataTypes.includes(df) || df.includes(primaryCategory))
    );

    if (affectedWorkflows.length > 0) {
      impactAreas.push({
        area: 'Business Workflows',
        description: `${affectedWorkflows.length} workflows handle data subject to new requirements`,
        affectedSystems: affectedWorkflows.map(w => w.name),
        requiredActions: [
          'Audit workflow compliance',
          'Add required checkpoints',
          'Update process documentation',
        ],
      });
    }

    // Check policy impacts
    const affectedPolicies = this.systemInventory!.policies.filter(p =>
      p.scope.some(s => dataTypes.includes(s) || s === 'all_systems')
    );

    if (affectedPolicies.length > 0) {
      impactAreas.push({
        area: 'Governance Policies',
        description: `${affectedPolicies.length} policies may need updates`,
        affectedSystems: affectedPolicies.map(p => p.name),
        requiredActions: [
          'Review policy alignment',
          'Update policy language',
          'Retrain staff on changes',
        ],
      });
    }

    return impactAreas;
  }

  /**
   * Identify compliance gaps
   */
  private identifyComplianceGaps(
    regulation: Regulation,
    analysis: AnalysisResult
  ): ImpactAssessment['complianceGaps'] {
    const gaps: ImpactAssessment['complianceGaps'] = [];

    for (const requirement of analysis.keyRequirements) {
      if (!requirement.mandatory) continue;

      // Simulate gap detection based on requirement type
      const reqLower = requirement.requirement.toLowerCase();

      if (reqLower.includes('consent') || reqLower.includes('permission')) {
        gaps.push({
          gapId: `gap-${uuid().slice(0, 8)}`,
          description: 'Consent mechanism may not meet new requirements',
          currentState: 'Basic opt-in/opt-out consent collection',
          requiredState: requirement.requirement,
          remediationSteps: [
            'Implement granular consent management',
            'Add consent versioning',
            'Create consent audit trail',
          ],
          estimatedEffort: '2-3 weeks',
        });
      }

      if (reqLower.includes('retention') || reqLower.includes('deletion')) {
        gaps.push({
          gapId: `gap-${uuid().slice(0, 8)}`,
          description: 'Data retention policies need alignment',
          currentState: 'Standard 7-year retention across all data',
          requiredState: requirement.requirement,
          remediationSteps: [
            'Define category-specific retention periods',
            'Implement automated deletion workflows',
            'Add retention policy enforcement',
          ],
          estimatedEffort: '3-4 weeks',
        });
      }

      if (reqLower.includes('notify') || reqLower.includes('breach')) {
        gaps.push({
          gapId: `gap-${uuid().slice(0, 8)}`,
          description: 'Breach notification process needs update',
          currentState: 'Manual breach notification process',
          requiredState: requirement.requirement,
          remediationSteps: [
            'Automate breach detection alerts',
            'Update notification templates',
            'Reduce notification timeline',
          ],
          estimatedEffort: '1-2 weeks',
        });
      }

      if (reqLower.includes('audit') || reqLower.includes('log')) {
        gaps.push({
          gapId: `gap-${uuid().slice(0, 8)}`,
          description: 'Audit logging coverage incomplete',
          currentState: 'Partial audit logging on critical systems',
          requiredState: requirement.requirement,
          remediationSteps: [
            'Extend audit logging coverage',
            'Implement immutable audit store',
            'Add real-time audit monitoring',
          ],
          estimatedEffort: '2-3 weeks',
        });
      }
    }

    return gaps;
  }

  /**
   * Calculate risk score
   */
  private calculateRiskScore(
    impactAreas: ImpactAssessment['impactAreas'],
    complianceGaps: ImpactAssessment['complianceGaps'],
    analysis: AnalysisResult
  ): number {
    let score = 0;

    // Impact area weight (0-30)
    score += Math.min(impactAreas.length * 10, 30);

    // Compliance gap weight (0-40)
    score += Math.min(complianceGaps.length * 10, 40);

    // Cross-border implications (0-15)
    if (analysis.crossBorderImplications.hasImplications) {
      score += 10 + Math.min(analysis.crossBorderImplications.affectedJurisdictions.length * 2, 5);
    }

    // Mandatory requirements (0-15)
    const mandatoryCount = analysis.keyRequirements.filter(r => r.mandatory).length;
    score += Math.min(mandatoryCount * 3, 15);

    return Math.min(score, 100);
  }

  /**
   * Determine severity from risk score
   */
  private determineSeverity(riskScore: number): ImpactAssessment['severity'] {
    if (riskScore >= 80) return 'critical';
    if (riskScore >= 60) return 'high';
    if (riskScore >= 40) return 'medium';
    if (riskScore >= 20) return 'low';
    return 'informational';
  }

  /**
   * Check if auto-remediation is possible
   */
  private canAutoRemediate(gaps: ImpactAssessment['complianceGaps']): boolean {
    // Auto-remediation possible for policy/config changes
    const autoRemediablePatterns = ['policy', 'configuration', 'notification', 'logging'];
    return gaps.every(gap =>
      autoRemediablePatterns.some(p =>
        gap.remediationSteps.some(s => s.toLowerCase().includes(p))
      )
    );
  }

  /**
   * Generate recommended actions
   */
  private generateRecommendations(
    impactAreas: ImpactAssessment['impactAreas'],
    complianceGaps: ImpactAssessment['complianceGaps']
  ): string[] {
    const recommendations: string[] = [];

    // Priority actions based on gaps
    if (complianceGaps.length > 0) {
      recommendations.push(`Address ${complianceGaps.length} identified compliance gaps`);
    }

    // System-specific recommendations
    for (const area of impactAreas) {
      if (area.deadline) {
        recommendations.push(
          `Complete ${area.area} updates by ${area.deadline.toISOString().split('T')[0]}`
        );
      }
    }

    // General recommendations
    recommendations.push(
      'Schedule compliance review meeting with stakeholders',
      'Update risk register with new regulatory requirements',
      'Notify affected business units of upcoming changes'
    );

    return recommendations;
  }

  /**
   * Emit impact assessed event
   */
  private emitImpactAssessed(regulation: Regulation, assessment: ImpactAssessment): void {
    const event: AgentEvent = {
      id: uuid(),
      type: 'impact_assessed',
      payload: { regulation, assessment },
      timestamp: new Date(),
      agentId: 'ComplianceImpactAssessor',
    };

    logger.info({
      regulationId: regulation.id,
      severity: assessment.severity,
      riskScore: assessment.riskScore,
      gaps: assessment.complianceGaps.length,
    }, 'Impact assessment complete');

    this.emit('impact_assessed', event);
  }
}
