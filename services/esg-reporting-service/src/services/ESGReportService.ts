/**
 * ESG Report Service
 * Core business logic for ESG report management
 */

import { v4 as uuidv4 } from 'uuid';
import { db } from '../utils/database.js';
import { logger, createChildLogger } from '../utils/logger.js';
import {
  type ESGReport,
  type CreateReportInput,
  type UpdateReportInput,
  type ReportFilter,
  type ESGScore,
  type AuditEntry,
  ReportStatus,
  ReportType,
} from '@intelgraph/esg-reporting';
import { MetricsService } from './MetricsService.js';

export interface ReportListResult {
  reports: ESGReport[];
  total: number;
  page: number;
  pageSize: number;
}

export class ESGReportService {
  private metricsService: MetricsService;
  private log = createChildLogger({ service: 'ESGReportService' });

  constructor() {
    this.metricsService = new MetricsService();
  }

  /**
   * Create a new ESG report
   */
  async createReport(input: CreateReportInput, userId: string): Promise<ESGReport> {
    this.log.info({ input, userId }, 'Creating new ESG report');

    const reportId = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO esg.reports (
        id, tenant_id, title, description, report_type, status,
        period_start, period_end, compliance_frameworks,
        environmental_metrics, social_metrics, governance_metrics,
        created_by, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      )
      RETURNING *
    `;

    const values = [
      reportId,
      input.tenantId,
      input.title,
      input.description || null,
      input.reportType,
      ReportStatus.DRAFT,
      input.periodStart,
      input.periodEnd,
      input.frameworks || [],
      JSON.stringify({}),
      JSON.stringify({}),
      JSON.stringify({}),
      userId,
      now,
      now,
    ];

    const result = await db.query(query, values);
    const report = this.mapRowToReport(result.rows[0]);

    // Log audit trail
    await this.logAudit(input.tenantId, 'report', reportId, 'create', userId, null, report);

    this.log.info({ reportId }, 'ESG report created successfully');
    return report;
  }

  /**
   * Get a report by ID
   */
  async getReport(reportId: string, tenantId: string): Promise<ESGReport | null> {
    const query = `
      SELECT * FROM esg.reports
      WHERE id = $1 AND tenant_id = $2
    `;

    const result = await db.query(query, [reportId, tenantId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToReport(result.rows[0]);
  }

  /**
   * List reports with filtering and pagination
   */
  async listReports(
    tenantId: string,
    filter?: ReportFilter,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<ReportListResult> {
    const conditions: string[] = ['tenant_id = $1'];
    const values: unknown[] = [tenantId];
    let paramIndex = 2;

    if (filter?.status && filter.status.length > 0) {
      conditions.push(`status = ANY($${paramIndex})`);
      values.push(filter.status);
      paramIndex++;
    }

    if (filter?.reportType && filter.reportType.length > 0) {
      conditions.push(`report_type = ANY($${paramIndex})`);
      values.push(filter.reportType);
      paramIndex++;
    }

    if (filter?.periodStart) {
      conditions.push(`period_start >= $${paramIndex}`);
      values.push(filter.periodStart);
      paramIndex++;
    }

    if (filter?.periodEnd) {
      conditions.push(`period_end <= $${paramIndex}`);
      values.push(filter.periodEnd);
      paramIndex++;
    }

    if (filter?.frameworks && filter.frameworks.length > 0) {
      conditions.push(`compliance_frameworks && $${paramIndex}`);
      values.push(filter.frameworks);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');
    const offset = (page - 1) * pageSize;

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM esg.reports WHERE ${whereClause}`;
    const countResult = await db.query<{ count: string }>(countQuery, values);
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    const query = `
      SELECT * FROM esg.reports
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    values.push(pageSize, offset);

    const result = await db.query(query, values);
    const reports = result.rows.map((row) => this.mapRowToReport(row));

    return { reports, total, page, pageSize };
  }

  /**
   * Update a report
   */
  async updateReport(
    reportId: string,
    tenantId: string,
    input: UpdateReportInput,
    userId: string,
  ): Promise<ESGReport | null> {
    const existingReport = await this.getReport(reportId, tenantId);
    if (!existingReport) {
      return null;
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (input.title !== undefined) {
      updates.push(`title = $${paramIndex}`);
      values.push(input.title);
      paramIndex++;
    }

    if (input.description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(input.description);
      paramIndex++;
    }

    if (input.status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(input.status);
      paramIndex++;

      // Handle status-specific updates
      if (input.status === ReportStatus.APPROVED) {
        updates.push(`approved_by = $${paramIndex}`);
        values.push(userId);
        paramIndex++;
        updates.push(`approved_at = $${paramIndex}`);
        values.push(new Date());
        paramIndex++;
      } else if (input.status === ReportStatus.PUBLISHED) {
        updates.push(`published_at = $${paramIndex}`);
        values.push(new Date());
        paramIndex++;
      }
    }

    if (input.environmental !== undefined) {
      const updatedEnv = { ...existingReport.environmental, ...input.environmental };
      updates.push(`environmental_metrics = $${paramIndex}`);
      values.push(JSON.stringify(updatedEnv));
      paramIndex++;
    }

    if (input.social !== undefined) {
      const updatedSocial = { ...existingReport.social, ...input.social };
      updates.push(`social_metrics = $${paramIndex}`);
      values.push(JSON.stringify(updatedSocial));
      paramIndex++;
    }

    if (input.governance !== undefined) {
      const updatedGov = { ...existingReport.governance, ...input.governance };
      updates.push(`governance_metrics = $${paramIndex}`);
      values.push(JSON.stringify(updatedGov));
      paramIndex++;
    }

    if (updates.length === 0) {
      return existingReport;
    }

    updates.push(`updated_at = $${paramIndex}`);
    values.push(new Date());
    paramIndex++;

    values.push(reportId, tenantId);

    const query = `
      UPDATE esg.reports
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await db.query(query, values);
    const updatedReport = this.mapRowToReport(result.rows[0]);

    // Log audit trail
    await this.logAudit(tenantId, 'report', reportId, 'update', userId, existingReport, updatedReport);

    return updatedReport;
  }

