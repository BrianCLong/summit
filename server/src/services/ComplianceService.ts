/**
 * Compliance Automation Service
 * 
 * Implements automated compliance monitoring, reporting, and enforcement
 * for GDPR, HIPAA, SOC 2, ISO 27001, and other regulatory frameworks.
 */

import logger from '../utils/logger.js';
import { CircuitBreaker } from '../utils/CircuitBreaker.js';
import { getRedisClient } from '../db/redis.js';
import { dlpService } from './DLPService.js';
import fs from 'fs/promises';
import path from 'path';

export interface ComplianceFramework {
  id: string;
  name: string;
  version: string;
  description: string;
  enabled: boolean;
  requirements: ComplianceRequirement[];
  assessmentFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  lastAssessment?: Date;
  nextAssessment: Date;
  status: 'compliant' | 'non-compliant' | 'pending' | 'unknown';
  score: number; // 0-100
}

export interface ComplianceRequirement {
  id: string;
  frameworkId: string;
  category: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'compliant' | 'non-compliant' | 'partial' | 'not-applicable';
  controls: ComplianceControl[];
  evidence: ComplianceEvidence[];
  lastChecked?: Date;
  nextCheck: Date;
  automatedCheck: boolean;
  remediationSteps?: string[];
}

export interface ComplianceControl {
  id: string;
  type: 'technical' | 'administrative' | 'physical';
  description: string;
  implementation: string;
  automated: boolean;
  effectiveness: 'high' | 'medium' | 'low';
  lastTested?: Date;
  testResults?: any;
}

export interface ComplianceEvidence {
  id: string;
  type: 'document' | 'screenshot' | 'log' | 'audit-trail' | 'certificate';
  title: string;
  description: string;
  filePath?: string;
  metadata: Record<string, any>;
  collectedAt: Date;
  validUntil?: Date;
  automated: boolean;
}

export interface ComplianceReport {
  id: string;
  frameworkId: string;
  generatedAt: Date;
  reportPeriod: {
    startDate: Date;
    endDate: Date;
  };
  overallScore: number;
  status: 'compliant' | 'non-compliant' | 'pending';
  summary: {
    totalRequirements: number;
    compliantRequirements: number;
    nonCompliantRequirements: number;
    partialRequirements: number;
  };
  findings: ComplianceFinding[];
  recommendations: ComplianceRecommendation[];
  evidence: ComplianceEvidence[];
}

export interface ComplianceFinding {
  id: string;
  requirementId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  likelihood: 'low' | 'medium' | 'high';
  riskRating: number; // 1-10
  detectedAt: Date;
  status: 'open' | 'in-progress' | 'resolved' | 'accepted';
}

export interface ComplianceRecommendation {
  id: string;
  findingId: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  timeline: string;
  assignee?: string;
  status: 'pending' | 'in-progress' | 'completed';
}

class ComplianceService {
  private frameworks: Map<string, ComplianceFramework> = new Map();
  private circuitBreaker: CircuitBreaker;
  private readonly cachePrefix = 'compliance:';

