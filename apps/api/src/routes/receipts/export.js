"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createExportRouter = createExportRouter;
const express_1 = require("express");
const bundleAssembler_1 = require("../../../../prov-ledger-service/src/export/bundleAssembler");
const security_js_1 = require("../../middleware/security.js");
function parsePayload(body) {
    const manifest = body.manifest;
    if (!manifest) {
        throw new Error('manifest_required');
    }
    return {
        manifest,
        receipts: body.receipts ?? [],
        policyDecisions: body.policyDecisions ?? [],
        redaction: body.redaction ?? undefined,
    };
}
function createExportRouter(rbacManager) {
    const router = (0, express_1.Router)();
    router.post('/receipts/export', (0, security_js_1.requirePermission)(rbacManager, 'receipts', 'read'), async (req, res) => {
        try {
            const payload = parsePayload(req.body);
            const { stream, metadata } = (0, bundleAssembler_1.assembleExportBundle)(payload);
            res.setHeader('Content-Type', 'application/gzip');
            res.setHeader('X-Redaction-Applied', metadata.redaction.applied ? 'true' : 'false');
            stream.pipe(res);
        }
        catch (error) {
            res.status(400).json({
                error: error instanceof Error ? error.message : 'export_failed',
            });
        }
    });
    return router;
}
exports.default = createExportRouter;
