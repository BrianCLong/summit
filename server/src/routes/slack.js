"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const crypto_1 = __importDefault(require("crypto"));
const postgres_js_1 = require("../db/postgres.js");
const router = express_1.default.Router();
const SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET || '';
function verifySlackSignature(req, body) {
    const ts = req.headers['x-slack-request-timestamp'];
    const sig = req.headers['x-slack-signature'];
    if (!ts || !sig)
        return false;
    const base = `v0:${ts}:${body}`;
    const hmac = crypto_1.default
        .createHmac('sha256', SIGNING_SECRET)
        .update(base)
        .digest('hex');
    const expected = `v0=${hmac}`;
    try {
        return crypto_1.default.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
    }
    catch {
        return false;
    }
}
// Self-contained raw-body route: ensure we receive the raw payload before any global parsers
router.post('/webhooks/slack', express_1.default.raw({ type: '*/*', limit: '1mb' }), async (req, res) => {
    if (!SIGNING_SECRET)
        return res.status(503).send('slack disabled');
    const raw = Buffer.isBuffer(req.body)
        ? req.body.toString()
        : req.rawBody || '';
    // Preserve rawBody for downstream logic
    req.rawBody = raw;
    if (!verifySlackSignature(req, raw))
        return res.status(401).send('bad sig');
    // Parse JSON payload if present
    let payload = {};
    try {
        payload = JSON.parse(raw || '{}');
    }
    catch {
        payload = {};
    }
    req.body = payload;
    let data = payload;
    if (typeof payload === 'string' ||
        (payload?.payload && typeof payload.payload === 'string')) {
        try {
            data = JSON.parse(payload.payload || payload);
        }
        catch { }
    }
    const action = data?.actions?.[0];
    const val = action?.value || '';
    const [runId, stepId, verdict] = val.split('|');
    const ok = verdict === 'ok';
    const pool = (0, postgres_js_1.getPostgresPool)();
    const justification = `${ok ? 'approved' : 'declined'} via slack`;
    try {
        if (ok) {
            await pool.query('INSERT INTO run_event (run_id, kind, payload) VALUES ($1,$2,$3)', [runId, 'approval.approved', { stepId, justification }]);
            await pool.query('UPDATE run_step SET status=$1, blocked_reason=NULL WHERE run_id=$2 AND step_id=$3', ['RUNNING', runId, stepId]);
        }
        else {
            await pool.query('INSERT INTO run_event (run_id, kind, payload) VALUES ($1,$2,$3)', [runId, 'approval.declined', { stepId, justification }]);
            await pool.query('UPDATE run_step SET status=$1, blocked_reason=$2, ended_at=now() WHERE run_id=$3 AND step_id=$4', ['FAILED', `declined: ${justification}`, runId, stepId]);
            await pool.query('UPDATE run SET status=$1, ended_at=now() WHERE id=$2 AND status<>$1', ['FAILED', runId]);
        }
    }
    catch { }
    res.json({ ok: true });
});
exports.default = router;
