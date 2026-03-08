"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const pg_1 = require("pg");
const sync_js_1 = require("../gitops/sync.js");
const router = express_1.default.Router();
const pg = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
router.post('/sync', async (_req, res) => {
    try {
        const out = await (0, sync_js_1.syncRunbooks)();
        res.json(out);
    }
    catch (e) {
        res.status(500).json({ error: e?.message || 'failed' });
    }
});
router.get('/runbooks/:family/:name/versions', async (req, res) => {
    try {
        const { family, name } = req.params;
        const { rows } = await pg.query(`SELECT version FROM runbook_versions WHERE family=$1 AND name=$2 ORDER BY created_at DESC`, [family, name]);
        res.json(rows.map((r) => r.version));
    }
    catch (e) {
        res.status(500).json({ error: e?.message || 'failed' });
    }
});
exports.default = router;
