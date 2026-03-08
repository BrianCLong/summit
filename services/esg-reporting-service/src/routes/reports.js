"use strict";
/**
 * ESG Report Routes
 * REST API endpoints for ESG report management
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const ESGReportService_js_1 = require("../services/ESGReportService.js");
const MetricsService_js_1 = require("../services/MetricsService.js");
const ExportService_js_1 = require("../services/ExportService.js");
const logger_js_1 = require("../utils/logger.js");
const esg_reporting_1 = require("@intelgraph/esg-reporting");
const router = (0, express_1.Router)();
const log = (0, logger_js_1.createChildLogger)({ route: 'reports' });
// Middleware to extract tenant from headers or query
const extractTenant = (req, res, next) => {
    const tenantId = req.headers['x-tenant-id'] || req.query.tenantId;
    if (!tenantId || typeof tenantId !== 'string') {
        return res.status(400).json({ error: 'Tenant ID is required' });
    }
    req.tenantId = tenantId;
    next();
};
// Middleware to extract user from headers
const extractUser = (req, res, next) => {
    const userId = req.headers['x-user-id'] || 'anonymous';
    req.userId = typeof userId === 'string' ? userId : 'anonymous';
    next();
};
// Apply middleware to all routes
router.use(extractTenant);
router.use(extractUser);
// ============================================================================
// Report CRUD Operations
// ============================================================================
/**
 * Create a new ESG report
 */
router.post('/', async (req, res) => {
    try {
        const input = (0, esg_reporting_1.validateCreateReportInput)({
            ...req.body,
            tenantId: req.tenantId,
        });
        const report = await ESGReportService_js_1.esgReportService.createReport(input, req.userId);
        res.status(201).json(report);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.errors });
        }
        log.error({ error }, 'Failed to create report');
        res.status(500).json({ error: 'Failed to create report' });
    }
});
/**
 * Get a report by ID
 */
router.get('/:reportId', async (req, res) => {
    try {
        const report = await ESGReportService_js_1.esgReportService.getReport(req.params.reportId, req.tenantId);
        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }
        // Include metrics
        const metrics = await MetricsService_js_1.metricsService.getMetricsForReport(req.params.reportId, req.tenantId);
        res.json({ ...report, metrics });
    }
    catch (error) {
        log.error({ error, reportId: req.params.reportId }, 'Failed to get report');
        res.status(500).json({ error: 'Failed to get report' });
    }
});
/**
 * List reports with filtering
 */
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const pageSize = Math.min(parseInt(req.query.pageSize, 10) || 20, 100);
        const filter = {};
        if (req.query.status) {
            const statuses = req.query.status.split(',');
            filter.status = statuses.map((s) => esg_reporting_1.ReportStatusSchema.parse(s));
        }
        if (req.query.reportType) {
            const types = req.query.reportType.split(',');
            filter.reportType = types.map((t) => esg_reporting_1.ReportTypeSchema.parse(t));
        }
        if (req.query.periodStart) {
            filter.periodStart = new Date(req.query.periodStart);
        }
        if (req.query.periodEnd) {
            filter.periodEnd = new Date(req.query.periodEnd);
        }
        if (req.query.frameworks) {
            filter.frameworks = req.query.frameworks.split(',');
        }
        const result = await ESGReportService_js_1.esgReportService.listReports(req.tenantId, filter, page, pageSize);
        res.json(result);
    }
    catch (error) {
        log.error({ error }, 'Failed to list reports');
        res.status(500).json({ error: 'Failed to list reports' });
    }
});
/**
 * Update a report
 */
router.patch('/:reportId', async (req, res) => {
    try {
        const input = (0, esg_reporting_1.validateUpdateReportInput)(req.body);
        const report = await ESGReportService_js_1.esgReportService.updateReport(req.params.reportId, req.tenantId, input, req.userId);
        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }
        res.json(report);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.errors });
        }
        log.error({ error, reportId: req.params.reportId }, 'Failed to update report');
        res.status(500).json({ error: 'Failed to update report' });
    }
});
/**
 * Delete a report
 */
router.delete('/:reportId', async (req, res) => {
    try {
        const deleted = await ESGReportService_js_1.esgReportService.deleteReport(req.params.reportId, req.tenantId, req.userId);
        if (!deleted) {
            return res.status(404).json({ error: 'Report not found' });
        }
        res.status(204).send();
    }
    catch (error) {
        log.error({ error, reportId: req.params.reportId }, 'Failed to delete report');
        res.status(500).json({ error: 'Failed to delete report' });
    }
});
// ============================================================================
// Report Scores
// ============================================================================
/**
 * Calculate and update ESG scores for a report
 */
