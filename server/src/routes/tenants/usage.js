"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const database_js_1 = require("../../config/database.js");
const auth_js_1 = require("../../middleware/auth.js");
const request_schema_validator_js_1 = require("../../middleware/request-schema-validator.js");
const tenantValidator_js_1 = require("../../middleware/tenantValidator.js");
const PricingEngine_js_1 = __importDefault(require("../../services/PricingEngine.js"));
const http_param_js_1 = require("../../utils/http-param.js");
const router = (0, express_1.Router)({ mergeParams: true });
const querySchema = zod_1.z.object({
    from: zod_1.z.string().datetime().optional(),
    to: zod_1.z.string().datetime().optional(),
    dimension: zod_1.z.string().optional(),
    dimensions: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())]).optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(500).optional(),
});
const validateRequest = (0, request_schema_validator_js_1.buildRequestValidator)({
    zodSchema: querySchema,
    target: 'query',
    allowUnknown: true,
});
const enforceTenant = (req, res, next) => {
    try {
        const tenantId = (0, http_param_js_1.firstStringOr)(req.params.tenantId, '');
        const context = tenantValidator_js_1.TenantValidator.validateTenantAccess({ user: req.user }, tenantId, { validateOwnership: true });
        req.tenantContext = context;
        next();
    }
    catch (error) {
        const status = error?.extensions?.code === 'TENANT_REQUIRED' ? 401 : 403;
        res.status(status).json({
            error: 'tenant_access_denied',
            message: error?.message || 'Tenant access denied',
        });
    }
};
router.get('/', auth_js_1.ensureAuthenticated, validateRequest, enforceTenant, async (req, res) => {
    const pool = (0, database_js_1.getPostgresPool)();
    let client;
    try {
        client = await pool.connect();
    }
    catch (error) {
        return res.status(500).json({
            error: 'usage_rollup_failed',
            message: error?.message || 'Failed to acquire database connection',
        });
    }
    const tenantId = (0, http_param_js_1.firstStringOr)(req.params.tenantId, '');
    const { from, to, dimension, dimensions, limit } = req.query;
    const windowEnd = to ?? new Date().toISOString();
    const windowStart = from ??
        new Date(Date.parse(windowEnd) - 30 * 24 * 60 * 60 * 1000).toISOString();
    const params = [tenantId, windowStart, windowEnd];
    const predicates = ['tenant_id = $1', 'period_start >= $2', 'period_end <= $3'];
    let paramIndex = 4;
    const dimensionList = (Array.isArray(dimensions) ? dimensions : dimensions ? [dimensions] : [])
        .concat(dimension ? [dimension] : [])
        .filter(Boolean);
    if (dimensionList.length > 0) {
        predicates.push(`kind = ANY($${paramIndex++}::text[])`);
        params.push(dimensionList);
    }
    const effectiveLimit = limit ?? 100;
    const sql = `
    SELECT period_start, period_end, kind, total_quantity, unit, breakdown
    FROM usage_summaries
    WHERE ${predicates.join(' AND ')}
    ORDER BY period_start DESC, kind ASC
    LIMIT ${Number(effectiveLimit)}
  `;
    try {
        let plan = null;
        try {
            const pricing = await PricingEngine_js_1.default.getEffectivePlan(tenantId);
            plan = pricing?.plan || null;
        }
        catch (error) {
            plan = null;
        }
        const { rows } = await client.query(sql, params);
        const rollups = rows.map((row) => {
            const totalQuantity = Number(row.total_quantity ?? 0);
            const unitPrice = plan?.limits?.[row.kind]?.unitPrice || 0;
            const estimatedCost = totalQuantity * unitPrice;
            return {
                dimension: row.kind,
                periodStart: typeof row.period_start === 'string'
                    ? row.period_start
                    : row.period_start?.toISOString?.() || row.period_start,
                periodEnd: typeof row.period_end === 'string'
                    ? row.period_end
                    : row.period_end?.toISOString?.() || row.period_end,
                totalQuantity,
                unit: row.unit,
                breakdown: row.breakdown || {},
                estimatedCost,
            };
        });
        const totalEstimatedCost = rollups.reduce((sum, rollup) => sum + rollup.estimatedCost, 0);
        res.json({
            tenantId,
            window: { from: windowStart, to: windowEnd },
            rollups,
            totalEstimatedCost,
        });
    }
    catch (error) {
        res.status(500).json({
            error: 'usage_rollup_failed',
            message: error?.message || 'Failed to load usage rollups',
        });
    }
    finally {
        client.release();
    }
});
const buildCsv = (rows) => {
    const header = [
        'period_start',
        'period_end',
        'dimension',
        'total_quantity',
        'unit',
        'estimated_cost',
    ];
    const lines = rows.map(row => [
        row.periodStart,
        row.periodEnd,
        row.dimension,
        row.totalQuantity,
        row.unit ?? '',
        row.estimatedCost?.toFixed?.(4) ?? row.estimatedCost ?? 0,
    ]
        .map((value) => typeof value === 'string' && value.includes(',')
        ? `"${value.replace(/"/g, '""')}"`
        : value)
        .join(','));
    return [header.join(','), ...lines].join('\n');
};
router.get('/export.json', auth_js_1.ensureAuthenticated, validateRequest, enforceTenant, async (req, res) => {
    const pool = (0, database_js_1.getPostgresPool)();
    const tenantId = (0, http_param_js_1.firstStringOr)(req.params.tenantId, '');
    const { from, to, dimension, dimensions, limit } = req.query;
    const windowEnd = to ?? new Date().toISOString();
    const windowStart = from ??
        new Date(Date.parse(windowEnd) - 30 * 24 * 60 * 60 * 1000).toISOString();
    const params = [tenantId, windowStart, windowEnd];
    const predicates = ['tenant_id = $1', 'period_start >= $2', 'period_end <= $3'];
    let paramIndex = 4;
    const dimensionList = (Array.isArray(dimensions) ? dimensions : dimensions ? [dimensions] : [])
        .concat(dimension ? [dimension] : [])
        .filter(Boolean);
    if (dimensionList.length > 0) {
        predicates.push(`kind = ANY($${paramIndex++}::text[])`);
        params.push(dimensionList);
    }
    const effectiveLimit = limit ?? 500;
    const sql = `
      SELECT period_start, period_end, kind, total_quantity, unit, breakdown
      FROM usage_summaries
      WHERE ${predicates.join(' AND ')}
      ORDER BY period_start DESC, kind ASC
      LIMIT ${Number(effectiveLimit)}
    `;
    let client;
    try {
        client = await pool.connect();
        let plan = null;
        try {
            const pricing = await PricingEngine_js_1.default.getEffectivePlan(tenantId);
            plan = pricing?.plan || null;
        }
        catch (error) {
            plan = null;
        }
        const { rows } = await client.query(sql, params);
        const rollups = rows.map((row) => {
            const totalQuantity = Number(row.total_quantity ?? 0);
            const unitPrice = plan?.limits?.[row.kind]?.unitPrice || 0;
            const estimatedCost = totalQuantity * unitPrice;
            return {
                dimension: row.kind,
                periodStart: typeof row.period_start === 'string'
                    ? row.period_start
                    : row.period_start?.toISOString?.() || row.period_start,
                periodEnd: typeof row.period_end === 'string'
                    ? row.period_end
                    : row.period_end?.toISOString?.() || row.period_end,
                totalQuantity,
                unit: row.unit,
                breakdown: row.breakdown || {},
                estimatedCost,
            };
        });
        const payload = {
            tenantId,
            window: { from: windowStart, to: windowEnd },
            rollups,
        };
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="usage-${tenantId}.json"`);
        res.status(200).send(JSON.stringify(payload, null, 2));
    }
    catch (error) {
        res.status(500).json({
            error: 'usage_export_failed',
            message: error?.message || 'Failed to export usage rollups',
        });
    }
    finally {
        client?.release?.();
    }
});
router.get('/export.csv', auth_js_1.ensureAuthenticated, validateRequest, enforceTenant, async (req, res) => {
    const pool = (0, database_js_1.getPostgresPool)();
    const tenantId = (0, http_param_js_1.firstStringOr)(req.params.tenantId, '');
    const { from, to, dimension, dimensions, limit } = req.query;
    const windowEnd = to ?? new Date().toISOString();
    const windowStart = from ??
        new Date(Date.parse(windowEnd) - 30 * 24 * 60 * 60 * 1000).toISOString();
    const params = [tenantId, windowStart, windowEnd];
    const predicates = ['tenant_id = $1', 'period_start >= $2', 'period_end <= $3'];
    let paramIndex = 4;
    const dimensionList = (Array.isArray(dimensions) ? dimensions : dimensions ? [dimensions] : [])
        .concat(dimension ? [dimension] : [])
        .filter(Boolean);
    if (dimensionList.length > 0) {
        predicates.push(`kind = ANY($${paramIndex++}::text[])`);
        params.push(dimensionList);
    }
    const effectiveLimit = limit ?? 500;
    const sql = `
      SELECT period_start, period_end, kind, total_quantity, unit, breakdown
      FROM usage_summaries
      WHERE ${predicates.join(' AND ')}
      ORDER BY period_start DESC, kind ASC
      LIMIT ${Number(effectiveLimit)}
    `;
    let client;
    try {
        client = await pool.connect();
        let plan = null;
        try {
            const pricing = await PricingEngine_js_1.default.getEffectivePlan(tenantId);
            plan = pricing?.plan || null;
        }
        catch (error) {
            plan = null;
        }
        const { rows } = await client.query(sql, params);
        const rollups = rows.map((row) => {
            const totalQuantity = Number(row.total_quantity ?? 0);
            const unitPrice = plan?.limits?.[row.kind]?.unitPrice || 0;
            const estimatedCost = totalQuantity * unitPrice;
            return {
                dimension: row.kind,
                periodStart: typeof row.period_start === 'string'
                    ? row.period_start
                    : row.period_start?.toISOString?.() || row.period_start,
                periodEnd: typeof row.period_end === 'string'
                    ? row.period_end
                    : row.period_end?.toISOString?.() || row.period_end,
                totalQuantity,
                unit: row.unit,
                breakdown: row.breakdown || {},
                estimatedCost,
            };
        });
        const csv = buildCsv(rollups);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="usage-${tenantId}.csv"`);
        res.status(200).send(csv);
    }
    catch (error) {
        res.status(500).json({
            error: 'usage_export_failed',
            message: error?.message || 'Failed to export usage rollups',
        });
    }
    finally {
        client?.release?.();
    }
});
exports.default = router;
