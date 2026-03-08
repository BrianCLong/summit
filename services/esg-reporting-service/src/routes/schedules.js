"use strict";
/**
 * ESG Schedule Routes
 * REST API endpoints for report schedule management
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const SchedulerService_js_1 = require("../services/SchedulerService.js");
const logger_js_1 = require("../utils/logger.js");
const esg_reporting_1 = require("@intelgraph/esg-reporting");
const router = (0, express_1.Router)();
const log = (0, logger_js_1.createChildLogger)({ route: 'schedules' });
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
/**
 * Create a new report schedule
 */
router.post('/', async (req, res) => {
    try {
        const input = (0, esg_reporting_1.validateReportScheduleInput)({
            ...req.body,
            tenantId: req.tenantId,
        });
        const schedule = await SchedulerService_js_1.schedulerService.createSchedule(input, req.userId);
        res.status(201).json(schedule);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.errors });
        }
        log.error({ error }, 'Failed to create schedule');
        res.status(500).json({ error: 'Failed to create schedule' });
    }
});
/**
 * Get a schedule by ID
 */
router.get('/:scheduleId', async (req, res) => {
    try {
        const schedule = await SchedulerService_js_1.schedulerService.getSchedule(req.params.scheduleId, req.tenantId);
        if (!schedule) {
            return res.status(404).json({ error: 'Schedule not found' });
        }
        res.json(schedule);
    }
    catch (error) {
        log.error({ error, scheduleId: req.params.scheduleId }, 'Failed to get schedule');
        res.status(500).json({ error: 'Failed to get schedule' });
    }
});
/**
 * List all schedules for a tenant
 */
router.get('/', async (req, res) => {
    try {
        const schedules = await SchedulerService_js_1.schedulerService.listSchedules(req.tenantId);
        res.json(schedules);
    }
    catch (error) {
        log.error({ error }, 'Failed to list schedules');
        res.status(500).json({ error: 'Failed to list schedules' });
    }
});
/**
 * Update a schedule
 */
router.patch('/:scheduleId', async (req, res) => {
    try {
        // Partial validation - only validate provided fields
        const updates = {};
        if (req.body.name !== undefined) {
            updates.name = req.body.name;
        }
        if (req.body.description !== undefined) {
            updates.description = req.body.description;
        }
        if (req.body.reportType !== undefined) {
            updates.reportType = esg_reporting_1.ReportTypeSchema.parse(req.body.reportType);
        }
        if (req.body.frequency !== undefined) {
            updates.frequency = zod_1.z
                .enum(['daily', 'weekly', 'monthly', 'quarterly', 'annually'])
                .parse(req.body.frequency);
        }
        if (req.body.cronExpression !== undefined) {
            updates.cronExpression = req.body.cronExpression;
        }
        if (req.body.frameworks !== undefined) {
            updates.frameworks = req.body.frameworks;
        }
        if (req.body.templateId !== undefined) {
            updates.templateId = req.body.templateId;
        }
        if (req.body.recipients !== undefined) {
            updates.recipients = zod_1.z.array(zod_1.z.string().email()).parse(req.body.recipients);
        }
        if (req.body.exportFormats !== undefined) {
            updates.exportFormats = zod_1.z.array(esg_reporting_1.ExportFormatSchema).parse(req.body.exportFormats);
        }
        if (req.body.enabled !== undefined) {
            updates.enabled = req.body.enabled;
        }
        const schedule = await SchedulerService_js_1.schedulerService.updateSchedule(req.params.scheduleId, req.tenantId, updates, req.userId);
        if (!schedule) {
            return res.status(404).json({ error: 'Schedule not found' });
        }
        res.json(schedule);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.errors });
        }
        log.error({ error, scheduleId: req.params.scheduleId }, 'Failed to update schedule');
        res.status(500).json({ error: 'Failed to update schedule' });
    }
});
/**
 * Delete a schedule
 */
router.delete('/:scheduleId', async (req, res) => {
    try {
        const deleted = await SchedulerService_js_1.schedulerService.deleteSchedule(req.params.scheduleId, req.tenantId);
        if (!deleted) {
            return res.status(404).json({ error: 'Schedule not found' });
        }
        res.status(204).send();
    }
    catch (error) {
        log.error({ error, scheduleId: req.params.scheduleId }, 'Failed to delete schedule');
        res.status(500).json({ error: 'Failed to delete schedule' });
    }
});
/**
 * Enable a schedule
 */
router.post('/:scheduleId/enable', async (req, res) => {
    try {
        const schedule = await SchedulerService_js_1.schedulerService.updateSchedule(req.params.scheduleId, req.tenantId, { enabled: true }, req.userId);
        if (!schedule) {
            return res.status(404).json({ error: 'Schedule not found' });
        }
        res.json(schedule);
    }
    catch (error) {
        log.error({ error, scheduleId: req.params.scheduleId }, 'Failed to enable schedule');
        res.status(500).json({ error: 'Failed to enable schedule' });
    }
});
/**
 * Disable a schedule
 */
router.post('/:scheduleId/disable', async (req, res) => {
    try {
        const schedule = await SchedulerService_js_1.schedulerService.updateSchedule(req.params.scheduleId, req.tenantId, { enabled: false }, req.userId);
        if (!schedule) {
            return res.status(404).json({ error: 'Schedule not found' });
        }
        res.json(schedule);
    }
    catch (error) {
        log.error({ error, scheduleId: req.params.scheduleId }, 'Failed to disable schedule');
        res.status(500).json({ error: 'Failed to disable schedule' });
    }
});
exports.default = router;
