"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const postgres_js_1 = require("../../db/postgres.js");
const zod_1 = require("zod");
const otel_tracing_js_1 = require("../../middleware/observability/otel-tracing.js");
const router = (0, express_1.Router)();
// Schema for exception request
const ExceptionRequestSchema = zod_1.z.object({
    targetRegion: zod_1.z.string(),
    operation: zod_1.z.enum(['storage', 'compute', 'logs', 'backup']),
    justification: zod_1.z.string().min(10),
    durationMinutes: zod_1.z.number().min(5).max(1440), // Max 24 hours
});
/**
 * Request a residency exception.
 * Requires strict approval (mocked for now as auto-approve if valid, or just logged).
 */
router.post('/request', async (req, res) => {
    const span = otel_tracing_js_1.otelService.createSpan('residency.exception.request');
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(400).json({ error: 'Tenant context required' });
            return;
        }
        const body = ExceptionRequestSchema.parse(req.body);
        const pool = (0, postgres_js_1.getPostgresPool)();
        // 1. Log request
        // 2. Mock Approval Process (Auto-approve for demo/MVP if justification contains "EMERGENCY")
        // 3. Insert into exceptions table
        const isApproved = body.justification.includes('EMERGENCY');
        const expiresAt = new Date(Date.now() + body.durationMinutes * 60000);
        if (isApproved) {
            await pool.query(`INSERT INTO residency_exceptions
                (id, tenant_id, target_region, scope, justification, approved_by, expires_at, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`, [
                `exc-${Date.now()}`,
                tenantId,
                body.targetRegion,
                body.operation,
                body.justification,
                req.user?.sub || 'system',
                expiresAt
            ]);
            res.status(201).json({
                status: 'APPROVED',
                expiresAt,
                message: 'Emergency exception granted. This event has been logged for audit.'
            });
        }
        else {
            res.status(202).json({
                status: 'PENDING_APPROVAL',
                message: 'Exception request submitted for review.'
            });
        }
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: 'Validation Error', details: error.errors });
        }
        else {
            console.error(error);
            res.status(500).json({ error: 'Internal Error' });
        }
    }
    finally {
        span?.end();
    }
});
exports.default = router;
