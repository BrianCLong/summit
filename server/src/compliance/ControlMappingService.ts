// @ts-nocheck
/**
 * Control Mapping Service
 *
 * Maps controls across compliance frameworks and assesses compliance status.
 *
 * SOC 2 Controls: CC4.1 (Monitoring), CC4.2 (Evidence)
 *
 * @module compliance/ControlMappingService
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Control,
  ControlAssessment,
  ControlStatus,
  ComplianceFramework,
  FrameworkMetadata,
  AuditReadiness,
  AuditGap,
  CategoryBreakdown,
} from './types/Compliance.js';
import { evidenceCollector } from './EvidenceCollector.js';
import {
  DataEnvelope,
  GovernanceVerdict,
  GovernanceResult,
  DataClassification,
  createDataEnvelope,
} from '../types/data-envelope.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

// ============================================================================
// Helper Functions
// ============================================================================

function createVerdict(result: GovernanceResult, reason?: string): GovernanceVerdict {
  return {
    verdictId: `verdict-${uuidv4()}`,
    policyId: 'compliance-policy',
    result,
    decidedAt: new Date(),
    reason,
    evaluator: 'ControlMappingService',
  };
}

// ============================================================================
// SOC 2 Controls (Partial - Key Controls)
// ============================================================================

const SOC2_CONTROLS: Control[] = [
  // CC1 - Control Environment
  {
    id: 'CC1.1',
    framework: 'SOC2',
    category: 'Control Environment',
    name: 'Integrity and Ethics',
    description: 'Demonstrates commitment to integrity and ethical values',
    requirement: 'Organization policies and code of conduct must be documented and communicated',
    automatable: false,
    frequency: 'annual',
    evidenceTypes: ['policy_document', 'attestation'],
  },
  {
    id: 'CC1.2',
    framework: 'SOC2',
    category: 'Control Environment',
    name: 'Board Oversight',
    description: 'Board exercises oversight responsibilities',
    requirement: 'Board meeting minutes and governance documentation',
    automatable: false,
    frequency: 'quarterly',
    evidenceTypes: ['policy_document'],
  },
  // CC2 - Communication and Information
  {
    id: 'CC2.1',
    framework: 'SOC2',
    category: 'Communication and Information',
    name: 'Internal Communication',
    description: 'Internal communications support control objectives',
    requirement: 'Security awareness training and communication logs',
    automatable: true,
    frequency: 'monthly',
    evidenceTypes: ['audit_trail', 'attestation'],
  },
  // CC3 - Risk Assessment
  {
    id: 'CC3.1',
    framework: 'SOC2',
    category: 'Risk Assessment',
    name: 'Risk Identification',
    description: 'Organization identifies and assesses risks',
    requirement: 'Risk assessment documentation and tracking',
    automatable: true,
    frequency: 'quarterly',
    evidenceTypes: ['policy_document', 'scan_report'],
  },
  // CC4 - Monitoring Activities
  {
    id: 'CC4.1',
    framework: 'SOC2',
    category: 'Monitoring Activities',
    name: 'Control Monitoring',
    description: 'Organization monitors controls and remediates deficiencies',
    requirement: 'Continuous monitoring and remediation tracking',
    automatable: true,
    frequency: 'continuous',
    evidenceTypes: ['system_config', 'audit_trail', 'metric'],
  },
  // CC5 - Control Activities
  {
    id: 'CC5.1',
    framework: 'SOC2',
    category: 'Control Activities',
    name: 'Logical Access',
    description: 'Logical access controls are implemented',
    requirement: 'Access control policies and system configurations',
    automatable: true,
    frequency: 'daily',
    evidenceTypes: ['system_config', 'access_log'],
  },
  // CC6 - Logical and Physical Access Controls
  {
    id: 'CC6.1',
    framework: 'SOC2',
    category: 'Logical and Physical Access',
    name: 'Access Control Policies',
    description: 'Access control software is implemented',
    requirement: 'RBAC configuration, user provisioning logs',
    automatable: true,
    frequency: 'daily',
    evidenceTypes: ['system_config', 'access_log', 'audit_trail'],
  },
  {
    id: 'CC6.2',
    framework: 'SOC2',
    category: 'Logical and Physical Access',
    name: 'User Registration',
    description: 'User registration and deregistration processes',
    requirement: 'User lifecycle management logs',
    automatable: true,
    frequency: 'daily',
    evidenceTypes: ['access_log', 'audit_trail'],
  },
  {
    id: 'CC6.3',
    framework: 'SOC2',
    category: 'Logical and Physical Access',
    name: 'Access Authorization',
    description: 'Access is authorized based on job function',
    requirement: 'Role-based access control evidence',
    automatable: true,
    frequency: 'daily',
    evidenceTypes: ['system_config', 'access_log'],
  },
  {
    id: 'CC6.6',
    framework: 'SOC2',
    category: 'Logical and Physical Access',
    name: 'External Threats',
    description: 'Protection against external threats',
    requirement: 'Firewall configs, IDS/IPS logs, vulnerability scans',
    automatable: true,
    frequency: 'weekly',
    evidenceTypes: ['system_config', 'scan_report', 'audit_trail'],
  },
  {
    id: 'CC6.7',
    framework: 'SOC2',
    category: 'Logical and Physical Access',
    name: 'Data Transmission',
    description: 'Data transmission is protected',
    requirement: 'Encryption configurations, TLS certificates',
    automatable: true,
    frequency: 'weekly',
    evidenceTypes: ['system_config', 'scan_report'],
  },
  // CC7 - System Operations
  {
    id: 'CC7.1',
    framework: 'SOC2',
    category: 'System Operations',
    name: 'Vulnerability Management',
    description: 'Vulnerabilities are identified and remediated',
    requirement: 'Vulnerability scan reports, patch logs',
    automatable: true,
    frequency: 'weekly',
    evidenceTypes: ['scan_report', 'audit_trail'],
  },
  {
    id: 'CC7.2',
    framework: 'SOC2',
    category: 'System Operations',
    name: 'Incident Detection',
    description: 'Security incidents are detected and responded to',
    requirement: 'SIEM logs, incident response records',
    automatable: true,
    frequency: 'continuous',
    evidenceTypes: ['audit_trail', 'system_config'],
  },
  // CC8 - Change Management
  {
    id: 'CC8.1',
    framework: 'SOC2',
    category: 'Change Management',
    name: 'Change Authorization',
    description: 'Changes are authorized and tested',
    requirement: 'Change management records, approval workflows',
    automatable: true,
    frequency: 'daily',
    evidenceTypes: ['audit_trail', 'test_result'],
  },
  // CC9 - Risk Mitigation
  {
    id: 'CC9.1',
    framework: 'SOC2',
    category: 'Risk Mitigation',
    name: 'Business Partners',
    description: 'Risk from business partners is managed',
    requirement: 'Vendor assessments, contracts',
    automatable: false,
    frequency: 'annual',
    evidenceTypes: ['policy_document', 'attestation'],
  },
];

// ============================================================================
// Framework Metadata
// ============================================================================

const FRAMEWORKS: FrameworkMetadata[] = [
  {
    id: 'SOC2',
    name: 'SOC 2 Type II',
    version: '2017',
    description: 'Service Organization Control 2 - Trust Services Criteria',
    categories: [
      'Control Environment',
      'Communication and Information',
      'Risk Assessment',
      'Monitoring Activities',
      'Control Activities',
      'Logical and Physical Access',
      'System Operations',
      'Change Management',
      'Risk Mitigation',
    ],
    totalControls: SOC2_CONTROLS.length,
    automationCoverage: Math.round(
      (SOC2_CONTROLS.filter((c) => c.automatable).length / SOC2_CONTROLS.length) * 100
    ),
    lastUpdated: '2024-01-01',
  },
  {
    id: 'ISO27001',
    name: 'ISO 27001:2022',
    version: '2022',
    description: 'Information Security Management System',
    categories: ['Organization', 'People', 'Physical', 'Technological'],
    totalControls: 93,
    automationCoverage: 60,
    lastUpdated: '2024-01-01',
  },
  {
    id: 'GDPR',
    name: 'GDPR',
    version: '2018',
    description: 'General Data Protection Regulation',
    categories: ['Data Protection', 'Rights', 'Security', 'Accountability'],
    totalControls: 42,
    automationCoverage: 40,
    lastUpdated: '2024-01-01',
  },
  {
    id: 'HIPAA',
    name: 'HIPAA',
    version: '2013',
    description: 'Health Insurance Portability and Accountability Act',
    categories: ['Administrative', 'Physical', 'Technical'],
    totalControls: 54,
    automationCoverage: 55,
    lastUpdated: '2024-01-01',
  },
];

// ============================================================================
// Control Mapping Service Implementation
// ============================================================================

export class ControlMappingService {
  private controls: Map<string, Control> = new Map();
  private assessments: Map<string, ControlAssessment> = new Map();

  constructor() {
    // Load SOC2 controls
    SOC2_CONTROLS.forEach((control) => {
      this.controls.set(`${control.framework}:${control.id}`, control);
    });

    logger.info('Control mapping service initialized');
  }

  // --------------------------------------------------------------------------
  // Framework & Control Access
  // --------------------------------------------------------------------------

  getFrameworks(): DataEnvelope<FrameworkMetadata[]> {
    return createDataEnvelope(FRAMEWORKS, {
      source: 'ControlMappingService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Framework listing allowed'),
      classification: DataClassification.INTERNAL,
    });
  }

  getControls(
    framework: ComplianceFramework,
    category?: string
  ): DataEnvelope<Control[]> {
    let controls = Array.from(this.controls.values()).filter(
      (c) => c.framework === framework
    );

    if (category) {
      controls = controls.filter((c) => c.category === category);
    }

    return createDataEnvelope(controls, {
      source: 'ControlMappingService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Controls listing allowed'),
      classification: DataClassification.INTERNAL,
    });
  }

  // --------------------------------------------------------------------------
  // Control Assessment
  // --------------------------------------------------------------------------

  async assessControl(
    controlId: string,
    framework: ComplianceFramework,
    tenantId: string,
    actorId: string
  ): Promise<DataEnvelope<ControlAssessment>> {
    const controlKey = `${framework}:${controlId}`;
    const control = this.controls.get(controlKey);

    if (!control) {
      throw new Error(`Control not found: ${controlKey}`);
    }

    // Get related evidence
    const evidenceResult = evidenceCollector.getEvidence(tenantId, {
      controlId,
      framework,
    });

    const evidence = evidenceResult.data;
    const validEvidence = evidence.filter((e) => e.status === 'collected');

    // Calculate status based on evidence
    let status: ControlStatus = 'not_assessed';
    let score = 0;

    if (validEvidence.length === 0) {
      status = 'not_assessed';
      score = 0;
    } else if (validEvidence.length >= control.evidenceTypes.length) {
      // All required evidence types present
      status = 'compliant';
      score = 100;
    } else if (validEvidence.length > 0) {
      status = 'partial';
      score = Math.round((validEvidence.length / control.evidenceTypes.length) * 100);
    }

    const assessment: ControlAssessment = {
      id: uuidv4(),
      controlId,
      framework,
      tenantId,
      status,
      score,
      lastAssessed: new Date().toISOString(),
      nextAssessment: this.calculateNextAssessment(control.frequency),
      assessedBy: control.automatable ? 'automated' : 'manual',
      evidence: validEvidence.map((e) => ({
        evidenceId: e.id,
        type: e.type,
        collectedAt: e.collectedAt,
        valid: e.status === 'collected',
      })),
    };

    this.assessments.set(`${tenantId}:${framework}:${controlId}`, assessment);

    logger.info(
      { controlId, framework, status, score },
      'Control assessed'
    );

    return createDataEnvelope(assessment, {
      source: 'ControlMappingService',
      actor: actorId,
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Control assessment completed'),
      classification: DataClassification.INTERNAL,
    });
  }

  getAssessments(
    tenantId: string,
    framework: ComplianceFramework
  ): DataEnvelope<ControlAssessment[]> {
    const assessments = Array.from(this.assessments.values()).filter(
      (a) => a.tenantId === tenantId && a.framework === framework
    );

    return createDataEnvelope(assessments, {
      source: 'ControlMappingService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Assessment listing allowed'),
      classification: DataClassification.INTERNAL,
    });
  }

  // --------------------------------------------------------------------------
  // Compliance Summary
  // --------------------------------------------------------------------------

  getComplianceSummary(
    tenantId: string,
    framework: ComplianceFramework
  ): DataEnvelope<{
    framework: ComplianceFramework;
    overallScore: number;
    status: 'compliant' | 'non_compliant' | 'partial';
    controlSummary: {
      total: number;
      compliant: number;
      nonCompliant: number;
      partial: number;
      notAssessed: number;
    };
    categoryBreakdown: CategoryBreakdown[];
  }> {
    const controls = this.getControls(framework).data;
    const assessments = this.getAssessments(tenantId, framework).data;

    const assessmentMap = new Map(
      assessments.map((a) => [a.controlId, a])
    );

    // Calculate summary
    const summary = {
      total: controls.length,
      compliant: 0,
      nonCompliant: 0,
      partial: 0,
      notAssessed: 0,
    };

    let totalScore = 0;

    controls.forEach((control) => {
      const assessment = assessmentMap.get(control.id);
      if (!assessment) {
        summary.notAssessed++;
      } else {
        totalScore += assessment.score;
        switch (assessment.status) {
          case 'compliant':
            summary.compliant++;
            break;
          case 'non_compliant':
            summary.nonCompliant++;
            break;
          case 'partial':
            summary.partial++;
            break;
          default:
            summary.notAssessed++;
        }
      }
    });

    const overallScore = controls.length > 0
      ? Math.round(totalScore / controls.length)
      : 0;

    // Calculate category breakdown
    const categories = [...new Set(controls.map((c) => c.category))];
    const categoryBreakdown: CategoryBreakdown[] = categories.map((category) => {
      const categoryControls = controls.filter((c) => c.category === category);
      const categoryAssessments = categoryControls
        .map((c) => assessmentMap.get(c.id))
        .filter(Boolean) as ControlAssessment[];

      const compliant = categoryAssessments.filter((a) => a.status === 'compliant').length;
      const categoryScore = categoryAssessments.length > 0
        ? Math.round(categoryAssessments.reduce((sum, a) => sum + a.score, 0) / categoryAssessments.length)
        : 0;

      return {
        category,
        score: categoryScore,
        controls: {
          compliant,
          total: categoryControls.length,
        },
      };
    });

    // Determine overall status
    let status: 'compliant' | 'non_compliant' | 'partial' = 'partial';
    if (summary.compliant === summary.total) {
      status = 'compliant';
    } else if (summary.nonCompliant > 0 || summary.notAssessed === summary.total) {
      status = 'non_compliant';
    }

    return createDataEnvelope(
      {
        framework,
        overallScore,
        status,
        controlSummary: summary,
        categoryBreakdown,
      },
      {
        source: 'ControlMappingService',
        governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Compliance summary generated'),
        classification: DataClassification.INTERNAL,
      }
    );
  }

  // --------------------------------------------------------------------------
  // Audit Readiness
  // --------------------------------------------------------------------------

  getAuditReadiness(
    tenantId: string,
    framework: ComplianceFramework
  ): DataEnvelope<AuditReadiness> {
    const summary = this.getComplianceSummary(tenantId, framework).data;
    const controls = this.getControls(framework).data;
    const assessments = this.getAssessments(tenantId, framework).data;
    const evidenceStatus = evidenceCollector.getEvidenceStatus(tenantId, framework).data;

    const gaps: AuditGap[] = [];

    // Check for missing assessments
    const assessedControlIds = new Set(assessments.map((a) => a.controlId));
    controls.forEach((control) => {
      if (!assessedControlIds.has(control.id)) {
        gaps.push({
          controlId: control.id,
          controlName: control.name,
          gapType: 'missing_evidence',
          severity: 'high',
          description: `Control ${control.id} has not been assessed`,
          remediation: `Collect required evidence types: ${control.evidenceTypes.join(', ')}`,
          effort: control.automatable ? 'low' : 'medium',
        });
      }
    });

    // Check for stale evidence
    if (evidenceStatus.stale > 0) {
      gaps.push({
        controlId: 'multiple',
        controlName: 'Various Controls',
        gapType: 'stale_evidence',
        severity: 'medium',
        description: `${evidenceStatus.stale} evidence item(s) are stale`,
        remediation: 'Refresh or recollect stale evidence',
        effort: 'medium',
      });
    }

    // Calculate readiness level
    let readinessLevel: AuditReadiness['readinessLevel'] = 'not_ready';
    if (summary.overallScore >= 90) {
      readinessLevel = 'ready';
    } else if (summary.overallScore >= 70) {
      readinessLevel = 'mostly_ready';
    } else if (summary.overallScore >= 50) {
      readinessLevel = 'needs_work';
    }

    const recommendations = this.generateRecommendations(gaps, summary);

    return createDataEnvelope(
      {
        framework,
        tenantId,
        overallScore: summary.overallScore,
        readinessLevel,
        lastUpdated: new Date().toISOString(),
        gaps,
        recommendations,
      },
      {
        source: 'ControlMappingService',
        governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Audit readiness assessed'),
        classification: DataClassification.INTERNAL,
      }
    );
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private calculateNextAssessment(frequency: Control['frequency']): string {
    const intervals: Record<Control['frequency'], number> = {
      continuous: 1,
      daily: 1,
      weekly: 7,
      monthly: 30,
      quarterly: 90,
      annual: 365,
    };

    const days = intervals[frequency] || 30;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  }

  private generateRecommendations(
    gaps: AuditGap[],
    summary: { overallScore: number; controlSummary: any }
  ): string[] {
    const recommendations: string[] = [];

    if (gaps.length > 0) {
      const criticalGaps = gaps.filter((g) => g.severity === 'critical').length;
      if (criticalGaps > 0) {
        recommendations.push(`Address ${criticalGaps} critical gap(s) immediately`);
      }
    }

    if (summary.controlSummary.notAssessed > 0) {
      recommendations.push(
        `Complete assessment of ${summary.controlSummary.notAssessed} pending control(s)`
      );
    }

    if (summary.overallScore < 80) {
      recommendations.push('Focus on improving evidence collection for automated controls');
    }

    if (recommendations.length === 0) {
      recommendations.push('Maintain current compliance posture with regular monitoring');
    }

    return recommendations;
  }
}

// Export singleton
export const controlMappingService = new ControlMappingService();
export default ControlMappingService;
