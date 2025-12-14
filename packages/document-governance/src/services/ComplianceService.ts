/**
 * Compliance Validation Service
 *
 * Validates documents against compliance standards and generates reports.
 */

import { Driver } from 'neo4j-driver';
import { v4 as uuidv4 } from 'uuid';
import {
  ComplianceStandard,
  ComplianceMapping,
  ComplianceCheckResult,
  AuditFinding,
  ComplianceReport,
} from '../types/compliance.js';

// Compliance standards
const COMPLIANCE_STANDARDS: ComplianceStandard[] = [
  {
    id: 'SOC2',
    name: 'SOC 2',
    authority: 'AICPA',
    description: 'Service Organization Control 2 - Trust Service Criteria',
    categories: ['Security', 'Availability', 'Processing Integrity', 'Confidentiality', 'Privacy'],
    applicable_document_types: [
      'doc.security_policy',
      'doc.access_control_policy',
      'doc.incident_response_plan',
      'doc.incident_postmortem',
      'doc.business_continuity_plan',
      'doc.disaster_recovery_plan',
      'doc.vulnerability_assessment',
      'doc.penetration_test_report',
      'doc.risk_assessment',
      'doc.audit_report',
    ],
  },
  {
    id: 'ISO27001',
    name: 'ISO/IEC 27001',
    authority: 'ISO',
    description: 'Information Security Management System',
    categories: [
      'Information Security Policies',
      'Organization of Information Security',
      'Human Resource Security',
      'Asset Management',
      'Access Control',
      'Cryptography',
      'Physical and Environmental Security',
      'Operations Security',
      'Communications Security',
      'Incident Management',
      'Business Continuity',
      'Compliance',
    ],
    applicable_document_types: [
      'doc.security_policy',
      'doc.access_control_policy',
      'doc.incident_response_plan',
      'doc.incident_postmortem',
      'doc.business_continuity_plan',
      'doc.disaster_recovery_plan',
      'doc.vulnerability_assessment',
      'doc.penetration_test_report',
      'doc.risk_assessment',
    ],
  },
  {
    id: 'GDPR',
    name: 'General Data Protection Regulation',
    authority: 'European Union',
    description: 'EU regulation on data protection and privacy',
    categories: [
      'Lawfulness of Processing',
      'Consent',
      'Data Subject Rights',
      'Data Protection by Design',
      'Data Breach Notification',
    ],
    applicable_document_types: ['doc.privacy_policy', 'doc.dpa', 'doc.incident_response_plan', 'doc.dataset_card'],
  },
  {
    id: 'SOX',
    name: 'Sarbanes-Oxley Act',
    authority: 'United States',
    description: 'Financial reporting and auditing requirements',
    categories: ['Financial Reporting', 'Internal Controls', 'Audit Requirements', 'Record Retention'],
    applicable_document_types: ['doc.general_ledger', 'doc.financial_statement', 'doc.audit_report'],
  },
  {
    id: 'EU_AI_Act',
    name: 'EU Artificial Intelligence Act',
    authority: 'European Union',
    description: 'Regulation on artificial intelligence systems',
    categories: ['Risk Classification', 'Transparency Requirements', 'Human Oversight', 'Data Governance'],
    applicable_document_types: ['doc.model_card', 'doc.dataset_card', 'doc.model_evaluation_report'],
  },
];

// Required sections by document type
const REQUIRED_SECTIONS: Record<string, string[]> = {
  'doc.security_policy': [
    'Purpose and Scope',
    'Roles and Responsibilities',
    'Information Classification',
    'Access Control',
    'Incident Response',
    'Compliance',
  ],
  'doc.privacy_policy': [
    'Data Collection',
    'Purpose of Processing',
    'Legal Basis',
    'Data Sharing',
    'Data Subject Rights',
    'Data Retention',
    'Security Measures',
    'Contact Information',
  ],
  'doc.incident_response_plan': [
    'Incident Classification',
    'Response Team',
    'Detection and Analysis',
    'Containment and Eradication',
    'Recovery',
    'Post-Incident Activity',
    'Communication Plan',
  ],
  'doc.model_card': [
    'Model Details',
    'Intended Use',
    'Training Data',
    'Evaluation Data',
    'Performance Metrics',
    'Ethical Considerations',
    'Limitations',
    'Recommendations',
  ],
};

