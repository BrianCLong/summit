"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const crypto_1 = __importDefault(require("crypto"));
const logger_js_1 = __importDefault(require("../config/logger.js"));
const provenance_ledger_js_1 = require("../services/provenance-ledger.js");
const logger = logger_js_1.default.child({ name: 'route:n8n' });
const router = express_1.default.Router();
const secret = process.env.N8N_SIGNING_SECRET || '';
const allowedIps = (process.env.N8N_ALLOWED_IPS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
function timingSafeEqual(a, b) {
    try {
        return crypto_1.default.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    }
    catch {
        return false;
    }
}
function verifySig(raw, sig) {
    const mac = crypto_1.default.createHmac('sha256', secret).update(raw).digest('hex');
    return timingSafeEqual(mac, sig || '');
}
// Self-contained raw-body route: ensure raw payload for signature verification
router.post('/webhooks/n8n', express_1.default.raw({ type: '*/*', limit: '1mb' }), async (req, res) => {
    if (!secret)
        return res.status(503).json({ ok: false, error: 'n8n disabled' });
    const requestIp = req.ip || '';
    if (allowedIps.length && !allowedIps.includes(requestIp)) {
        return res.status(403).json({ ok: false, error: 'ip blocked' });
    }
    const sig = req.header('x-maestro-signature') || '';
    const raw = Buffer.isBuffer(req.body)
        ? req.body.toString()
        : req.rawBody?.toString() ||
            JSON.stringify(req.body || {});
    req.rawBody = raw;
    if (!verifySig(raw, sig))
        return res.status(401).json({ ok: false, error: 'bad signature' });
    const provenance = provenance_ledger_js_1.ProvenanceLedgerService.getInstance();
    let payload = {};
    try {
        payload = JSON.parse(raw || '{}');
    }
    catch {
        payload = {};
    }
    req.body = payload;
    const { runId, artifact, content, meta } = (payload || {});
    if (!runId)
        return res.status(400).json({ ok: false, error: 'runId required' });
    try {
        await provenance.recordProvenanceEntry({
            operation_type: 'N8N_CALLBACK',
            actor_id: 'n8n',
            metadata: {
                runId,
                artifact,
                meta,
                len: content ? JSON.stringify(content).length : 0,
            },
        });
    }
    catch (e) {
        logger.warn({ err: e }, 'provenance record failed for N8N_CALLBACK');
    }
    return res.json({ ok: true });
});
exports.default = router;
