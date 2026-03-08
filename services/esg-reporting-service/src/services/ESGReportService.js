"use strict";
/**
 * ESG Report Service
 * Core business logic for ESG report management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.esgReportService = exports.ESGReportService = void 0;
const uuid_1 = require("uuid");
const database_js_1 = require("../utils/database.js");
const logger_js_1 = require("../utils/logger.js");
const esg_reporting_1 = require("@intelgraph/esg-reporting");
const MetricsService_js_1 = require("./MetricsService.js");
class ESGReportService {
    metricsService;
    log = (0, logger_js_1.createChildLogger)({ service: 'ESGReportService' });
    constructor() {
        this.metricsService = new MetricsService_js_1.MetricsService();
    }
    /**
     * Create a new ESG report
     */
    async createReport(input, userId) {
        this.log.info({ input, userId }, 'Creating new ESG report');
        const reportId = (0, uuid_1.v4)();
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
            esg_reporting_1.ReportStatus.DRAFT,
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
        const result = await database_js_1.db.query(query, values);
        const report = this.mapRowToReport(result.rows[0]);
        // Log audit trail
        await this.logAudit(input.tenantId, 'report', reportId, 'create', userId, null, report);
        this.log.info({ reportId }, 'ESG report created successfully');
        return report;
    }
    /**
     * Get a report by ID
     */
    async getReport(reportId, tenantId) {
        const query = `
      SELECT * FROM esg.reports
      WHERE id = $1 AND tenant_id = $2
    `;
        const result = await database_js_1.db.query(query, [reportId, tenantId]);
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapRowToReport(result.rows[0]);
    }
    /**
     * List reports with filtering and pagination
     */
    async listReports(tenantId, filter, page = 1, pageSize = 20) {
        const conditions = ['tenant_id = $1'];
        const values = [tenantId];
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
        const countResult = await database_js_1.db.query(countQuery, values);
        const total = parseInt(countResult.rows[0].count, 10);
        // Get paginated results
        const query = `
      SELECT * FROM esg.reports
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
        values.push(pageSize, offset);
        const result = await database_js_1.db.query(query, values);
        const reports = result.rows.map((row) => this.mapRowToReport(row));
        return { reports, total, page, pageSize };
    }
    /**
     * Update a report
     */
    async updateReport(reportId, tenantId, input, userId) {
        const existingReport = await this.getReport(reportId, tenantId);
        if (!existingReport) {
            return null;
        }
        const updates = [];
        const values = [];
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
            if (input.status === esg_reporting_1.ReportStatus.APPROVED) {
                updates.push(`approved_by = $${paramIndex}`);
                values.push(userId);
                paramIndex++;
                updates.push(`approved_at = $${paramIndex}`);
                values.push(new Date());
                paramIndex++;
            }
            else if (input.status === esg_reporting_1.ReportStatus.PUBLISHED) {
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
        const result = await database_js_1.db.query(query, values);
        const updatedReport = this.mapRowToReport(result.rows[0]);
        // Log audit trail
        await this.logAudit(tenantId, 'report', reportId, 'update', userId, existingReport, updatedReport);
        return updatedReport;
    }
    /**
     * Delete a report
     */
    async deleteReport(reportId, tenantId, userId) {
        const existingReport = await this.getReport(reportId, tenantId);
        if (!existingReport) {
            return false;
        }
        const query = `
      DELETE FROM esg.reports
      WHERE id = $1 AND tenant_id = $2
    `;
        const result = await database_js_1.db.query(query, [reportId, tenantId]);
        if (result.rowCount && result.rowCount > 0) {
            await this.logAudit(tenantId, 'report', reportId, 'delete', userId, existingReport, null);
            return true;
        }
        return false;
    }
    /**
     * Calculate and update ESG scores for a report
     */
    async calculateScores(reportId, tenantId) {
        const report = await this.getReport(reportId, tenantId);
        if (!report) {
            return null;
        }
        const scores = this.metricsService.calculateESGScores(report.environmental, report.social, report.governance);
        const query = `
      UPDATE esg.reports
      SET overall_score = $1,
          environmental_score = $2,
          social_score = $3,
          governance_score = $4,
          updated_at = NOW()
      WHERE id = $5 AND tenant_id = $6
    `;
        await database_js_1.db.query(query, [
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
    async getScheduledReportsDue() {
        const query = `
      SELECT id, tenant_id, name, report_type, frameworks, template_id
      FROM esg.report_schedules
      WHERE enabled = true
        AND next_run_at <= NOW()
    `;
        const result = await database_js_1.db.query(query);
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
    async updateScheduleAfterRun(scheduleId, success, reportId) {
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
        await database_js_1.db.query(query, [success ? 'success' : 'failed', reportId || null, scheduleId]);
    }
    /**
     * Log audit trail entry
     */
    async logAudit(tenantId, entityType, entityId, action, actor, previousState, newState) {
        const query = `
      INSERT INTO esg.audit_trail (
        tenant_id, entity_type, entity_id, action, actor,
        previous_state, new_state, changes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
        const changes = this.calculateChanges(previousState, newState);
        await database_js_1.db.query(query, [
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
    calculateChanges(previous, current) {
        if (!previous || !current) {
            return {};
        }
        const changes = {};
        const prevObj = previous;
        const currObj = current;
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
    mapRowToReport(row) {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            title: row.title,
            description: row.description,
            reportType: row.report_type,
            status: row.status,
            periodStart: new Date(row.period_start),
            periodEnd: new Date(row.period_end),
            environmental: row.environmental_metrics || {},
            social: row.social_metrics || {},
            governance: row.governance_metrics || {},
            scores: {
                overall: row.overall_score || 0,
                environmental: row.environmental_score || 0,
                social: row.social_score || 0,
                governance: row.governance_score || 0,
                methodology: 'Summit ESG Scoring v1.0',
                calculatedAt: new Date(row.updated_at),
            },
            metrics: [],
            complianceFrameworks: row.compliance_frameworks || [],
            complianceSummary: row.compliance_summary || {},
            metadata: {
                version: row.version,
                generatedAt: new Date(row.created_at),
                generatedBy: row.created_by,
                approvedBy: row.approved_by,
                approvedAt: row.approved_at ? new Date(row.approved_at) : undefined,
                publishedAt: row.published_at ? new Date(row.published_at) : undefined,
            },
            auditTrail: [],
        };
    }
}
exports.ESGReportService = ESGReportService;
exports.esgReportService = new ESGReportService();