  /**
   * Delete a report
   */
  async deleteReport(reportId: string, tenantId: string, userId: string): Promise<boolean> {
    const existingReport = await this.getReport(reportId, tenantId);
    if (!existingReport) {
      return false;
    }

    const query = `
      DELETE FROM esg.reports
      WHERE id = $1 AND tenant_id = $2
    `;

    const result = await db.query(query, [reportId, tenantId]);

    if (result.rowCount && result.rowCount > 0) {
      await this.logAudit(tenantId, 'report', reportId, 'delete', userId, existingReport, null);
      return true;
    }

    return false;
  }

  /**
   * Calculate and update ESG scores for a report
   */
  async calculateScores(reportId: string, tenantId: string): Promise<ESGScore | null> {
    const report = await this.getReport(reportId, tenantId);
    if (!report) {
      return null;
    }

    const scores = this.metricsService.calculateESGScores(
      report.environmental,
      report.social,
      report.governance,
    );

    const query = `
      UPDATE esg.reports
      SET overall_score = $1,
          environmental_score = $2,
          social_score = $3,
          governance_score = $4,
          updated_at = NOW()
      WHERE id = $5 AND tenant_id = $6
    `;

    await db.query(query, [
      scores.overall,
      scores.environmental,
      scores.social,
      scores.governance,
      reportId,
      tenantId,
    ]);

    return scores;
  }