  constructor() {
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      successThreshold: 3,
      resetTimeout: 30000,
      p95ThresholdMs: 2000,
      errorRateThreshold: 0.5,
    });

    this.initializeFrameworks();
  }

  /**
   * Initialize compliance frameworks with default configurations
   */
  private async initializeFrameworks(): Promise<void> {
    try {
      // GDPR Framework
      const gdprFramework: ComplianceFramework = {
        id: 'gdpr',
        name: 'General Data Protection Regulation',
        version: '2018',
        description: 'EU General Data Protection Regulation compliance framework',
        enabled: true,
        assessmentFrequency: 'monthly',
        nextAssessment: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'pending',
        score: 0,
        requirements: [
          {
            id: 'gdpr-art-25',
            frameworkId: 'gdpr',
            category: 'Data Protection by Design',
            title: 'Data Protection by Design and by Default',
            description: 'Implement appropriate technical and organizational measures to ensure data protection principles',
            priority: 'critical',
            status: 'partial',
            controls: [
              {
                id: 'gdpr-art-25-ctrl-1',
                type: 'technical',
                description: 'Data minimization controls',
                implementation: 'DLP policies and automated data classification',
                automated: true,
                effectiveness: 'high'
              },
              {
                id: 'gdpr-art-25-ctrl-2',
                type: 'technical',
                description: 'Pseudonymization and encryption',
                implementation: 'Automatic PII redaction and field-level encryption',
                automated: true,
                effectiveness: 'high'
              }
            ],
            evidence: [],
            nextCheck: new Date(Date.now() + 24 * 60 * 60 * 1000),
            automatedCheck: true,
            remediationSteps: [
              'Review current data collection practices',
              'Implement data minimization policies',
              'Enable automatic encryption for sensitive fields',
              'Configure DLP policies for GDPR compliance'
            ]
          },
          {
            id: 'gdpr-art-30',
            frameworkId: 'gdpr',
            category: 'Records of Processing',
            title: 'Records of Processing Activities',
            description: 'Maintain records of all data processing activities',
            priority: 'high',
            status: 'partial',
            controls: [
              {
                id: 'gdpr-art-30-ctrl-1',
                type: 'administrative',
                description: 'Automated processing activity logging',
                implementation: 'Audit logs and processing records in database',
                automated: true,
                effectiveness: 'medium'
              }
            ],
            evidence: [],
            nextCheck: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            automatedCheck: true
          },
          {
            id: 'gdpr-art-32',
            frameworkId: 'gdpr',
            category: 'Security of Processing',
            title: 'Security of Processing',
            description: 'Implement appropriate technical and organizational measures to ensure security',
            priority: 'critical',
            status: 'partial',
            controls: [
              {
                id: 'gdpr-art-32-ctrl-1',
                type: 'technical',
                description: 'Encryption at rest and in transit',
                implementation: 'TLS 1.3, AES-256 encryption',
                automated: true,
                effectiveness: 'high'
              },
              {
                id: 'gdpr-art-32-ctrl-2',
                type: 'technical',
                description: 'Access controls and authentication',
                implementation: 'RBAC, MFA, SSO integration',
                automated: true,
                effectiveness: 'high'
              }
            ],
            evidence: [],
            nextCheck: new Date(Date.now() + 24 * 60 * 60 * 1000),
            automatedCheck: true
          }
        ]
      };

      // SOC 2 Framework
      const soc2Framework: ComplianceFramework = {
        id: 'soc2',
        name: 'SOC 2 Type II',
        version: '2017',
        description: 'System and Organization Controls 2 compliance framework',
        enabled: true,
        assessmentFrequency: 'quarterly',
        nextAssessment: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        status: 'pending',
        score: 0,
        requirements: [
          {
            id: 'soc2-cc-6.1',
            frameworkId: 'soc2',
            category: 'Logical and Physical Access Controls',
            title: 'Logical and Physical Access Controls',
            description: 'The entity implements logical and physical access controls to protect entity system resources',
            priority: 'critical',
            status: 'partial',
            controls: [
              {
                id: 'soc2-cc-6.1-ctrl-1',
                type: 'technical',
                description: 'Multi-factor authentication',
                implementation: 'MFA required for all administrative access',
                automated: true,
                effectiveness: 'high'
              },
              {
                id: 'soc2-cc-6.1-ctrl-2',
                type: 'technical',
                description: 'Role-based access control',
                implementation: 'RBAC with principle of least privilege',
                automated: true,
                effectiveness: 'high'
              }
            ],
            evidence: [],
            nextCheck: new Date(Date.now() + 24 * 60 * 60 * 1000),
            automatedCheck: true
          },
          {
            id: 'soc2-cc-7.1',
            frameworkId: 'soc2',
            category: 'System Operations',
            title: 'System Operations',
            description: 'The entity monitors system capacity and utilization',
            priority: 'medium',
            status: 'partial',
            controls: [
              {
                id: 'soc2-cc-7.1-ctrl-1',
                type: 'technical',
                description: 'Automated monitoring and alerting',
                implementation: 'Prometheus, Grafana, PagerDuty integration',
                automated: true,
                effectiveness: 'high'
              }
            ],
            evidence: [],
            nextCheck: new Date(Date.now() + 24 * 60 * 60 * 1000),
            automatedCheck: true
          }
        ]
      };

      // ISO 27001 Framework
      const iso27001Framework: ComplianceFramework = {
        id: 'iso27001',
        name: 'ISO 27001:2022',
        version: '2022',
        description: 'Information Security Management System standard',
        enabled: true,
        assessmentFrequency: 'monthly',
        nextAssessment: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'pending',
        score: 0,
        requirements: [
          {
            id: 'iso27001-a-8-2',
            frameworkId: 'iso27001',
            category: 'Information Classification',
            title: 'Information Classification',
            description: 'Information shall be classified in terms of legal, value, criticality and sensitivity',
            priority: 'high',
            status: 'partial',
            controls: [
              {
                id: 'iso27001-a-8-2-ctrl-1',
                type: 'technical',
                description: 'Automated data classification',
                implementation: 'DLP service with classification rules',
                automated: true,
                effectiveness: 'medium'
              }
            ],
            evidence: [],
            nextCheck: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            automatedCheck: true
          },
          {
            id: 'iso27001-a-12-6',
            frameworkId: 'iso27001',
            category: 'Technical Vulnerability Management',
            title: 'Management of Technical Vulnerabilities',
            description: 'Information about technical vulnerabilities shall be obtained and managed',
            priority: 'critical',
            status: 'pending',
            controls: [
              {
                id: 'iso27001-a-12-6-ctrl-1',
                type: 'technical',
                description: 'Automated vulnerability scanning',
                implementation: 'Container image scanning, dependency checking',
                automated: true,
                effectiveness: 'high'
              }
            ],
            evidence: [],
            nextCheck: new Date(Date.now() + 24 * 60 * 60 * 1000),
            automatedCheck: true
          }
        ]
      };

      this.frameworks.set('gdpr', gdprFramework);
      this.frameworks.set('soc2', soc2Framework);
      this.frameworks.set('iso27001', iso27001Framework);

      logger.info('Compliance frameworks initialized', {
        component: 'ComplianceService',
        frameworkCount: this.frameworks.size,
        frameworks: Array.from(this.frameworks.keys())
      });

    } catch (error) {
      logger.error('Failed to initialize compliance frameworks', {
        component: 'ComplianceService',
        error: error.message
      });
    }
  }

  /**
   * Run automated compliance assessment for a framework
   */
  async runAssessment(frameworkId: string): Promise<ComplianceReport> {
    const startTime = Date.now();

    try {
      return await this.circuitBreaker.execute(async () => {
        const framework = this.frameworks.get(frameworkId);
        if (!framework) {
          throw new Error(`Framework not found: ${frameworkId}`);
        }

        logger.info('Starting compliance assessment', {
          component: 'ComplianceService',
          frameworkId,
          frameworkName: framework.name
        });

        const reportId = `${frameworkId}-${Date.now()}`;
        const findings: ComplianceFinding[] = [];
        const recommendations: ComplianceRecommendation[] = [];
        const evidence: ComplianceEvidence[] = [];

        let compliantCount = 0;
        let nonCompliantCount = 0;
        let partialCount = 0;

        // Assess each requirement
        for (const requirement of framework.requirements) {
          const requirementResult = await this.assessRequirement(requirement);
          
          switch (requirementResult.status) {
            case 'compliant':
              compliantCount++;
              break;
            case 'non-compliant':
              nonCompliantCount++;
              findings.push(...requirementResult.findings);
              recommendations.push(...requirementResult.recommendations);
              break;
            case 'partial':
              partialCount++;
              findings.push(...requirementResult.findings);
              recommendations.push(...requirementResult.recommendations);
              break;
          }

          evidence.push(...requirementResult.evidence);
          requirement.status = requirementResult.status;
          requirement.lastChecked = new Date();
        }

        // Calculate overall score
        const totalRequirements = framework.requirements.length;
        const overallScore = Math.round(
          ((compliantCount + partialCount * 0.5) / totalRequirements) * 100
        );

        // Determine overall status
        const overallStatus = overallScore >= 80 ? 'compliant' : 'non-compliant';

        // Update framework
        framework.score = overallScore;
        framework.status = overallStatus;
        framework.lastAssessment = new Date();

        const report: ComplianceReport = {
          id: reportId,
          frameworkId,
          generatedAt: new Date(),
          reportPeriod: {
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            endDate: new Date()
          },
          overallScore,
          status: overallStatus,
          summary: {
            totalRequirements,
            compliantRequirements: compliantCount,
            nonCompliantRequirements: nonCompliantCount,
            partialRequirements: partialCount
          },
          findings,
          recommendations,
          evidence
        };

        // Cache the report
        await this.cacheReport(report);

        logger.info('Compliance assessment completed', {
          component: 'ComplianceService',
          frameworkId,
          duration: Date.now() - startTime,
          overallScore,
          status: overallStatus,
          findingsCount: findings.length
        });

        return report;
      });
    } catch (error) {
      logger.error('Compliance assessment failed', {
        component: 'ComplianceService',
        frameworkId,
        error: error.message,
        duration: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Assess a specific compliance requirement
   */
  private async assessRequirement(requirement: ComplianceRequirement): Promise<{
    status: 'compliant' | 'non-compliant' | 'partial';
    findings: ComplianceFinding[];
    recommendations: ComplianceRecommendation[];
    evidence: ComplianceEvidence[];
  }> {
    const findings: ComplianceFinding[] = [];
    const recommendations: ComplianceRecommendation[] = [];
    const evidence: ComplianceEvidence[] = [];

    try {
      // Framework-specific assessment logic
      switch (requirement.frameworkId) {
        case 'gdpr':
          return await this.assessGDPRRequirement(requirement);
        case 'soc2':
          return await this.assessSOC2Requirement(requirement);
        case 'iso27001':
          return await this.assessISO27001Requirement(requirement);
        default:
          return await this.assessGenericRequirement(requirement);
      }
    } catch (error) {
      logger.error('Requirement assessment failed', {
        component: 'ComplianceService',
        requirementId: requirement.id,
        error: error.message
      });

      // Return non-compliant status on assessment failure
      return {
        status: 'non-compliant',
        findings: [{
          id: `${requirement.id}-assessment-error`,
          requirementId: requirement.id,
          severity: 'high',
          title: 'Assessment Error',
          description: `Failed to assess requirement: ${error.message}`,
          impact: 'Unable to determine compliance status',
          likelihood: 'high',
          riskRating: 7,
          detectedAt: new Date(),
          status: 'open'
        }],
        recommendations: [{
          id: `${requirement.id}-fix-assessment`,
          findingId: `${requirement.id}-assessment-error`,
          title: 'Fix Assessment Error',
          description: 'Investigate and fix the assessment error',
          priority: 'high',
          effort: 'medium',
          impact: 'high',
          timeline: '1 week',
          status: 'pending'
        }],
        evidence: []
      };
    }
  }

  /**
   * Assess GDPR-specific requirements
   */
  private async assessGDPRRequirement(requirement: ComplianceRequirement): Promise<any> {
    const findings: ComplianceFinding[] = [];
    const recommendations: ComplianceRecommendation[] = [];
    const evidence: ComplianceEvidence[] = [];

    switch (requirement.id) {
      case 'gdpr-art-25': // Data Protection by Design
        {
          // Check DLP policies
          const dlpPolicies = dlpService.listPolicies();
          const piiPolicy = dlpPolicies.find(p => p.id === 'pii-detection' && p.enabled);
          
          if (!piiPolicy) {
            findings.push({
              id: 'gdpr-art-25-no-pii-policy',
              requirementId: requirement.id,
              severity: 'critical',
              title: 'No PII Detection Policy',
              description: 'PII detection policy is not enabled or configured',
              impact: 'Personal data may not be adequately protected',
              likelihood: 'high',
              riskRating: 9,
              detectedAt: new Date(),
              status: 'open'
            });
            
            recommendations.push({
              id: 'gdpr-art-25-enable-pii',
              findingId: 'gdpr-art-25-no-pii-policy',
              title: 'Enable PII Detection',
              description: 'Configure and enable automated PII detection policy',
              priority: 'critical',
              effort: 'low',
              impact: 'high',
              timeline: '1 day',
              status: 'pending'
            });
          } else {
            evidence.push({
              id: 'gdpr-art-25-pii-policy-evidence',
              type: 'audit-trail',
              title: 'PII Detection Policy Configuration',
              description: 'Automated PII detection policy is configured and enabled',
              metadata: {
                policyId: piiPolicy.id,
                enabled: piiPolicy.enabled,
                lastUpdated: piiPolicy.updatedAt
              },
              collectedAt: new Date(),
              automated: true
            });
          }

          // Check encryption configuration
          const encryptionEnabled = process.env.ENCRYPTION_ENABLED === 'true';
          if (!encryptionEnabled) {
            findings.push({
              id: 'gdpr-art-25-no-encryption',
              requirementId: requirement.id,
              severity: 'high',
              title: 'Encryption Not Enabled',
              description: 'Data encryption is not properly configured',
              impact: 'Personal data may be stored without adequate protection',
              likelihood: 'medium',
              riskRating: 7,
              detectedAt: new Date(),
              status: 'open'
            });
          } else {
            evidence.push({
              id: 'gdpr-art-25-encryption-evidence',
              type: 'log',
              title: 'Encryption Configuration',
              description: 'Data encryption is enabled and configured',
              metadata: {
                encryptionEnabled: true,
                checkedAt: new Date()
              },
              collectedAt: new Date(),
              automated: true
            });
          }

          const status = findings.length === 0 ? 'compliant' : 
                        findings.some(f => f.severity === 'critical') ? 'non-compliant' : 'partial';
          
          return { status, findings, recommendations, evidence };
        }

      case 'gdpr-art-30': // Records of Processing
        {
          // Check audit logging
          const auditLoggingEnabled = process.env.AUDIT_LOGGING_ENABLED !== 'false';
          
          if (!auditLoggingEnabled) {
            findings.push({
              id: 'gdpr-art-30-no-audit-logs',
              requirementId: requirement.id,
              severity: 'high',
              title: 'Audit Logging Not Enabled',
              description: 'Processing activity audit logging is not enabled',
              impact: 'Cannot demonstrate compliance with processing records requirement',
              likelihood: 'high',
              riskRating: 8,
              detectedAt: new Date(),
              status: 'open'
            });
          } else {
            evidence.push({
              id: 'gdpr-art-30-audit-logs-evidence',
              type: 'log',
              title: 'Audit Logging Configuration',
              description: 'Processing activity audit logging is enabled',
              metadata: {
                auditLoggingEnabled: true,
                checkedAt: new Date()
              },
              collectedAt: new Date(),
              automated: true
            });
          }

          const status = findings.length === 0 ? 'compliant' : 'non-compliant';
          return { status, findings, recommendations, evidence };
        }

      case 'gdpr-art-32': // Security of Processing
        {
          // Check TLS/HTTPS
          const tlsEnabled = process.env.TLS_ENABLED !== 'false';
          if (!tlsEnabled) {
            findings.push({
              id: 'gdpr-art-32-no-tls',
              requirementId: requirement.id,
              severity: 'critical',
              title: 'TLS Not Enabled',
              description: 'Transport Layer Security is not properly configured',
              impact: 'Data in transit is not encrypted',
              likelihood: 'high',
              riskRating: 9,
              detectedAt: new Date(),
              status: 'open'
            });
          }

          // Check authentication
          const authEnabled = process.env.AUTH_REQUIRED !== 'false';
          if (!authEnabled) {
            findings.push({
              id: 'gdpr-art-32-no-auth',
              requirementId: requirement.id,
              severity: 'critical',
              title: 'Authentication Not Required',
              description: 'User authentication is not enforced',
              impact: 'Unauthorized access to personal data possible',
              likelihood: 'high',
              riskRating: 9,
              detectedAt: new Date(),
              status: 'open'
            });
          } else {
            evidence.push({
              id: 'gdpr-art-32-auth-evidence',
              type: 'log',
              title: 'Authentication Configuration',
              description: 'User authentication is required and enforced',
              metadata: {
                authRequired: true,
                checkedAt: new Date()
              },
              collectedAt: new Date(),
              automated: true
            });
          }

          const status = findings.length === 0 ? 'compliant' :
                        findings.some(f => f.severity === 'critical') ? 'non-compliant' : 'partial';
          
          return { status, findings, recommendations, evidence };
        }

      default:
        return await this.assessGenericRequirement(requirement);
    }
  }

  /**
   * Assess SOC 2-specific requirements
   */
  private async assessSOC2Requirement(requirement: ComplianceRequirement): Promise<any> {
    const findings: ComplianceFinding[] = [];
    const recommendations: ComplianceRecommendation[] = [];
    const evidence: ComplianceEvidence[] = [];

    switch (requirement.id) {
      case 'soc2-cc-6.1': // Logical and Physical Access Controls
        {
          // Check MFA configuration
          const mfaEnabled = process.env.MFA_ENABLED === 'true';
          if (!mfaEnabled) {
            findings.push({
              id: 'soc2-cc-6.1-no-mfa',
              requirementId: requirement.id,
              severity: 'critical',
              title: 'Multi-Factor Authentication Not Enabled',
              description: 'MFA is not configured for administrative access',
              impact: 'Increased risk of unauthorized access',
              likelihood: 'high',
              riskRating: 9,
              detectedAt: new Date(),
              status: 'open'
            });
          } else {
            evidence.push({
              id: 'soc2-cc-6.1-mfa-evidence',
              type: 'audit-trail',
              title: 'MFA Configuration',
              description: 'Multi-factor authentication is enabled',
              metadata: { mfaEnabled: true },
              collectedAt: new Date(),
              automated: true
            });
          }

          // Check RBAC
          const rbacEnabled = process.env.RBAC_ENABLED !== 'false';
          if (!rbacEnabled) {
            findings.push({
              id: 'soc2-cc-6.1-no-rbac',
              requirementId: requirement.id,
              severity: 'high',
              title: 'Role-Based Access Control Not Implemented',
              description: 'RBAC is not properly configured',
              impact: 'Users may have excessive privileges',
              likelihood: 'medium',
              riskRating: 7,
              detectedAt: new Date(),
              status: 'open'
            });
          }

          const status = findings.length === 0 ? 'compliant' : 
                        findings.some(f => f.severity === 'critical') ? 'non-compliant' : 'partial';
          
          return { status, findings, recommendations, evidence };
        }

      case 'soc2-cc-7.1': // System Operations
        {
          // Check monitoring
          const monitoringEnabled = process.env.MONITORING_ENABLED !== 'false';
          if (!monitoringEnabled) {
            findings.push({
              id: 'soc2-cc-7.1-no-monitoring',
              requirementId: requirement.id,
              severity: 'medium',
              title: 'System Monitoring Not Configured',
              description: 'Automated system monitoring is not enabled',
              impact: 'Cannot detect system capacity issues proactively',
              likelihood: 'medium',
              riskRating: 5,
              detectedAt: new Date(),
              status: 'open'
            });
          } else {
            evidence.push({
              id: 'soc2-cc-7.1-monitoring-evidence',
              type: 'log',
              title: 'System Monitoring Configuration',
              description: 'Automated system monitoring is configured',
              metadata: { monitoringEnabled: true },
              collectedAt: new Date(),
              automated: true
            });
          }

          const status = findings.length === 0 ? 'compliant' : 'partial';
          return { status, findings, recommendations, evidence };
        }

      default:
        return await this.assessGenericRequirement(requirement);
    }
  }

  /**
   * Assess ISO 27001-specific requirements
   */
  private async assessISO27001Requirement(requirement: ComplianceRequirement): Promise<any> {
    const findings: ComplianceFinding[] = [];
    const recommendations: ComplianceRecommendation[] = [];
    const evidence: ComplianceEvidence[] = [];

    switch (requirement.id) {
      case 'iso27001-a-8-2': // Information Classification
        {
          // Check data classification via DLP
          const dlpPolicies = dlpService.listPolicies();
          const classificationPolicies = dlpPolicies.filter(p => 
            p.enabled && (p.name.toLowerCase().includes('classification') || p.name.toLowerCase().includes('pii'))
          );

          if (classificationPolicies.length === 0) {
            findings.push({
              id: 'iso27001-a-8-2-no-classification',
              requirementId: requirement.id,
              severity: 'medium',
              title: 'No Data Classification Policies',
              description: 'Automated data classification is not implemented',
              impact: 'Information sensitivity levels are not automatically identified',
              likelihood: 'high',
              riskRating: 6,
              detectedAt: new Date(),
              status: 'open'
            });
          } else {
            evidence.push({
              id: 'iso27001-a-8-2-classification-evidence',
              type: 'audit-trail',
              title: 'Data Classification Policies',
              description: 'Automated data classification policies are configured',
              metadata: { 
                policyCount: classificationPolicies.length,
                policies: classificationPolicies.map(p => p.id)
              },
              collectedAt: new Date(),
              automated: true
            });
          }

          const status = findings.length === 0 ? 'compliant' : 'partial';
          return { status, findings, recommendations, evidence };
        }

      case 'iso27001-a-12-6': // Technical Vulnerability Management
        {
          // Check vulnerability scanning (placeholder - would integrate with actual scanning tools)
          const vulnScanningEnabled = process.env.VULN_SCANNING_ENABLED === 'true';
          
          if (!vulnScanningEnabled) {
            findings.push({
              id: 'iso27001-a-12-6-no-vuln-scan',
              requirementId: requirement.id,
              severity: 'high',
              title: 'Vulnerability Scanning Not Enabled',
              description: 'Automated vulnerability scanning is not configured',
              impact: 'Technical vulnerabilities may go undetected',
              likelihood: 'high',
              riskRating: 8,
              detectedAt: new Date(),
              status: 'open'
            });
            
            recommendations.push({
              id: 'iso27001-a-12-6-enable-vuln-scan',
              findingId: 'iso27001-a-12-6-no-vuln-scan',
              title: 'Enable Vulnerability Scanning',
              description: 'Configure automated vulnerability scanning for containers and dependencies',
              priority: 'high',
              effort: 'medium',
              impact: 'high',
              timeline: '2 weeks',
              status: 'pending'
            });
          } else {
            evidence.push({
              id: 'iso27001-a-12-6-vuln-scan-evidence',
              type: 'log',
              title: 'Vulnerability Scanning Configuration',
              description: 'Automated vulnerability scanning is enabled',
              metadata: { vulnScanningEnabled: true },
              collectedAt: new Date(),
              automated: true
            });
          }

          const status = findings.length === 0 ? 'compliant' : 'non-compliant';
          return { status, findings, recommendations, evidence };
        }

      default:
        return await this.assessGenericRequirement(requirement);
    }
  }

  /**
   * Generic requirement assessment
   */
  private async assessGenericRequirement(requirement: ComplianceRequirement): Promise<any> {
    // Generic assessment based on control effectiveness
    const findings: ComplianceFinding[] = [];
    const recommendations: ComplianceRecommendation[] = [];
    const evidence: ComplianceEvidence[] = [];

    // Check if automated controls are working
    const automatedControls = requirement.controls.filter(c => c.automated);
    const effectiveControls = automatedControls.filter(c => c.effectiveness === 'high');

    if (automatedControls.length === 0) {
      findings.push({
        id: `${requirement.id}-no-automated-controls`,
        requirementId: requirement.id,
        severity: 'medium',
        title: 'No Automated Controls',
        description: 'No automated controls are implemented for this requirement',
        impact: 'Manual processes may be inconsistent or missed',
        likelihood: 'medium',
        riskRating: 5,
        detectedAt: new Date(),
        status: 'open'
      });
    }

    if (effectiveControls.length < automatedControls.length * 0.5) {
      findings.push({
        id: `${requirement.id}-low-control-effectiveness`,
        requirementId: requirement.id,
        severity: 'medium',
        title: 'Low Control Effectiveness',
        description: 'Many automated controls have low effectiveness ratings',
        impact: 'Controls may not adequately address the requirement',
        likelihood: 'medium',
        riskRating: 6,
        detectedAt: new Date(),
        status: 'open'
      });
    }

    // Create evidence for effective controls
    effectiveControls.forEach(control => {
      evidence.push({
        id: `${requirement.id}-${control.id}-evidence`,
        type: 'audit-trail',
        title: `Control Implementation: ${control.description}`,
        description: `Automated control is implemented and effective: ${control.implementation}`,
        metadata: {
          controlId: control.id,
          effectiveness: control.effectiveness,
          automated: control.automated
        },
        collectedAt: new Date(),
        automated: true
      });
    });

    const status = findings.length === 0 ? 'compliant' :
                  findings.some(f => f.severity === 'high' || f.severity === 'critical') ? 'non-compliant' : 'partial';

    return { status, findings, recommendations, evidence };
  }

  /**
   * Get compliance framework by ID
   */
  getFramework(frameworkId: string): ComplianceFramework | undefined {
    return this.frameworks.get(frameworkId);
  }

  /**
   * List all compliance frameworks
   */
  listFrameworks(): ComplianceFramework[] {
    return Array.from(this.frameworks.values());
  }

  /**
   * Get compliance report by ID
   */
  async getReport(reportId: string): Promise<ComplianceReport | null> {
    try {
      const cached = await getRedisClient().get(`${this.cachePrefix}report:${reportId}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Failed to retrieve compliance report', {
        component: 'ComplianceService',
        reportId,
        error: (error as Error).message
      });
      return null;
    }
  }

  /**
   * Cache compliance report
   */
  private async cacheReport(report: ComplianceReport): Promise<void> {
    try {
      const cacheKey = `${this.cachePrefix}report:${report.id}`;
      const ttl = 86400 * 7; // 7 days
      
      // Use SET with EX for TTL to match client and mock implementations
      await getRedisClient().set(cacheKey, JSON.stringify(report), 'EX', ttl);
    } catch (error) {
      logger.warn('Failed to cache compliance report', {
        component: 'ComplianceService',
        reportId: report.id,
        error: (error as Error).message
      });
    }
  }

  /**
   * Generate compliance dashboard data
   */
  async getDashboardData(): Promise<{
    overallStatus: 'compliant' | 'non-compliant' | 'pending';
    frameworks: Array<{
      id: string;
      name: string;
      status: string;
      score: number;
      nextAssessment: Date;
    }>;
    recentFindings: ComplianceFinding[];
    upcomingAssessments: Array<{
      frameworkId: string;
      frameworkName: string;
      nextAssessment: Date;
    }>;
  }> {
    const frameworks = Array.from(this.frameworks.values());
    const recentFindings: ComplianceFinding[] = [];

    // Get recent findings from cached reports
    for (const framework of frameworks) {
      try {
        // This would typically query recent reports from database
        // For now, we'll generate sample data
        if (framework.status === 'non-compliant') {
          recentFindings.push({
            id: `${framework.id}-sample-finding`,
            requirementId: `${framework.id}-requirement`,
            severity: 'high',
            title: 'Sample Compliance Finding',
            description: 'This is a sample finding for demonstration',
            impact: 'Medium impact on compliance posture',
            likelihood: 'medium',
            riskRating: 6,
            detectedAt: new Date(),
            status: 'open'
          });
        }
      } catch (error) {
        logger.warn('Failed to load recent findings', {
          component: 'ComplianceService',
          frameworkId: framework.id,
          error: error.message
        });
      }
    }

    // Determine overall status
    const compliantFrameworks = frameworks.filter(f => f.status === 'compliant').length;
    const totalFrameworks = frameworks.length;
    const overallStatus = compliantFrameworks === totalFrameworks ? 'compliant' :
                         compliantFrameworks > totalFrameworks * 0.5 ? 'pending' : 'non-compliant';

    // Get upcoming assessments
    const upcomingAssessments = frameworks
      .filter(f => f.nextAssessment > new Date())
      .sort((a, b) => a.nextAssessment.getTime() - b.nextAssessment.getTime())
      .slice(0, 5)
      .map(f => ({
        frameworkId: f.id,
        frameworkName: f.name,
        nextAssessment: f.nextAssessment
      }));

    return {
      overallStatus,
      frameworks: frameworks.map(f => ({
        id: f.id,
        name: f.name,
        status: f.status,
        score: f.score,
        nextAssessment: f.nextAssessment
      })),
      recentFindings: recentFindings.slice(0, 10),
      upcomingAssessments
    };
  }

  /**
   * Update framework configuration
   */
  updateFramework(frameworkId: string, updates: Partial<ComplianceFramework>): boolean {
    const framework = this.frameworks.get(frameworkId);
    if (!framework) {
      return false;
    }

    const updatedFramework = { ...framework, ...updates };
    this.frameworks.set(frameworkId, updatedFramework);

    logger.info('Compliance framework updated', {
      component: 'ComplianceService',
      frameworkId,
      changes: Object.keys(updates)
    });

    return true;
  }
}

export const complianceService = new ComplianceService();
export default complianceService;