router.post('/:reportId/calculate-scores', async (req, res) => {
    try {
        const scores = await ESGReportService_js_1.esgReportService.calculateScores(req.params.reportId, req.tenantId);
        if (!scores) {
            return res.status(404).json({ error: 'Report not found' });
        }
        res.json(scores);
    }
    catch (error) {
        log.error({ error, reportId: req.params.reportId }, 'Failed to calculate scores');
        res.status(500).json({ error: 'Failed to calculate scores' });
    }
});
// ============================================================================
// Metrics Operations
// ============================================================================
/**
 * Add a metric to a report
 */
router.post('/:reportId/metrics', async (req, res) => {
    try {
        const input = (0, esg_reporting_1.validateMetricInput)(req.body);
        const metric = await MetricsService_js_1.metricsService.addMetric(req.tenantId, req.params.reportId, input, req.userId);
        res.status(201).json(metric);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.errors });
        }
        log.error({ error, reportId: req.params.reportId }, 'Failed to add metric');
        res.status(500).json({ error: 'Failed to add metric' });
    }
});
/**
 * Get metrics for a report
 */
router.get('/:reportId/metrics', async (req, res) => {
    try {
        const category = req.query.category;
        const metrics = await MetricsService_js_1.metricsService.getMetricsForReport(req.params.reportId, req.tenantId, category);
        res.json(metrics);
    }
    catch (error) {
        log.error({ error, reportId: req.params.reportId }, 'Failed to get metrics');
        res.status(500).json({ error: 'Failed to get metrics' });
    }
});
/**
 * Bulk import metrics
 */
router.post('/:reportId/metrics/bulk', async (req, res) => {
    try {
        const metrics = req.body.metrics;
        if (!Array.isArray(metrics)) {
            return res.status(400).json({ error: 'metrics must be an array' });
        }
        const result = await MetricsService_js_1.metricsService.bulkImportMetrics(req.tenantId, req.params.reportId, metrics.map(esg_reporting_1.validateMetricInput), req.userId);
        res.json(result);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.errors });
        }
        log.error({ error, reportId: req.params.reportId }, 'Failed to bulk import metrics');
        res.status(500).json({ error: 'Failed to bulk import metrics' });
    }
});
// ============================================================================
// Compliance Assessment
// ============================================================================
/**
 * Assess compliance against a framework
 */
router.get('/:reportId/compliance/:frameworkId', async (req, res) => {
    try {
        const assessment = await MetricsService_js_1.metricsService.assessFrameworkCompliance(req.tenantId, req.params.reportId, req.params.frameworkId);
        res.json(assessment);
    }
    catch (error) {
        log.error({ error, reportId: req.params.reportId, frameworkId: req.params.frameworkId }, 'Failed to assess compliance');
        res.status(500).json({ error: 'Failed to assess compliance' });
    }
});
// ============================================================================
// Export Operations
// ============================================================================
/**
 * Export a report in specified formats
 */
router.post('/:reportId/export', async (req, res) => {
    try {
        const formats = req.body.formats || ['pdf'];
        // Validate formats
        const validFormats = formats.map((f) => esg_reporting_1.ExportFormatSchema.parse(f));
        const report = await ESGReportService_js_1.esgReportService.getReport(req.params.reportId, req.tenantId);
        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }
        const metrics = await MetricsService_js_1.metricsService.getMetricsForReport(req.params.reportId, req.tenantId);
        const exports = await ExportService_js_1.exportService.exportReport(report, metrics, {
            formats: validFormats,
            includeCharts: req.body.includeCharts !== false,
            includeRawData: req.body.includeRawData !== false,
            includeComplianceDetails: req.body.includeComplianceDetails !== false,
            watermark: req.body.watermark,
        });
        // If multiple formats, return archive
        if (exports.length > 1 || req.body.archive) {
            const archive = await ExportService_js_1.exportService.exportToArchive(report, metrics, {
                formats: validFormats,
            });
            res.setHeader('Content-Type', archive.mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${archive.filename}"`);
            return res.send(archive.data);
        }
        // Single format
        const exp = exports[0];
        res.setHeader('Content-Type', exp.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${exp.filename}"`);
        res.send(exp.data);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Invalid export format', details: error.errors });
        }
        log.error({ error, reportId: req.params.reportId }, 'Failed to export report');
        res.status(500).json({ error: 'Failed to export report' });
    }
});
exports.default = router;
