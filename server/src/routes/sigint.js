"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = __importDefault(require("express"));
const SigIntManager_js_1 = require("../sigint/SigIntManager.js");
const zod_1 = require("zod");
const router = express_1.default.Router();
const sigIntManager = SigIntManager_js_1.SigIntManager.getInstance();
// Validation Schemas
const IngestSchema = zod_1.z.object({
    emitterId: zod_1.z.string().optional(),
    frequency: zod_1.z.number().min(1),
    bandwidth: zod_1.z.number().min(1),
    power: zod_1.z.number().max(0),
    snr: zod_1.z.number().optional(),
    duration: zod_1.z.number().optional(),
    protocol: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional()
});
/**
 * POST /sigint/ingest
 * Ingest a raw signal event for processing.
 */
router.post('/ingest', async (req, res) => {
    try {
        const validated = IngestSchema.parse(req.body);
        const result = await sigIntManager.processSignalEvent(validated);
        res.json({ success: true, signal: result });
    }
    catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid Input' });
    }
});
/**
 * GET /sigint/emitters
 * List active emitters detected by the system.
 */
router.get('/emitters', (req, res) => {
    const emitters = sigIntManager.getActiveEmitters();
    res.json({ count: emitters.length, emitters });
});
/**
 * GET /sigint/signals
 * Get recent raw signal logs.
 */
router.get('/signals', (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const signals = sigIntManager.getRecentSignals(limit);
    res.json({ count: signals.length, signals });
});
/**
 * POST /sigint/scan
 * Trigger a simulated spectrum scan.
 */
router.post('/scan', (req, res) => {
    const start = req.body.start ? Number(req.body.start) : 88e6;
    const stop = req.body.stop ? Number(req.body.stop) : 108e6;
    const scanResult = sigIntManager.performSpectrumScan(start, stop);
    res.json(scanResult);
});
exports.default = router;
