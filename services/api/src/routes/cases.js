"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.casesRouter = void 0;
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const auditLog_js_1 = require("../middleware/auditLog.js");
const postgres_js_1 = require("../db/postgres.js");
const cases = new Map();
exports.casesRouter = (0, express_1.Router)();
exports.casesRouter.post('/', (0, auth_js_1.requirePermission)('investigation:create'), async (req, res) => {
    const id = Math.random().toString(36).slice(2, 10);
    const c = {
        id,
        title: String(req.body?.title || 'Untitled'),
        status: 'draft',
        evidence: [],
    };
    try {
        if (process.env.USE_DB === 'true') {
            await postgres_js_1.postgresPool.insert('cases', {
                id,
                title: c.title,
                status: c.status,
            });
        }
        else {
            cases.set(id, c);
        }
        (0, auditLog_js_1.auditLog)(req, 'case.create', { id });
        res.json({ ok: true, case: c });
    }
    catch (e) {
        res.status(500).json({ ok: false, error: String(e) });
    }
});
exports.casesRouter.get('/:id', (0, auth_js_1.requirePermission)('investigation:read'), async (req, res) => {
    const id = req.params.id;
    try {
        let c = cases.get(id) || null;
        if (!c && process.env.USE_DB === 'true') {
            const row = await postgres_js_1.postgresPool.findOne('cases', { id });
            if (row)
                c = {
                    id: row.id,
                    title: row.title,
                    status: row.status,
                    evidence: [],
                };
        }
        if (!c)
            return res.status(404).json({ ok: false });
        res.json({ ok: true, case: c });
    }
    catch (e) {
        res.status(500).json({ ok: false, error: String(e) });
    }
});
exports.casesRouter.post('/:id/approve', (0, auth_js_1.requirePermission)('investigation:update'), async (req, res) => {
    const id = req.params.id;
    try {
        let c = cases.get(id) || null;
        if (process.env.USE_DB === 'true') {
            await postgres_js_1.postgresPool.update('cases', { status: 'approved' }, { id });
            const row = await postgres_js_1.postgresPool.findOne('cases', { id });
            if (row)
                c = {
                    id: row.id,
                    title: row.title,
                    status: row.status,
                    evidence: [],
                };
        }
        else if (c) {
            c.status = 'approved';
        }
        if (!c)
            return res.status(404).json({ ok: false });
        (0, auditLog_js_1.auditLog)(req, 'case.approve', { id: c.id });
        res.json({ ok: true, case: c });
    }
    catch (e) {
        res.status(500).json({ ok: false, error: String(e) });
    }
});
exports.casesRouter.get('/:id/export', (0, auth_js_1.requirePermission)('data:export'), (req, res) => {
    const c = cases.get(req.params.id);
    if (!c)
        return res.status(404).json({ ok: false });
    const bundle = {
        id: c.id,
        title: c.title,
        status: c.status,
        evidence: c.evidence,
        watermark: { ts: new Date().toISOString() },
    };
    (0, auditLog_js_1.auditLog)(req, 'case.export', { id: c.id });
    res.json({ ok: true, bundle });
});
