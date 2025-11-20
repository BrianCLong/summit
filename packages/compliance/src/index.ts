/**
 * Enterprise Compliance and Governance Framework
 *
 * Comprehensive compliance capabilities for government and enterprise deployments
 * including FedRAMP, NIST 800-53, ISO 27001, SOC 2, GDPR, and CCPA support.
 */

export * from './types.js';
export * from './controls/nist-800-53.js';
export * from './controls/fedramp.js';
export * from './controls/iso27001.js';
export * from './controls/soc2.js';
export * from './reporting/index.js';
export * from './policies/index.js';

import { Pool } from 'pg';
import {
  ComplianceFramework,
  ComplianceControl,
  ComplianceReport,
  ComplianceStatus,
  ControlStatus,
} from './types.js';

/**
 * Compliance Manager
 * Main class for managing enterprise compliance
 */
export class ComplianceManager {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Initialize compliance database tables
   */
  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS compliance_controls (
          id VARCHAR(255) PRIMARY KEY,
          framework VARCHAR(50) NOT NULL,
          family VARCHAR(10) NOT NULL,
          number VARCHAR(20) NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          baseline VARCHAR(20) NOT NULL,
          status VARCHAR(50) NOT NULL,
          implementation TEXT,
          evidence JSONB DEFAULT '[]',
          responsible_party VARCHAR(255),
          last_assessed TIMESTAMPTZ,
          next_assessment TIMESTAMPTZ,
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_compliance_controls_framework ON compliance_controls(framework);
        CREATE INDEX IF NOT EXISTS idx_compliance_controls_status ON compliance_controls(status);
        CREATE INDEX IF NOT EXISTS idx_compliance_controls_family ON compliance_controls(family);

        CREATE TABLE IF NOT EXISTS compliance_reports (
          id VARCHAR(255) PRIMARY KEY,
          framework VARCHAR(50) NOT NULL,
          report_type VARCHAR(50) NOT NULL,
          generated_at TIMESTAMPTZ NOT NULL,
          generated_by VARCHAR(255) NOT NULL,
          period_start TIMESTAMPTZ NOT NULL,
          period_end TIMESTAMPTZ NOT NULL,
          overall_status VARCHAR(50) NOT NULL,
          metrics JSONB NOT NULL,
          findings JSONB DEFAULT '[]',
          recommendations JSONB DEFAULT '[]',
          next_review_date TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_compliance_reports_framework ON compliance_reports(framework);
        CREATE INDEX IF NOT EXISTS idx_compliance_reports_generated_at ON compliance_reports(generated_at);

        CREATE TABLE IF NOT EXISTS compliance_findings (
          id VARCHAR(255) PRIMARY KEY,
          control_id VARCHAR(255) NOT NULL,
          severity VARCHAR(20) NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          impact TEXT NOT NULL,
          recommendation TEXT NOT NULL,
          status VARCHAR(50) NOT NULL,
          assigned_to VARCHAR(255),
          due_date TIMESTAMPTZ,
          resolved_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          FOREIGN KEY (control_id) REFERENCES compliance_controls(id)
        );

        CREATE INDEX IF NOT EXISTS idx_compliance_findings_control_id ON compliance_findings(control_id);
        CREATE INDEX IF NOT EXISTS idx_compliance_findings_status ON compliance_findings(status);
        CREATE INDEX IF NOT EXISTS idx_compliance_findings_severity ON compliance_findings(severity);
      `);
    } finally {
      client.release();
    }
  }

  /**
   * Get control by ID
   */
  async getControl(controlId: string): Promise<ComplianceControl | null> {
    const result = await this.pool.query(
      'SELECT * FROM compliance_controls WHERE id = $1',
      [controlId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToControl(result.rows[0]);
  }

  /**
   * Update control status
   */
  async updateControlStatus(
    controlId: string,
    status: ControlStatus,
    implementation?: string,
    evidence?: string[]
  ): Promise<void> {
    await this.pool.query(
      `UPDATE compliance_controls
       SET status = $2, implementation = COALESCE($3, implementation),
           evidence = COALESCE($4::jsonb, evidence), updated_at = NOW()
       WHERE id = $1`,
      [controlId, status, implementation, evidence ? JSON.stringify(evidence) : null]
    );
  }

  /**
   * Get compliance status for a framework
   */
  async getFrameworkStatus(framework: ComplianceFramework): Promise<{
    framework: ComplianceFramework;
    totalControls: number;
    implemented: number;
    partiallyImplemented: number;
    notImplemented: number;
    compliancePercentage: number;
    status: ComplianceStatus;
  }> {
    const result = await this.pool.query(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status = 'implemented') as implemented,
         COUNT(*) FILTER (WHERE status = 'partially_implemented') as partially_implemented,
         COUNT(*) FILTER (WHERE status = 'not_implemented') as not_implemented
       FROM compliance_controls
       WHERE framework = $1`,
      [framework]
    );

    const row = result.rows[0];
    const total = parseInt(row.total);
    const implemented = parseInt(row.implemented);
    const partiallyImplemented = parseInt(row.partially_implemented);
    const notImplemented = parseInt(row.not_implemented);

    const compliancePercentage = total > 0
      ? ((implemented + partiallyImplemented * 0.5) / total) * 100
      : 0;

    let status: ComplianceStatus;
    if (compliancePercentage === 100) {
      status = ComplianceStatus.COMPLIANT;
    } else if (compliancePercentage >= 80) {
      status = ComplianceStatus.PARTIALLY_COMPLIANT;
    } else {
      status = ComplianceStatus.NON_COMPLIANT;
    }

    return {
      framework,
      totalControls: total,
      implemented,
      partiallyImplemented,
      notImplemented,
      compliancePercentage,
      status,
    };
  }

