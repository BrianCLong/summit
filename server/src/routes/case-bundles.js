"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const CaseBundleService_js_1 = require("../cases/bundles/CaseBundleService.js");
const FixtureCaseBundleStore_js_1 = require("../cases/bundles/FixtureCaseBundleStore.js");
const routeLogger = logger_js_1.default.child({ name: 'CaseBundleRoutes' });
function isCaseBundleEnabled() {
    return process.env.CASE_BUNDLE_V1 === '1';
}
const caseBundleRouter = (0, express_1.Router)();
caseBundleRouter.use((req, res, next) => {
    if (!isCaseBundleEnabled()) {
        return res.status(404).json({ error: 'case_bundle_v1_disabled' });
    }
    return next();
});
caseBundleRouter.post('/export', async (req, res) => {
    try {
        const { caseIds, include, format } = req.body || {};
        if (!Array.isArray(caseIds) || caseIds.length === 0) {
            return res.status(400).json({ error: 'case_ids_required' });
        }
        const service = new CaseBundleService_js_1.CaseBundleService(new FixtureCaseBundleStore_js_1.FixtureCaseBundleStore());
        const result = await service.exportCases(caseIds, { include, format });
        return res.json({
            ok: true,
            manifest: result.manifest,
            bundlePath: result.bundlePath,
            archivePath: result.archivePath,
        });
    }
    catch (error) {
        routeLogger.error({ err: error }, 'Failed to export case bundle');
        return res.status(500).json({ error: error.message });
    }
});
caseBundleRouter.post('/import', async (req, res) => {
    try {
        const { bundlePath, include, preserveIds, namespace } = req.body || {};
        if (!bundlePath) {
            return res.status(400).json({ error: 'bundle_path_required' });
        }
        const service = new CaseBundleService_js_1.CaseBundleService(new FixtureCaseBundleStore_js_1.FixtureCaseBundleStore());
        const result = await service.importBundle(bundlePath, {
            include,
            preserveIds,
            namespace,
        });
        return res.json({
            ok: true,
            manifest: result.manifest,
            mapping: result.mapping,
            mappingPath: result.mappingPath,
            bundlePath: result.bundlePath,
        });
    }
    catch (error) {
        routeLogger.error({ err: error }, 'Failed to import case bundle');
        return res.status(500).json({ error: error.message });
    }
});
exports.default = caseBundleRouter;
