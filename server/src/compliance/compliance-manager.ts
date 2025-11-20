import { Pool } from 'pg';
import { Logger } from 'pino';
import { AdvancedAuditSystem, ComplianceFramework, ComplianceReport } from '../audit/advanced-audit-system.js';
import Redis from 'ioredis';
import { putLocked } from '../audit/worm.js';
import { randomUUID } from 'crypto';

export class ComplianceManager {
  constructor(
    private auditSystem: AdvancedAuditSystem,
    private db: Pool,
    private redis: Redis,
    private logger: Logger
  ) {}

  async generateEvidencePackage(reportId: string, bucketName: string): Promise<string> {
    // 1. Fetch report
    const reportRes = await this.db.query('SELECT * FROM compliance_reports WHERE id = $1', [reportId]);
    if (reportRes.rows.length === 0) throw new Error('Report not found');
    const report = reportRes.rows[0];

    // 2. Fetch associated logs
    const logs = await this.auditSystem.queryEvents({
      startTime: report.period_start,
      endTime: report.period_end,
      complianceFrameworks: [report.framework]
    });

    // 3. Create package
    const packageContent = JSON.stringify({
      report,
      evidence_logs: logs,
      generated_at: new Date(),
      signature: 'system-signed' // Placeholder for real signature
    }, null, 2);

    // 4. Store via WORM
    const key = `evidence-${report.framework}-${reportId}-${randomUUID()}.json`;
    const url = await putLocked(bucketName, key, Buffer.from(packageContent));

    this.logger.info({ reportId, url }, 'Evidence package generated and locked');
    return url;
  }

  async checkComplianceStatus(framework: ComplianceFramework): Promise<{
    status: 'compliant' | 'non_compliant' | 'at_risk';
    score: number;
    lastReport: ComplianceReport | null;
  }> {
    // Get the latest report
    const result = await this.db.query(
      `SELECT report_data FROM compliance_reports
       WHERE framework = $1
       ORDER BY period_end DESC
       LIMIT 1`,
      [framework]
    );

    if (result.rows.length === 0) {
      // No report exists, try to generate one for the last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      try {
        const report = await this.auditSystem.generateComplianceReport(framework, startDate, endDate);
        return this.evaluateReport(report);
      } catch (err) {
        this.logger.error({ error: err.message, framework }, 'Failed to generate initial compliance report');
        return { status: 'at_risk', score: 0, lastReport: null };
      }
    }

    const lastReport = result.rows[0].report_data as ComplianceReport;
    return this.evaluateReport(lastReport);
  }

  private evaluateReport(report: ComplianceReport): {
    status: 'compliant' | 'non_compliant' | 'at_risk';
    score: number;
    lastReport: ComplianceReport;
  } {
    const score = report.summary.complianceScore;
    let status: 'compliant' | 'non_compliant' | 'at_risk' = 'compliant';

    if (score < 80) {
      status = 'non_compliant';
    } else if (score < 95) {
      status = 'at_risk';
    }

    // Critical violations override score
    if (report.violations.some(v => v.severity === 'critical')) {
      status = 'non_compliant';
    }

    return { status, score, lastReport: report };
  }

  async resolveViolation(eventId: string, resolutionNotes: string, userId: string) {
    // Update the event details to mark as resolved.
    // Note: Audit events should be immutable.
    // So instead of updating, we create a NEW event 'violation_resolved' linking to the original.

    await this.auditSystem.recordEvent({
      eventType: 'task_complete', // Using generic type or add 'violation_resolved' to types
      action: 'resolve_violation',
      outcome: 'success',
      message: `Violation ${eventId} resolved`,
      userId,
      details: {
        originalEventId: eventId,
        resolutionNotes
      },
      complianceRelevant: true,
      complianceFrameworks: [] // Should copy from original?
    });

    // Additionally, we might want to update a separate "alerts" table if we had one.
    // For now, the audit log IS the source of truth.
    return true;
  }

  async getViolationAlerts(resolved: boolean = false) {
    // Retrieve alerts from DB
    // For persistent history we query the audit_events table for violation events.
    // To exclude resolved violations, we check if a 'resolve_violation' action exists for the violation event ID.

    let query = `
      SELECT ae.* FROM audit_events ae
      WHERE ae.event_type = 'compliance_violation'
    `;

    if (!resolved) {
      query += `
        AND NOT EXISTS (
          SELECT 1 FROM audit_events res
          WHERE res.action = 'resolve_violation'
          AND res.details->>'originalEventId' = ae.id::text
        )
      `;
    }

    query += `
      ORDER BY ae.timestamp DESC
      LIMIT 100
    `;

    const result = await this.db.query(query);
    return result.rows;
  }
}
