"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_js_1 = require("../config/database.js");
const PricingEngine_js_1 = __importDefault(require("../services/PricingEngine.js"));
const router = express_1.default.Router();
/**
 * GET /api/v1/usage/summary
 * Returns usage summary for the current tenant.
 */
router.get('/summary', async (req, res) => {
    try {
        const user = req.user;
        if (!user || !user.tenantId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const tenantId = user.tenantId;
        const { start, end } = req.query;
        const pool = (0, database_js_1.getPostgresPool)();
        const client = await pool.connect();
        // Default to current month if not specified
        const periodStart = start ? String(start) : new Date(new Date().setDate(1)).toISOString();
        const periodEnd = end ? String(end) : new Date().toISOString();
        try {
            const result = await client.query(`SELECT kind, SUM(quantity) as total_quantity, unit
             FROM usage_events
             WHERE tenant_id = $1
             AND occurred_at >= $2
             AND occurred_at <= $3
             GROUP BY kind, unit`, [tenantId, periodStart, periodEnd]);
            res.json({
                tenantId,
                periodStart,
                periodEnd,
                usage: result.rows.map((r) => ({
                    kind: r.kind,
                    total: parseFloat(r.total_quantity),
                    unit: r.unit
                }))
            });
        }
        finally {
            client.release();
        }
    }
    catch (e) {
        res.status(500).json({ error: e?.message || 'failed' });
    }
});
/**
 * GET /api/v1/usage/plans
 * Returns the current plan for the tenant.
 */
router.get('/plan', async (req, res) => {
    try {
        const user = req.user;
        if (!user || !user.tenantId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const { plan, overrides } = await PricingEngine_js_1.default.getEffectivePlan(user.tenantId);
        res.json({ plan, overrides });
    }
    catch (e) {
        res.status(500).json({ error: e?.message || 'failed' });
    }
});
// Legacy export route (kept for backward compatibility if needed, or repurposed)
router.get('/export', async (req, res) => {
    // ... existing implementation ...
    // For now returning 501 Not Implemented or just removing it if I'm confident.
    // I'll leave a stub.
    res.status(501).json({ message: "Use /summary instead" });
});
exports.default = router;
