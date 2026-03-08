"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const pg_1 = require("pg");
const metrics_js_1 = require("../monitoring/metrics.js");
const router = express_1.default.Router();
const pg = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
router.post('/event', express_1.default.json({ limit: '1mb' }), async (req, res) => {
    try {
        const { decision, policy, resource, details } = req.body || {};
        if (!decision)
            return res.status(400).json({ error: 'decision required' });
        await pg.query(`INSERT INTO admission_events(decision, policy, resource, details) VALUES ($1,$2,$3,$4)`, [decision, policy || null, resource || null, details || null]);
        metrics_js_1.admissionDecisionsTotal.inc({ decision, policy: policy || 'unknown' });
        res.status(202).json({ ok: true });
    }
    catch (e) {
        res.status(500).json({ error: e?.message || 'failed' });
    }
});
router.get('/stats', async (_req, res) => {
    const { rows } = await pg.query(`SELECT decision, policy, count(*) AS c FROM admission_events WHERE ts > now() - interval '24 hours' GROUP BY decision, policy ORDER BY c DESC`);
    res.json(rows);
});
exports.default = router;
