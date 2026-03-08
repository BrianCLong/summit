"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_js_1 = require("../../config/database.js");
const router = express_1.default.Router({ mergeParams: true });
// GET /api/maestro/v1/runs/:id/mcp/invocations
router.get('/runs/:id/mcp/invocations', async (req, res) => {
    try {
        const pool = (0, database_js_1.getPostgresPool)();
        const { rows } = await pool.query(`SELECT id, user_id, action, resource_type, resource_id, details, created_at
       FROM audit_logs
       WHERE action = 'mcp_invoke' AND resource_type = 'mcp' AND resource_id = $1
       ORDER BY created_at DESC
       LIMIT 100`, [req.params.id]);
        res.json(rows.map((r) => ({
            id: r.id,
            runId: r.resource_id,
            details: r.details,
            createdAt: r.created_at,
        })));
    }
    catch (err) {
        console.error('Failed to fetch invocations:', err);
        res.status(500).json({ error: 'failed_to_list_invocations' });
    }
});
exports.default = router;
