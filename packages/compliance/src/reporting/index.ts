/**
 * Compliance Reporting and Metrics System
 */

import { Pool } from 'pg';
import { ComplianceFramework, ComplianceReport, ComplianceStatus } from '../types.js';

export class ComplianceReportingEngine {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Generate executive summary report
   */
  async generateExecutiveSummary(
    frameworks: ComplianceFramework[]
  ): Promise<{
    overallCompliance: number;
    frameworkStatus: Map<ComplianceFramework, ComplianceStatus>;
    criticalFindings: number;
    openViolations: number;
    trends: {
      improvementRate: number;
      monthlyProgress: number;
    };
  }> {
    const frameworkStatus = new Map<ComplianceFramework, ComplianceStatus>();
    let totalCompliance = 0;

    for (const framework of frameworks) {
      const status = await this.getFrameworkStatus(framework);
      frameworkStatus.set(framework, status.status);
      totalCompliance += status.compliancePercentage;
    }

    const overallCompliance = totalCompliance / frameworks.length;

    // Get critical findings
    const criticalResult = await this.pool.query(
      `SELECT COUNT(*) as count FROM compliance_findings
       WHERE severity = 'critical' AND status != 'resolved'`
    );

    const criticalFindings = parseInt(criticalResult.rows[0]?.count || '0');

    // Get open violations
    const violationsResult = await this.pool.query(
      `SELECT COUNT(*) as count FROM policy_violations
       WHERE status = 'open'`
    );

    const openViolations = parseInt(violationsResult.rows[0]?.count || '0');

    return {
      overallCompliance,
      frameworkStatus,
      criticalFindings,
      openViolations,
      trends: {
        improvementRate: 0, // Calculate from historical data
        monthlyProgress: 0, // Calculate from historical data
      },
    };
  }

  /**
   * Generate gap analysis report
   */
  async generateGapAnalysis(framework: ComplianceFramework): Promise<{
    gaps: Array<{
      controlId: string;
      controlName: string;
      currentStatus: string;
      requiredStatus: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      estimatedEffort: string;
      recommendation: string;
    }>;
    summary: {
      totalGaps: number;
      criticalGaps: number;
      estimatedTimeToClose: string;
    };
  }> {
    const result = await this.pool.query(
      `SELECT * FROM compliance_controls
       WHERE framework = $1 AND status != 'implemented'
       ORDER BY baseline DESC`,
      [framework]
    );

    const gaps = result.rows.map(row => ({
      controlId: row.id,
      controlName: row.title,
      currentStatus: row.status,
      requiredStatus: 'implemented',
      priority: this.determinePriority(row.baseline, row.family),
      estimatedEffort: this.estimateEffort(row.family),
      recommendation: row.implementation || 'See control requirements',
    }));

    return {
      gaps,
      summary: {
        totalGaps: gaps.length,
        criticalGaps: gaps.filter(g => g.priority === 'critical').length,
        estimatedTimeToClose: this.calculateTimeToClose(gaps),
      },
    };
  }

  private async getFrameworkStatus(framework: ComplianceFramework) {
    const result = await this.pool.query(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status = 'implemented') as implemented
       FROM compliance_controls
       WHERE framework = $1`,
      [framework]
    );

    const total = parseInt(result.rows[0].total);
    const implemented = parseInt(result.rows[0].implemented);
    const compliancePercentage = total > 0 ? (implemented / total) * 100 : 0;

    let status: ComplianceStatus;
    if (compliancePercentage === 100) {
      status = ComplianceStatus.COMPLIANT;
    } else if (compliancePercentage >= 80) {
      status = ComplianceStatus.PARTIALLY_COMPLIANT;
    } else {
      status = ComplianceStatus.NON_COMPLIANT;
    }

    return { status, compliancePercentage };
  }

  private determinePriority(baseline: string, family: string): 'low' | 'medium' | 'high' | 'critical' {
    if (baseline === 'high' || family === 'AU' || family === 'AC') {
      return 'critical';
    } else if (baseline === 'moderate') {
      return 'high';
    } else {
      return 'medium';
    }
  }

  private estimateEffort(family: string): string {
    const effortMap: Record<string, string> = {
      'AC': '2-4 weeks',
      'AU': '1-2 weeks',
      'IA': '2-3 weeks',
      'SC': '3-6 weeks',
      'SI': '2-4 weeks',
    };

    return effortMap[family] || '1-2 weeks';
  }

  private calculateTimeToClose(gaps: any[]): string {
    const criticalCount = gaps.filter(g => g.priority === 'critical').length;
    const highCount = gaps.filter(g => g.priority === 'high').length;

    const weeks = criticalCount * 4 + highCount * 2 + (gaps.length - criticalCount - highCount);
    return `${Math.ceil(weeks / 4)} months`;
  }
}
