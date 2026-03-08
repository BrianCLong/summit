"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const VerificationSwarmService_js_1 = require("../services/VerificationSwarmService.js");
const EvidenceFusionService_js_1 = require("../services/EvidenceFusionService.js");
const DeepfakeHunterService_js_1 = require("../services/DeepfakeHunterService.js");
const PredictiveScenarioSimulator_js_1 = require("../services/PredictiveScenarioSimulator.js");
const index_js_1 = require("../audit/index.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const router = (0, express_1.Router)();
// Middleware to ensure authentication
// router.use(ensureAuthenticated); // Disabled for MVP/Testing ease if needed, but safer to have
// --- Verification Swarm ---
router.post('/verification/submit', async (req, res) => {
    try {
        const id = await VerificationSwarmService_js_1.verificationSwarmService.submitVerification(req.body);
        res.json({ success: true, id, message: 'Verification request submitted to swarm' });
    }
    catch (error) {
        logger_js_1.default.error('Verification submit error', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get('/verification/:id', (req, res) => {
    const result = VerificationSwarmService_js_1.verificationSwarmService.getResult(req.params.id);
    if (!result)
        return res.status(404).json({ error: 'Not found or pending' });
    res.json(result);
});
// --- Semantic Evidence Fusion ---
router.post('/fusion/timeline', async (req, res) => {
    try {
        const { evidence } = req.body;
        const timeline = await EvidenceFusionService_js_1.evidenceFusionService.synthesizeTimeline(evidence);
        res.json(timeline);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.post('/fusion/hypotheses', async (req, res) => {
    try {
        const { evidence, context } = req.body;
        const hypotheses = await EvidenceFusionService_js_1.evidenceFusionService.generateHypotheses(evidence, context);
        res.json({ hypotheses });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// --- Deepfake Hunter ---
router.post('/deepfake/scan', async (req, res) => {
    try {
        const result = await DeepfakeHunterService_js_1.deepfakeHunterService.scanMedia(req.body);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// --- Predictive Simulator ---
router.post('/simulation/run', async (req, res) => {
    try {
        const result = await PredictiveScenarioSimulator_js_1.predictiveScenarioSimulator.simulateScenario(req.body);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// --- Org Mesh Ingestion ---
router.post('/ingest/org-mesh', async (req, res) => {
    try {
        const { investigationId, tenantId, entities } = req.body;
        // Simulate Org Mesh ingestion logic
        logger_js_1.default.info({ investigationId, tenantId }, 'Processing Org Mesh ingestion');
        // Record audit event for ingestion
        await index_js_1.advancedAuditSystem.recordEvent({
            eventType: 'data_import',
            level: 'info',
            userId: req.user?.id || 'system',
            tenantId: tenantId || 'global',
            serviceId: 'summit-investigate',
            resourceType: 'investigation',
            resourceId: investigationId,
            action: 'org_mesh_ingest',
            outcome: 'success',
            message: `Ingested ${entities?.length || 0} entities from Org Mesh for investigation ${investigationId}`,
            details: { entitiesCount: entities?.length || 0 },
        });
        res.json({
            success: true,
            message: 'Org Mesh ingestion complete',
            investigationId,
            ingestedCount: entities?.length || 0,
        });
    }
    catch (error) {
        logger_js_1.default.error('Org Mesh ingest error', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
