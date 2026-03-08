"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const siem_export_service_js_1 = require("../integrations/siem/siem-export.service.js");
const tenantHeader_js_1 = require("../middleware/tenantHeader.js");
const auth_js_1 = require("../middleware/auth.js");
const permissions_js_1 = require("../middleware/permissions.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const router = (0, express_1.Router)();
// Apply middleware
router.use((0, tenantHeader_js_1.tenantHeader)());
router.use(auth_js_1.ensureAuthenticated);
/**
 * Pull-based SIEM export
 * GET /api/v1/siem/export/signals
 *
 * Query security signals within a time range
 */
const querySchema = zod_1.z.object({
    startTime: zod_1.z.string().datetime(),
    endTime: zod_1.z.string().datetime(),
    category: zod_1.z.enum([
        'Authentication',
        'Authorization',
        'DataAccess',
        'PolicyViolation',
        'RateLimiting',
        'Anomaly',
        'SystemIntegrity'
    ]).optional(),
    minSeverity: zod_1.z.enum(['low', 'medium', 'high', 'critical']).optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(10000).default(1000),
    cursor: zod_1.z.string().optional()
});
router.get('/signals', (0, permissions_js_1.requirePermission)('siem:export:read'), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        // Validate query parameters
        const params = querySchema.parse(req.query);
        const request = {
            tenantId,
            startTime: new Date(params.startTime),
            endTime: new Date(params.endTime),
            category: params.category,
            minSeverity: params.minSeverity,
            limit: params.limit,
            cursor: params.cursor
        };
        // Enforce maximum time range (30 days)
        const maxRangeMs = 30 * 24 * 60 * 60 * 1000;
        const rangeMs = request.endTime.getTime() - request.startTime.getTime();
        if (rangeMs > maxRangeMs) {
            return res.status(400).json({
                error: {
                    code: 'INVALID_TIME_RANGE',
                    message: 'Time range cannot exceed 30 days',
                    requestId: req.requestId
                }
            });
        }
        const result = await siem_export_service_js_1.siemExportService.querySecuritySignals(request);
        // Audit log the export
        logger_js_1.default.info('SIEM export query executed', {
            tenantId,
            startTime: params.startTime,
            endTime: params.endTime,
            signalCount: result.signals.length,
            requestId: req.requestId
        });
        res.json(result);
    }
    catch (error) {
        logger_js_1.default.error('SIEM export query failed', {
            error: error.message,
            requestId: req.requestId
        });
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: {
                    code: 'INVALID_PARAMETERS',
                    message: 'Invalid query parameters',
                    details: error.errors,
                    requestId: req.requestId
                }
            });
        }
        res.status(500).json({
            error: {
                code: 'EXPORT_FAILED',
                message: 'Failed to export security signals',
                requestId: req.requestId
            }
        });
    }
});
/**
 * Get SIEM export statistics
 * GET /api/v1/siem/export/stats
 */
router.get('/stats', (0, permissions_js_1.requirePermission)('siem:export:read'), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        // Query statistics from audit events
        const result = await req.db.query(`
        SELECT
          COUNT(*) as total_events,
          COUNT(DISTINCT DATE(timestamp)) as active_days,
          COUNT(CASE WHEN level = 'critical' THEN 1 END) as critical_events,
          COUNT(CASE WHEN level = 'high' THEN 1 END) as high_events,
          MIN(timestamp) as earliest_event,
          MAX(timestamp) as latest_event
        FROM audit.events
        WHERE tenant_id = $1 AND compliance_relevant = true
        `, [tenantId]);
        res.json({
            schemaVersion: '1.0.0',
            tenantId,
            statistics: result.rows[0]
        });
    }
    catch (error) {
        logger_js_1.default.error('SIEM stats query failed', {
            error: error.message,
            requestId: req.requestId
        });
        res.status(500).json({
            error: {
                code: 'STATS_FAILED',
                message: 'Failed to retrieve SIEM statistics',
                requestId: req.requestId
            }
        });
    }
});
/**
 * Health check endpoint
 * GET /api/v1/siem/export/health
 */
router.get('/health', async (req, res) => {
    res.json({
        status: 'healthy',
        service: 'siem-export',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});
exports.default = router;
