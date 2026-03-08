"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fcr_service_js_1 = require("../services/fcr/fcr-service.js");
const router = express_1.default.Router();
const fcrService = new fcr_service_js_1.FcrService();
router.post('/fcr/budget', express_1.default.json(), async (req, res) => {
    const { tenant_id: tenantId, epsilon, delta } = req.body || {};
    if (!tenantId || typeof epsilon !== 'number' || typeof delta !== 'number') {
        res.status(400).json({ error: 'tenant_id, epsilon, and delta are required.' });
        return;
    }
    fcrService.configureTenantBudget(tenantId, epsilon, delta);
    res.status(200).json({ ok: true });
});
router.post('/fcr/ingest', express_1.default.json(), async (req, res) => {
    const { tenant_id: tenantId, signals } = req.body || {};
    if (!tenantId || !Array.isArray(signals)) {
        res.status(400).json({ error: 'tenant_id and signals array are required.' });
        return;
    }
    const ingestResult = await fcrService.ingestSignals(tenantId, signals);
    if (!ingestResult.ok) {
        res.status(422).json({ ok: false, errors: ingestResult.errors });
        return;
    }
    res.status(200).json({ ok: true, signals: ingestResult.signals });
});
router.post('/fcr/run', express_1.default.json(), async (req, res) => {
    const { tenant_id: tenantId, signals } = req.body || {};
    if (!tenantId || !Array.isArray(signals)) {
        res.status(400).json({ error: 'tenant_id and signals array are required.' });
        return;
    }
    const result = await fcrService.runPipeline(tenantId, signals);
    if (!result.ok) {
        res.status(422).json({ ok: false, errors: result.errors });
        return;
    }
    res.status(200).json(result);
});
exports.default = router;
