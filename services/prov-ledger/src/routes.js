"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = require("express");
const ledger_1 = require("./ledger");
const r = (0, express_1.Router)();
r.post('/ledger/evidence', async (req, res, next) => {
    try {
        const { sha256, contentType } = req.body;
        if (!sha256 || !contentType) {
            return res.status(400).json({ error: 'bad_request' });
        }
        const ev = await (0, ledger_1.addEvidence)(sha256, contentType);
        res.status(201).json(ev);
    }
    catch (e) {
        if (e?.message?.startsWith('invalid_')) {
            return res.status(400).json({ error: e.message });
        }
        next(e);
    }
});
r.post('/ledger/claim', async (req, res, next) => {
    try {
        const { evidenceIds, transformChain } = req.body;
        if (!Array.isArray(evidenceIds) || !Array.isArray(transformChain)) {
            return res.status(400).json({ error: 'bad_request' });
        }
        const c = await (0, ledger_1.addClaim)(evidenceIds, transformChain);
        res.status(201).json(c);
    }
    catch (e) {
        if (e?.message?.includes('required')) {
            return res.status(400).json({ error: e.message });
        }
        next(e);
    }
});
r.get('/ledger/export/:caseId', async (req, res, next) => {
    try {
        const b64 = await (0, ledger_1.exportManifest)(req.params.caseId);
        res.json({ manifest: b64 });
    }
    catch (e) {
        next(e);
    }
});
exports.default = r;
