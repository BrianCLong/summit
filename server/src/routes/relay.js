"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const queue_js_1 = require("../relay/queue.js");
const pg_1 = require("pg");
const auth_js_1 = require("../sites/auth.js");
const r = (0, express_1.Router)();
const pg = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
r.post('/poll', auth_js_1.verifySiteAuth, async (req, res) => {
    const siteId = req.siteId || req.body.siteId;
    const max = Number(req.body?.max || 50);
    const msgs = await (0, queue_js_1.poll)(siteId, max);
    res.json({ msgs });
});
r.post('/ack', auth_js_1.verifySiteAuth, async (req, res) => {
    const ids = (req.body?.dbIds || [])
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n));
    await (0, queue_js_1.ack)(ids);
    res.json({ ok: true });
});
r.post('/push', auth_js_1.verifySiteAuth, async (req, res) => {
    try {
        const siteId = req.siteId;
        const { ticketId, artifacts = [], logs = [], metrics = {}, } = req.body || {};
        if (!ticketId)
            return res.status(400).json({ error: 'ticketId required' });
        const { rows: [t], } = await pg.query(`SELECT status FROM remote_tickets WHERE ticket_id=$1 AND site_id=$2`, [ticketId, siteId]);
        if (t?.status === 'DONE')
            return res.json({ ok: true, idempotent: true });
        await pg.query(`UPDATE remote_tickets SET status='DONE', result=$1, completed_at=now() WHERE ticket_id=$2 AND site_id=$3`, [{ artifacts, logs, metrics }, ticketId, siteId]);
        await pg.query(`UPDATE sync_outbox SET status='ACK' WHERE ref=$1 AND site_id=$2 AND kind='exec.step'`, [ticketId, siteId]);
        res.json({ ok: true });
    }
    catch (e) {
        res.status(500).json({ error: e?.message || 'failed' });
    }
});
exports.default = r;