export class ComplianceService {
  constructor(private driver: Driver) {}

  /**
   * Get all compliance standards
   */
  getComplianceStandards(): ComplianceStandard[] {
    return COMPLIANCE_STANDARDS;
  }

  /**
   * Get applicable standards for a document type
   */
  getApplicableStandards(documentTypeId: string): ComplianceStandard[] {
    return COMPLIANCE_STANDARDS.filter((s) => s.applicable_document_types.includes(documentTypeId));
  }

  /**
   * Check document compliance
   */
  async checkCompliance(documentId: string): Promise<ComplianceCheckResult> {
    const session = this.driver.session();
    try {
      // Get document details
      const result = await session.run(
        `
        MATCH (d:Document {id: $documentId})
        MATCH (dt:DocumentType {id: d.document_type_id})
        RETURN d, dt
        `,
        { documentId }
      );

      if (result.records.length === 0) {
        throw new Error(`Document not found: ${documentId}`);
      }

      const record = result.records[0];
      const doc = record.get('d').properties;
      const docType = record.get('dt').properties;

      const applicableStandards = this.getApplicableStandards(docType.id);
      const requiredSections = REQUIRED_SECTIONS[docType.id] || [];

      // Simulate section checking (in production, would use NLP/content analysis)
      const sectionResults = requiredSections.map((section) => ({
        section_name: section,
        present: Math.random() > 0.2, // Simulated - 80% chance present
        compliant: Math.random() > 0.3, // Simulated - 70% chance compliant
        issues: [] as string[],
        suggestions: [] as string[],
      }));

      const missingSections = sectionResults.filter((s) => !s.present).map((s) => s.section_name);

      const riskIssues: Array<{
        severity: 'low' | 'medium' | 'high' | 'critical';
        description: string;
        recommendation: string;
        standard?: string;
      }> = [];

      // Generate risk issues for missing sections
      for (const section of missingSections) {
        riskIssues.push({
          severity: 'high',
          description: `Required section "${section}" is missing`,
          recommendation: `Add the "${section}" section to the document`,
          standard: applicableStandards[0]?.id,
        });
      }

      // Check for outdated document
      const docDate = new Date(doc.updated_at);
      const daysSinceUpdate = (Date.now() - docDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate > 365) {
        riskIssues.push({
          severity: 'medium',
          description: 'Document has not been reviewed in over a year',
          recommendation: 'Schedule document review and update',
        });
      }

      const compliantSections = sectionResults.filter((s) => s.present && s.compliant).length;
      const score = requiredSections.length > 0 ? (compliantSections / requiredSections.length) * 100 : 100;

      const checkResult: ComplianceCheckResult = {
        document_id: documentId,
        document_type_id: docType.id,
        checked_at: new Date().toISOString(),
        overall_compliant: missingSections.length === 0 && riskIssues.filter((r) => r.severity === 'critical').length === 0,
        applicable_standards: applicableStandards.map((s) => s.id),
        section_results: sectionResults,
        missing_sections: missingSections,
        risk_issues: riskIssues,
        score: Math.round(score),
      };

      // Store compliance check result
      await session.run(
        `
        MERGE (cc:ComplianceCheck {document_id: $documentId})
        SET cc.checked_at = datetime(),
            cc.overall_compliant = $compliant,
            cc.score = $score,
            cc.missing_sections = $missingSections,
            cc.risk_issues_count = $riskCount
        `,
        {
          documentId,
          compliant: checkResult.overall_compliant,
          score: checkResult.score,
          missingSections: JSON.stringify(missingSections),
          riskCount: riskIssues.length,
        }
      );

      return checkResult;
    } finally {
      await session.close();
    }
  }

