/**
 * ESG Report Scheduler Service
 * Handles automated report generation based on schedules
 */

import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../utils/database.js';
import { createChildLogger } from '../utils/logger.js';
import { ESGReportService } from './ESGReportService.js';
import { MetricsService } from './MetricsService.js';
import { ExportService } from './ExportService.js';
import {
  type ReportSchedule,
  type ReportType,
  type ExportFormat,
} from '@intelgraph/esg-reporting';

export interface ScheduleCreateInput {
  tenantId: string;
  name: string;
  description?: string;
  reportType: ReportType;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  cronExpression?: string;
  frameworks?: string[];
  templateId?: string;
  recipients: string[];
  exportFormats: ExportFormat[];
  enabled?: boolean;
}

export class SchedulerService {
  private log = createChildLogger({ service: 'SchedulerService' });
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();
  private reportService: ESGReportService;
  private metricsService: MetricsService;
  private exportService: ExportService;

  constructor() {
    this.reportService = new ESGReportService();
    this.metricsService = new MetricsService();
    this.exportService = new ExportService();
  }

  /**
   * Initialize scheduler and start all enabled schedules
   */
  async initialize(): Promise<void> {
    this.log.info('Initializing ESG report scheduler');

    // Start main scheduler job (runs every minute to check for due reports)
    cron.schedule('* * * * *', async () => {
      await this.processScheduledReports();
    });

    // Load and start all enabled custom schedules
    const schedules = await this.getEnabledSchedules();
    for (const schedule of schedules) {
      if (schedule.cronExpression) {
        this.startCronJob(schedule);
      }
    }

    this.log.info({ schedulesLoaded: schedules.length }, 'Scheduler initialized');
  }

  /**
   * Create a new report schedule
   */
  async createSchedule(input: ScheduleCreateInput, userId: string): Promise<ReportSchedule> {
    const scheduleId = uuidv4();
    const nextRun = this.calculateNextRun(input.frequency, input.cronExpression);

    const query = `
      INSERT INTO esg.report_schedules (
        id, tenant_id, name, description, report_type, frequency,
        cron_expression, frameworks, template_id, recipients,
        export_formats, enabled, next_run_at, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      )
      RETURNING *
    `;

    const values = [
      scheduleId,
      input.tenantId,
      input.name,
      input.description || null,
      input.reportType,
      input.frequency,
      input.cronExpression || null,
      input.frameworks || [],
      input.templateId || null,
      input.recipients,
      input.exportFormats,
      input.enabled !== false,
      nextRun,
      userId,
    ];

    const result = await db.query(query, values);
    const schedule = this.mapRowToSchedule(result.rows[0]);

    // Start cron job if custom expression provided
    if (schedule.enabled && schedule.cronExpression) {
      this.startCronJob(schedule);
    }

    this.log.info({ scheduleId, name: input.name }, 'Schedule created');
    return schedule;
  }

  /**
   * Update a schedule
   */
  async updateSchedule(
    scheduleId: string,
    tenantId: string,
    updates: Partial<ScheduleCreateInput>,
    userId: string,
  ): Promise<ReportSchedule | null> {
    const existing = await this.getSchedule(scheduleId, tenantId);
    if (!existing) {
      return null;
    }

    const updateFields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    if (updates.reportType !== undefined) {
      updateFields.push(`report_type = $${paramIndex++}`);
      values.push(updates.reportType);
    }
    if (updates.frequency !== undefined) {
      updateFields.push(`frequency = $${paramIndex++}`);
      values.push(updates.frequency);
      // Recalculate next run
      updateFields.push(`next_run_at = $${paramIndex++}`);
      values.push(this.calculateNextRun(updates.frequency, updates.cronExpression));
    }
    if (updates.cronExpression !== undefined) {
      updateFields.push(`cron_expression = $${paramIndex++}`);
      values.push(updates.cronExpression);
    }
    if (updates.frameworks !== undefined) {
      updateFields.push(`frameworks = $${paramIndex++}`);
      values.push(updates.frameworks);
    }
    if (updates.templateId !== undefined) {
      updateFields.push(`template_id = $${paramIndex++}`);
      values.push(updates.templateId);
    }
    if (updates.recipients !== undefined) {
      updateFields.push(`recipients = $${paramIndex++}`);
      values.push(updates.recipients);
    }
    if (updates.exportFormats !== undefined) {
      updateFields.push(`export_formats = $${paramIndex++}`);
      values.push(updates.exportFormats);
    }
    if (updates.enabled !== undefined) {
      updateFields.push(`enabled = $${paramIndex++}`);
      values.push(updates.enabled);
    }

    if (updateFields.length === 0) {
      return existing;
    }

    updateFields.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());

