"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evidenceRouter = void 0;
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const auditLog_js_1 = require("../middleware/auditLog.js");
const postgres_js_1 = require("../db/postgres.js");
const ann = {};
exports.evidenceRouter = (0, express_1.Router)();
exports.evidenceRouter.get('/:id/annotations', (0, auth_js_1.requirePermission)('investigation:read'), async (req, res) => {
    const eid = req.params.id;
    try {
        if (process.env.USE_DB === 'true') {
            const rows = await postgres_js_1.postgresPool.findMany('evidence_annotations', { evidence_id: eid }, { orderBy: 'created_at desc' });
            return res.json({
                items: rows.map((r) => ({
                    id: r.id,
                    range: r.range,
                    note: r.note,
                    author: r.author,
                })),
            });
        }
        res.json({ items: ann[eid] || [] });
    }
    catch (e) {
        res.status(500).json({ ok: false, error: String(e) });
    }
});
exports.evidenceRouter.post('/:id/annotations', (0, auth_js_1.requirePermission)('investigation:update'), async (req, res) => {
    const id = Math.random().toString(36).slice(2, 10);
    const evidenceId = req.params.id;
    const a = {
        id,
        range: String(req.body?.range || ''),
        note: String(req.body?.note || ''),
        author: req?.user?.email,
    };
    try {
        if (process.env.USE_DB === 'true') {
            await postgres_js_1.postgresPool.insert('evidence_annotations', {
                id,
                evidence_id: evidenceId,
                range: a.range,
                note: a.note,
                author: a.author,
            });
        }
        else {
            ann[evidenceId] = ann[evidenceId] || [];
            ann[evidenceId].push(a);
        }
        (0, auditLog_js_1.auditLog)(req, 'evidence.annotate', {
            evidence: evidenceId,
            annotation: a.id,
        });
        res.json({ ok: true, annotation: a });
    }
    catch (e) {
        res.status(500).json({ ok: false, error: String(e) });
    }
});
exports.evidenceRouter.get('/:id/pdf', (0, auth_js_1.requirePermission)('data:export'), (req, res) => {
    (0, auditLog_js_1.auditLog)(req, 'evidence.pdf.export', { id: req.params.id });
    res.json({ ok: true, url: `/downloads/${req.params.id}.pdf` });
});
