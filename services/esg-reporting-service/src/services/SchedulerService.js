"use strict";
/**
 * ESG Report Scheduler Service
 * Handles automated report generation based on schedules
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.schedulerService = exports.SchedulerService = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const uuid_1 = require("uuid");
const database_js_1 = require("../utils/database.js");
const logger_js_1 = require("../utils/logger.js");
const ESGReportService_js_1 = require("./ESGReportService.js");
const MetricsService_js_1 = require("./MetricsService.js");
const ExportService_js_1 = require("./ExportService.js");
class SchedulerService {
    log = (0, logger_js_1.createChildLogger)({ service: 'SchedulerService' });
    cronJobs = new Map();
    reportService;
    metricsService;
    exportService;
    constructor() {
        this.reportService = new ESGReportService_js_1.ESGReportService();
        this.metricsService = new MetricsService_js_1.MetricsService();
        this.exportService = new ExportService_js_1.ExportService();
    }
    /**
     * Initialize scheduler and start all enabled schedules
     */
    async initialize() {
        this.log.info('Initializing ESG report scheduler');
        // Start main scheduler job (runs every minute to check for due reports)
        node_cron_1.default.schedule('* * * * *', async () => {
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
    async createSchedule(input, userId) {
        const scheduleId = (0, uuid_1.v4)();
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
        const result = await database_js_1.db.query(query, values);
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
    async updateSchedule(scheduleId, tenantId, updates, userId) {
        const existing = await this.getSchedule(scheduleId, tenantId);
        if (!existing) {
            return null;
        }
        const updateFields = [];
        const values = [];
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
        const result = await database_js_1.db.query(query, values);
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
    async deleteSchedule(scheduleId, tenantId) {
        this.stopCronJob(scheduleId);
        const query = `
      DELETE FROM esg.report_schedules
      WHERE id = $1 AND tenant_id = $2
    `;
        const result = await database_js_1.db.query(query, [scheduleId, tenantId]);
        return result.rowCount !== null && result.rowCount > 0;
    }
    /**
     * Get a schedule by ID
     */
    async getSchedule(scheduleId, tenantId) {
        const query = `
      SELECT * FROM esg.report_schedules
      WHERE id = $1 AND tenant_id = $2
    `;
        const result = await database_js_1.db.query(query, [scheduleId, tenantId]);
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapRowToSchedule(result.rows[0]);
    }
    /**
     * List schedules for a tenant
     */
    async listSchedules(tenantId) {
        const query = `
      SELECT * FROM esg.report_schedules
      WHERE tenant_id = $1
      ORDER BY created_at DESC
    `;
        const result = await database_js_1.db.query(query, [tenantId]);
        return result.rows.map((row) => this.mapRowToSchedule(row));
    }
    /**
     * Get all enabled schedules
     */
    async getEnabledSchedules() {
        const query = `
      SELECT * FROM esg.report_schedules
      WHERE enabled = true
    `;
        const result = await database_js_1.db.query(query);
        return result.rows.map((row) => this.mapRowToSchedule(row));
    }
    /**
     * Process all scheduled reports that are due
     */
    async processScheduledReports() {
        const dueReports = await this.reportService.getScheduledReportsDue();
        for (const schedule of dueReports) {
            try {
                await this.generateScheduledReport(schedule);
                this.log.info({ scheduleId: schedule.id }, 'Scheduled report generated');
            }
            catch (error) {
                this.log.error({ error, scheduleId: schedule.id }, 'Failed to generate scheduled report');
                await this.reportService.updateScheduleAfterRun(schedule.id, false);
            }
        }
    }
    /**
     * Generate a report based on schedule
     */
    async generateScheduledReport(schedule) {
        this.log.info({ scheduleId: schedule.id, name: schedule.name }, 'Generating scheduled report');
        // Calculate period based on report type
        const { periodStart, periodEnd } = this.calculateReportPeriod(schedule.reportType);
        // Create the report
        const report = await this.reportService.createReport({
            tenantId: schedule.tenantId,
            title: `${schedule.name} - ${periodEnd.toLocaleDateString()}`,
            reportType: schedule.reportType,
            periodStart,
            periodEnd,
            frameworks: schedule.frameworks,
            templateId: schedule.templateId || undefined,
        }, 'scheduler');
        // Calculate scores
        await this.reportService.calculateScores(report.id, schedule.tenantId);
        // Update schedule status
        await this.reportService.updateScheduleAfterRun(schedule.id, true, report.id);
    }
    /**
     * Start a cron job for a schedule
     */
    startCronJob(schedule) {
        if (!schedule.cronExpression || !node_cron_1.default.validate(schedule.cronExpression)) {
            this.log.warn({ scheduleId: schedule.id, cron: schedule.cronExpression }, 'Invalid cron expression');
            return;
        }
        const job = node_cron_1.default.schedule(schedule.cronExpression, async () => {
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
    stopCronJob(scheduleId) {
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
    calculateNextRun(frequency, cronExpression) {
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
    calculateReportPeriod(reportType) {
        const now = new Date();
        const periodEnd = new Date(now);
        let periodStart;
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
    mapRowToSchedule(row) {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            name: row.name,
            reportType: row.report_type,
            frequency: row.frequency,
            cronExpression: row.cron_expression,
            recipients: row.recipients || [],
            exportFormats: row.export_formats || ['pdf'],
            frameworks: row.frameworks || [],
            enabled: row.enabled,
            lastRun: row.last_run_at ? new Date(row.last_run_at) : undefined,
            nextRun: row.next_run_at ? new Date(row.next_run_at) : undefined,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        };
    }
    /**
     * Shutdown scheduler
     */
    shutdown() {
        for (const [id, job] of this.cronJobs) {
            job.stop();
            this.log.info({ scheduleId: id }, 'Cron job stopped during shutdown');
        }
        this.cronJobs.clear();
        this.log.info('Scheduler shutdown complete');
    }
}
exports.SchedulerService = SchedulerService;
exports.schedulerService = new SchedulerService();
