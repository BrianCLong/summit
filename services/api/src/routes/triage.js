"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.triageRouter = void 0;
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const auditLog_js_1 = require("../middleware/auditLog.js");
const postgres_js_1 = require("../db/postgres.js");
const queue = [];
exports.triageRouter = (0, express_1.Router)();
exports.triageRouter.get('/suggestions', (0, auth_js_1.requirePermission)('analytics:run'), async (_req, res) => {
    try {
        if (process.env.USE_DB === 'true') {
            const rows = await postgres_js_1.postgresPool.findMany('triage_suggestions', {}, { orderBy: 'created_at desc', limit: 200 });
            return res.json({ items: rows });
        }
        res.json({ items: queue });
    }
    catch (e) {
        res.status(500).json({ ok: false, error: String(e) });
    }
});
exports.triageRouter.post('/suggestions', (0, auth_js_1.requirePermission)('analytics:run'), async (req, res) => {
    const s = {
        id: Math.random().toString(36).slice(2, 10),
        type: req.body?.type || 'link',
        data: req.body?.data || {},
        status: 'new',
    };
    try {
        if (process.env.USE_DB === 'true') {
            await postgres_js_1.postgresPool.insert('triage_suggestions', {
                id: s.id,
                type: s.type,
                data: s.data,
                status: s.status,
            });
        }
        else {
            queue.push(s);
        }
        res.json({ ok: true, suggestion: s });
    }
    catch (e) {
        res.status(500).json({ ok: false, error: String(e) });
    }
});
exports.triageRouter.post('/suggestions/:id/approve', (0, auth_js_1.requirePermission)('analytics:run'), async (req, res) => {
    const id = req.params.id;
    try {
        let s = queue.find((x) => x.id === id) || null;
        if (process.env.USE_DB === 'true') {
            await postgres_js_1.postgresPool.update('triage_suggestions', { status: 'approved' }, { id });
            const row = await postgres_js_1.postgresPool.findOne('triage_suggestions', {
                id,
            });
            if (row)
                s = row;
        }
        else if (s)
            s.status = 'approved';
        if (!s)
            return res.status(404).json({ ok: false });
        (0, auditLog_js_1.auditLog)(req, 'triage.approve', { id });
        res.json({ ok: true, suggestion: s });
    }
    catch (e) {
        res.status(500).json({ ok: false, error: String(e) });
    }
});
exports.triageRouter.post('/suggestions/:id/materialize', (0, auth_js_1.requirePermission)('relationship:create'), async (req, res) => {
    const id = req.params.id;
    try {
        let s = queue.find((x) => x.id === id) || null;
        if (process.env.USE_DB === 'true') {
            await postgres_js_1.postgresPool.update('triage_suggestions', { status: 'materialized' }, { id });
            const row = await postgres_js_1.postgresPool.findOne('triage_suggestions', {
                id,
            });
            if (row)
                s = row;
        }
        else if (s)
            s.status = 'materialized';
        if (!s)
            return res.status(404).json({ ok: false });
        (0, auditLog_js_1.auditLog)(req, 'triage.materialize', { id });
        res.json({ ok: true, suggestion: s });
    }
    catch (e) {
        res.status(500).json({ ok: false, error: String(e) });
    }
});
