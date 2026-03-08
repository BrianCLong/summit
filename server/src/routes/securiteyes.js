"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = __importDefault(require("express"));
const SecuriteyesService_js_1 = require("../services/SecuriteyesService.js");
const DetectionEngine_js_1 = require("../services/DetectionEngine.js");
const IncidentManager_js_1 = require("../services/IncidentManager.js");
const IngestionService_js_1 = require("../services/IngestionService.js");
const RiskManager_js_1 = require("../services/RiskManager.js");
const PlaybookManager_js_1 = require("../services/PlaybookManager.js");
const auth_js_1 = require("../../middleware/auth.js");
const router = express_1.default.Router();
const securiteyes = SecuriteyesService_js_1.SecuriteyesService.getInstance();
const ingestion = IngestionService_js_1.IngestionService.getInstance();
const detection = DetectionEngine_js_1.DetectionEngine.getInstance();
const incidents = IncidentManager_js_1.IncidentManager.getInstance();
const riskManager = RiskManager_js_1.RiskManager.getInstance();
const playbookManager = PlaybookManager_js_1.PlaybookManager.getInstance();
router.use(auth_js_1.ensureAuthenticated);
// --- Ingestion ---
router.post('/events', async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(403).json({ error: 'Missing tenant context' });
            return;
        }
        const signal = {
            ...req.body,
            tenantId,
            timestamp: req.body.timestamp || new Date().toISOString()
        };
        const event = await ingestion.ingestInternalSignal(signal);
        // Async detection trigger
        // Also update risk if event created
        detection.evaluateSignal(signal, tenantId).then(async () => {
            if (event && req.body.principalId) {
                await riskManager.updateRiskForEvent(req.body.principalId, tenantId, event);
            }
        }).catch(err => console.error(err));
        res.status(201).json(event);
    }
    catch (error) {
        console.error('Ingestion error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// --- Dashboard / Overview ---
router.get('/dashboard/stats', async (req, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
        res.status(403).send();
        return;
    }
    const activeIncidents = await securiteyes.getActiveIncidents(tenantId);
    const recentEvents = await securiteyes.getRecentSuspiciousEvents(tenantId, 10);
    const highRiskUsers = await riskManager.getHighRiskProfiles(tenantId);
    res.json({
        activeIncidentsCount: activeIncidents.length,
        recentEventsCount: recentEvents.length,
        highRiskCount: highRiskUsers.length,
        activeIncidents,
        recentEvents
    });
});
// --- Entities ---
router.get('/campaigns', async (req, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
        res.status(403).send();
        return;
    }
    const campaigns = await securiteyes.getCampaigns(tenantId);
    res.json(campaigns);
});
router.get('/actors', async (req, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
        res.status(403).send();
        return;
    }
    const actors = await securiteyes.getThreatActors(tenantId);
    res.json(actors);
});
router.get('/incidents', async (req, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
        res.status(403).send();
        return;
    }
    const list = await securiteyes.getActiveIncidents(tenantId);
    res.json(list);
});
router.post('/incidents/:id/evidence', async (req, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
        res.status(403).send();
        return;
    }
    const bundle = await incidents.generateEvidenceBundle(req.params.id, tenantId);
    res.json(bundle);
});
// --- Risk ---
router.get('/risk/profiles/:principalId', async (req, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
        res.status(403).send();
        return;
    }
    const profile = await riskManager.getRiskProfile(req.params.principalId, tenantId);
    res.json(profile);
});
router.get('/risk/high', async (req, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
        res.status(403).send();
        return;
    }
    const profiles = await riskManager.getHighRiskProfiles(tenantId);
    res.json(profiles);
});
// --- Playbooks ---
router.get('/playbooks', async (req, res) => {
    res.json(playbookManager.getPlaybooks());
});
router.post('/playbooks/:id/execute', async (req, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
        res.status(403).send();
        return;
    }
    try {
        const result = await playbookManager.executePlaybook(req.params.id, req.body.context || {}, tenantId);
        res.json(result);
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
});
// --- Deception Assets ---
router.post('/deception-assets', async (req, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
        res.status(403).send();
        return;
    }
    const asset = await securiteyes.createDeceptionAsset({
        ...req.body,
        tenantId,
        triggered: false
    });
    res.json(asset);
});
// --- Jobs ---
router.post('/jobs/run-graph-detection', async (req, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
        res.status(403).send();
        return;
    }
    // In a real system this would trigger an async job, but we'll await it for the "job runner" endpoint
    await detection.runGraphDetections(tenantId);
    res.json({ status: 'completed' });
});
exports.default = router;