  /**
   * Create an audit finding
   */
  async createAuditFinding(
    finding: Omit<AuditFinding, 'id' | 'found_at' | 'status'>
  ): Promise<AuditFinding> {
    const session = this.driver.session();
    try {
      const fullFinding: AuditFinding = {
        ...finding,
        id: uuidv4(),
        found_at: new Date().toISOString(),
        status: 'open',
      };

      await session.run(
        `
        CREATE (f:AuditFinding {
          id: $id,
          document_id: $documentId,
          finding_type: $findingType,
          severity: $severity,
          title: $title,
          description: $description,
          recommendation: $recommendation,
          compliance_standard: $complianceStandard,
          found_at: datetime(),
          found_by: $foundBy,
          status: 'open'
        })
        `,
        {
          id: fullFinding.id,
          documentId: fullFinding.document_id,
          findingType: fullFinding.finding_type,
          severity: fullFinding.severity,
          title: fullFinding.title,
          description: fullFinding.description,
          recommendation: fullFinding.recommendation,
          complianceStandard: fullFinding.compliance_standard || null,
          foundBy: fullFinding.found_by,
        }
      );

      return fullFinding;
    } finally {
      await session.close();
    }
  }

  /**
   * Get audit findings for a document
   */
  async getAuditFindings(documentId: string): Promise<AuditFinding[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (f:AuditFinding {document_id: $documentId})
        RETURN f
        ORDER BY f.found_at DESC
        `,
        { documentId }
      );

      return result.records.map((record) => {
        const f = record.get('f').properties;
        return {
          id: f.id,
          document_id: f.document_id,
          finding_type: f.finding_type,
          severity: f.severity,
          title: f.title,
          description: f.description,
          recommendation: f.recommendation,
          compliance_standard: f.compliance_standard,
          found_at: f.found_at.toString(),
          found_by: f.found_by,
          status: f.status,
          resolved_at: f.resolved_at?.toString(),
          resolved_by: f.resolved_by,
          resolution_notes: f.resolution_notes,
        };
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    scope: {
      document_ids?: string[];
      document_types?: string[];
      departments?: string[];
      standards?: string[];
    },
    reportType: 'full' | 'summary' | 'gap_analysis' | 'risk_assessment' = 'summary',
    userId: string
  ): Promise<ComplianceReport> {
    const session = this.driver.session();
    try {
      // Build query based on scope
      let query = `MATCH (d:Document)`;
      const params: Record<string, any> = {};

      if (scope.document_ids?.length) {
        query += ` WHERE d.id IN $documentIds`;
        params.documentIds = scope.document_ids;
      }

      query += ` RETURN d`;

      const result = await session.run(query, params);
      const documents = result.records.map((r) => r.get('d').properties);

      // Calculate summary statistics
      let compliantCount = 0;
      const findings: AuditFinding[] = [];

      for (const doc of documents) {
        const checkResult = await this.checkCompliance(doc.id);
        if (checkResult.overall_compliant) {
          compliantCount++;
        }

        // Convert risk issues to findings
        for (const issue of checkResult.risk_issues) {
          findings.push({
            id: uuidv4(),
            document_id: doc.id,
            finding_type: 'compliance_gap',
            severity: issue.severity,
            title: issue.description,
            description: issue.description,
            recommendation: issue.recommendation,
            compliance_standard: issue.standard,
            found_at: new Date().toISOString(),
            found_by: 'system',
            status: 'open',
          });
        }
      }

      const report: ComplianceReport = {
        id: uuidv4(),
        generated_at: new Date().toISOString(),
        generated_by: userId,
        report_type: reportType,
        scope,
        summary: {
          total_documents: documents.length,
          compliant_documents: compliantCount,
          non_compliant_documents: documents.length - compliantCount,
          compliance_rate: documents.length > 0 ? (compliantCount / documents.length) * 100 : 100,
          critical_findings: findings.filter((f) => f.severity === 'critical').length,
          high_findings: findings.filter((f) => f.severity === 'high').length,
          medium_findings: findings.filter((f) => f.severity === 'medium').length,
          low_findings: findings.filter((f) => f.severity === 'low' || f.severity === 'info').length,
        },
        findings,
        recommendations: [
          {
            priority: 'immediate',
            title: 'Address Critical Findings',
            description: 'Review and remediate all critical compliance findings immediately',
            affected_documents: findings.filter((f) => f.severity === 'critical').map((f) => f.document_id),
          },
          {
            priority: 'short_term',
            title: 'Update Outdated Documents',
            description: 'Review and update documents that have not been reviewed in the past year',
            affected_documents: [],
          },
        ],
      };

      return report;
    } finally {
      await session.close();
    }
  }
}