  /**
   * Get reports due for scheduled generation
   */
  async getScheduledReportsDue(): Promise<
    Array<{
      id: string;
      tenantId: string;
      name: string;
      reportType: string;
      frameworks: string[];
      templateId: string | null;
    }>
  > {
    const query = `
      SELECT id, tenant_id, name, report_type, frameworks, template_id
      FROM esg.report_schedules
      WHERE enabled = true
        AND next_run_at <= NOW()
    `;

    const result = await db.query(query);

    return result.rows.map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      reportType: row.report_type,
      frameworks: row.frameworks || [],
      templateId: row.template_id,
    }));
  }

  /**
   * Update schedule after report generation
   */
  async updateScheduleAfterRun(
    scheduleId: string,
    success: boolean,
    reportId?: string,
  ): Promise<void> {
    const query = `
      UPDATE esg.report_schedules
      SET last_run_at = NOW(),
          last_run_status = $1,
          last_report_id = $2,
          next_run_at = CASE
            WHEN frequency = 'daily' THEN NOW() + INTERVAL '1 day'
            WHEN frequency = 'weekly' THEN NOW() + INTERVAL '1 week'
            WHEN frequency = 'monthly' THEN NOW() + INTERVAL '1 month'
            WHEN frequency = 'quarterly' THEN NOW() + INTERVAL '3 months'
            WHEN frequency = 'annually' THEN NOW() + INTERVAL '1 year'
          END,
          updated_at = NOW()
      WHERE id = $3
    `;

    await db.query(query, [success ? 'success' : 'failed', reportId || null, scheduleId]);
  }

  /**
   * Log audit trail entry
   */
  private async logAudit(
    tenantId: string,
    entityType: string,
    entityId: string,
    action: string,
    actor: string,
    previousState: unknown,
    newState: unknown,
  ): Promise<void> {
    const query = `
      INSERT INTO esg.audit_trail (
        tenant_id, entity_type, entity_id, action, actor,
        previous_state, new_state, changes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    const changes = this.calculateChanges(previousState, newState);

    await db.query(query, [
      tenantId,
      entityType,
      entityId,
      action,
      actor,
      previousState ? JSON.stringify(previousState) : null,
      newState ? JSON.stringify(newState) : null,
      JSON.stringify(changes),
    ]);
  }

  /**
   * Calculate changes between two states
   */
  private calculateChanges(previous: unknown, current: unknown): Record<string, unknown> {
    if (!previous || !current) {
      return {};
    }

    const changes: Record<string, unknown> = {};
    const prevObj = previous as Record<string, unknown>;
    const currObj = current as Record<string, unknown>;

    for (const key of Object.keys(currObj)) {
      if (JSON.stringify(prevObj[key]) !== JSON.stringify(currObj[key])) {
        changes[key] = { from: prevObj[key], to: currObj[key] };
      }
    }

    return changes;
  }

  /**
   * Map database row to ESGReport object
   */
  private mapRowToReport(row: Record<string, unknown>): ESGReport {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      title: row.title as string,
      description: row.description as string | undefined,
      reportType: row.report_type as ReportType,
      status: row.status as ReportStatus,
      periodStart: new Date(row.period_start as string),
      periodEnd: new Date(row.period_end as string),
      environmental: (row.environmental_metrics as Record<string, unknown>) || {},
      social: (row.social_metrics as Record<string, unknown>) || {},
      governance: (row.governance_metrics as Record<string, unknown>) || {},
      scores: {
        overall: (row.overall_score as number) || 0,
        environmental: (row.environmental_score as number) || 0,
        social: (row.social_score as number) || 0,
        governance: (row.governance_score as number) || 0,
        methodology: 'Summit ESG Scoring v1.0',
        calculatedAt: new Date(row.updated_at as string),
      },
      metrics: [],
      complianceFrameworks: (row.compliance_frameworks as string[]) || [],
      complianceSummary: (row.compliance_summary as Record<string, string>) || {},
      metadata: {
        version: row.version as string,
        generatedAt: new Date(row.created_at as string),
        generatedBy: row.created_by as string,
        approvedBy: row.approved_by as string | undefined,
        approvedAt: row.approved_at ? new Date(row.approved_at as string) : undefined,
        publishedAt: row.published_at ? new Date(row.published_at as string) : undefined,
      },
      auditTrail: [],
    } as ESGReport;
  }
}

export const esgReportService = new ESGReportService();