    values.push(scheduleId, tenantId);

    const query = `
      UPDATE esg.report_schedules
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await db.query(query, values);
    const updated = this.mapRowToSchedule(result.rows[0]);

    // Update cron job
    this.stopCronJob(scheduleId);
    if (updated.enabled && updated.cronExpression) {
      this.startCronJob(updated);
    }

    return updated;
  }

  /**
   * Delete a schedule
   */
  async deleteSchedule(scheduleId: string, tenantId: string): Promise<boolean> {
    this.stopCronJob(scheduleId);

    const query = `
      DELETE FROM esg.report_schedules
      WHERE id = $1 AND tenant_id = $2
    `;

    const result = await db.query(query, [scheduleId, tenantId]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Get a schedule by ID
   */
  async getSchedule(scheduleId: string, tenantId: string): Promise<ReportSchedule | null> {
    const query = `
      SELECT * FROM esg.report_schedules
      WHERE id = $1 AND tenant_id = $2
    `;

    const result = await db.query(query, [scheduleId, tenantId]);
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToSchedule(result.rows[0]);
  }

  /**
   * List schedules for a tenant
   */
  async listSchedules(tenantId: string): Promise<ReportSchedule[]> {
    const query = `
      SELECT * FROM esg.report_schedules
      WHERE tenant_id = $1
      ORDER BY created_at DESC
    `;

    const result = await db.query(query, [tenantId]);
    return result.rows.map((row) => this.mapRowToSchedule(row));
  }

  /**
   * Get all enabled schedules
   */
  private async getEnabledSchedules(): Promise<ReportSchedule[]> {
    const query = `
      SELECT * FROM esg.report_schedules
      WHERE enabled = true
    `;

    const result = await db.query(query);
    return result.rows.map((row) => this.mapRowToSchedule(row));
  }

  /**
   * Process all scheduled reports that are due
   */
  private async processScheduledReports(): Promise<void> {
    const dueReports = await this.reportService.getScheduledReportsDue();

    for (const schedule of dueReports) {
      try {
        await this.generateScheduledReport(schedule);
        this.log.info({ scheduleId: schedule.id }, 'Scheduled report generated');
      } catch (error) {
        this.log.error({ error, scheduleId: schedule.id }, 'Failed to generate scheduled report');
        await this.reportService.updateScheduleAfterRun(schedule.id, false);
      }
    }
  }

  /**
   * Generate a report based on schedule
   */
  private async generateScheduledReport(schedule: {
    id: string;
    tenantId: string;
    name: string;
    reportType: string;
    frameworks: string[];
    templateId: string | null;
  }): Promise<void> {
    this.log.info({ scheduleId: schedule.id, name: schedule.name }, 'Generating scheduled report');

    // Calculate period based on report type
    const { periodStart, periodEnd } = this.calculateReportPeriod(schedule.reportType as ReportType);

    // Create the report
    const report = await this.reportService.createReport(
      {
        tenantId: schedule.tenantId,
        title: `${schedule.name} - ${periodEnd.toLocaleDateString()}`,
        reportType: schedule.reportType as ReportType,
        periodStart,
        periodEnd,
        frameworks: schedule.frameworks,
        templateId: schedule.templateId || undefined,
      },
      'scheduler',
    );

    // Calculate scores
    await this.reportService.calculateScores(report.id, schedule.tenantId);

    // Update schedule status
    await this.reportService.updateScheduleAfterRun(schedule.id, true, report.id);
  }

  /**
   * Start a cron job for a schedule
   */
  private startCronJob(schedule: ReportSchedule): void {
    if (!schedule.cronExpression || !cron.validate(schedule.cronExpression)) {
      this.log.warn(
        { scheduleId: schedule.id, cron: schedule.cronExpression },
        'Invalid cron expression',
      );
      return;
    }

    const job = cron.schedule(schedule.cronExpression, async () => {
      this.log.info({ scheduleId: schedule.id }, 'Cron job triggered');
      await this.generateScheduledReport({
        id: schedule.id,
        tenantId: schedule.tenantId,
        name: schedule.name,
        reportType: schedule.reportType,
        frameworks: schedule.frameworks || [],
        templateId: null,
      });
    });

    this.cronJobs.set(schedule.id, job);
    this.log.info({ scheduleId: schedule.id, cron: schedule.cronExpression }, 'Cron job started');
  }

  /**
   * Stop a cron job
   */
  private stopCronJob(scheduleId: string): void {
    const job = this.cronJobs.get(scheduleId);
    if (job) {
      job.stop();
      this.cronJobs.delete(scheduleId);
      this.log.info({ scheduleId }, 'Cron job stopped');
    }
  }

  /**
   * Calculate next run time based on frequency
   */
  private calculateNextRun(
    frequency: string,
    cronExpression?: string | null,
  ): Date {
    const now = new Date();

    if (cronExpression) {
      // For custom cron, calculate next occurrence
      // This is a simplified version; in production use a proper cron parser
      return now;
    }

    switch (frequency) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth;
      case 'quarterly':
        const nextQuarter = new Date(now);
        nextQuarter.setMonth(nextQuarter.getMonth() + 3);
        return nextQuarter;
      case 'annually':
        const nextYear = new Date(now);
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        return nextYear;
      default:
        return now;
    }
  }

  /**
   * Calculate report period based on report type
   */
  private calculateReportPeriod(reportType: ReportType): { periodStart: Date; periodEnd: Date } {
    const now = new Date();
    const periodEnd = new Date(now);

    let periodStart: Date;

    switch (reportType) {
      case 'monthly':
        periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        break;
      case 'quarterly':
        const quarter = Math.floor(now.getMonth() / 3);
        periodStart = new Date(now.getFullYear(), (quarter - 1) * 3, 1);
        break;
      case 'annual':
        periodStart = new Date(now.getFullYear() - 1, 0, 1);
        break;
      default:
        periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { periodStart, periodEnd };
  }

  /**
   * Map database row to ReportSchedule
   */
  private mapRowToSchedule(row: Record<string, unknown>): ReportSchedule {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      name: row.name as string,
      reportType: row.report_type as ReportType,
      frequency: row.frequency as 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually',
      cronExpression: row.cron_expression as string | undefined,
      recipients: (row.recipients as string[]) || [],
      exportFormats: (row.export_formats as ExportFormat[]) || ['pdf'],
      frameworks: (row.frameworks as string[]) || [],
      enabled: row.enabled as boolean,
      lastRun: row.last_run_at ? new Date(row.last_run_at as string) : undefined,
      nextRun: row.next_run_at ? new Date(row.next_run_at as string) : undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  /**
   * Shutdown scheduler
   */
  shutdown(): void {
    for (const [id, job] of this.cronJobs) {
      job.stop();
      this.log.info({ scheduleId: id }, 'Cron job stopped during shutdown');
    }
    this.cronJobs.clear();
    this.log.info('Scheduler shutdown complete');
  }
}

export const schedulerService = new SchedulerService();