  /**
   * Generate compliance report
   */
  async generateReport(
    framework: ComplianceFramework,
    reportType: 'gap_analysis' | 'control_effectiveness' | 'audit_readiness' | 'executive_summary',
    generatedBy: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<ComplianceReport> {
    const status = await this.getFrameworkStatus(framework);

    // Get findings
    const findingsResult = await this.pool.query(
      `SELECT f.* FROM compliance_findings f
       JOIN compliance_controls c ON f.control_id = c.id
       WHERE c.framework = $1 AND f.status != 'resolved'
       ORDER BY f.severity DESC, f.created_at DESC`,
      [framework]
    );

    const findings = findingsResult.rows.map(row => ({
      id: row.id,
      controlId: row.control_id,
      severity: row.severity,
      title: row.title,
      description: row.description,
      impact: row.impact,
      recommendation: row.recommendation,
      status: row.status,
      assignedTo: row.assigned_to,
      dueDate: row.due_date,
      resolvedAt: row.resolved_at,
    }));

    const report: ComplianceReport = {
      id: `report-${Date.now()}`,
      framework,
      reportType,
      generatedAt: new Date(),
      generatedBy,
      period: {
        start: periodStart,
        end: periodEnd,
      },
      overallStatus: status.status,
      metrics: {
        totalControls: status.totalControls,
        implementedControls: status.implemented,
        partiallyImplementedControls: status.partiallyImplemented,
        notImplementedControls: status.notImplemented,
        compliancePercentage: status.compliancePercentage,
      },
      findings,
      recommendations: this.generateRecommendations(status, findings),
    };

    // Save report
    await this.pool.query(
      `INSERT INTO compliance_reports
       (id, framework, report_type, generated_at, generated_by, period_start, period_end,
        overall_status, metrics, findings, recommendations)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        report.id,
        report.framework,
        report.reportType,
        report.generatedAt,
        report.generatedBy,
        report.period.start,
        report.period.end,
        report.overallStatus,
        JSON.stringify(report.metrics),
        JSON.stringify(report.findings),
        JSON.stringify(report.recommendations),
      ]
    );

    return report;
  }

  /**
   * Map database row to ComplianceControl
   */
  private mapRowToControl(row: any): ComplianceControl {
    return {
      id: row.id,
      framework: row.framework,
      family: row.family,
      number: row.number,
      title: row.title,
      description: row.description,
      baseline: row.baseline,
      status: row.status,
      implementation: row.implementation,
      evidence: row.evidence || [],
      responsibleParty: row.responsible_party,
      lastAssessed: row.last_assessed,
      nextAssessment: row.next_assessment,
      notes: row.notes,
    };
  }

  /**
   * Generate recommendations based on status and findings
   */
  private generateRecommendations(
    status: any,
    findings: any[]
  ): string[] {
    const recommendations: string[] = [];

    if (status.compliancePercentage < 100) {
      recommendations.push(
        `Compliance is at ${status.compliancePercentage.toFixed(1)}%. Focus on implementing ${status.notImplemented} remaining controls.`
      );
    }

    const criticalFindings = findings.filter(f => f.severity === 'critical');
    if (criticalFindings.length > 0) {
      recommendations.push(
        `Address ${criticalFindings.length} critical findings immediately to reduce risk exposure.`
      );
    }

    const highFindings = findings.filter(f => f.severity === 'high');
    if (highFindings.length > 0) {
      recommendations.push(
        `Remediate ${highFindings.length} high-severity findings within 30 days.`
      );
    }

    if (status.partiallyImplemented > 0) {
      recommendations.push(
        `Complete implementation of ${status.partiallyImplemented} partially implemented controls.`
      );
    }

    return recommendations;
  }
}
