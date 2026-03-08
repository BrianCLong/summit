"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = __importDefault(require("express"));
const IngestionService_js_1 = require("../aurelius/services/IngestionService.js");
const InventionService_js_1 = require("../aurelius/services/InventionService.js");
const PriorArtService_js_1 = require("../aurelius/services/PriorArtService.js");
const CompetitiveIntelligenceService_js_1 = require("../aurelius/services/CompetitiveIntelligenceService.js");
const ForesightService_js_1 = require("../aurelius/services/ForesightService.js");
const auth_js_1 = require("../middleware/auth.js");
const tenantContext_js_1 = require("../middleware/tenantContext.js");
const router = express_1.default.Router();
router.use(auth_js_1.ensureAuthenticated);
router.use(tenantContext_js_1.tenantContext);
// --- IP Harvesting ---
router.post('/ingest/external', async (req, res) => {
    try {
        const { source, query } = req.body;
        const result = await IngestionService_js_1.IngestionService.getInstance().ingestExternal(source, query, req.user?.tenantId);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
});
// --- Prior Art ---
router.post('/prior-art/search', async (req, res) => {
    try {
        const { query } = req.body;
        const result = await PriorArtService_js_1.PriorArtService.getInstance().findSimilar(query, req.user?.tenantId);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
});
router.post('/prior-art/cluster', async (req, res) => {
    try {
        await PriorArtService_js_1.PriorArtService.getInstance().clusterPatents(req.user?.tenantId);
        res.json({ status: 'Clustering started' });
    }
    catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
});
// --- Invention Engine ---
router.post('/invention/generate', async (req, res) => {
    try {
        const { concepts, problem } = req.body;
        const result = await InventionService_js_1.InventionService.getInstance().generateInvention(concepts, problem, req.user?.tenantId);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
});
// --- Competitive Intelligence ---
router.get('/competitors/market-map', async (req, res) => {
    try {
        const result = await CompetitiveIntelligenceService_js_1.CompetitiveIntelligenceService.getInstance().getMarketMap(req.user?.tenantId);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
});
// --- Foresight ---
router.post('/foresight/simulate', async (req, res) => {
    try {
        const { scenarioName, parameters } = req.body;
        const result = await ForesightService_js_1.ForesightService.getInstance().runSimulation(scenarioName, parameters, req.user?.tenantId);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
});
router.post('/foresight/opportunities', async (req, res) => {
    try {
        await ForesightService_js_1.ForesightService.getInstance().generateOpportunities(req.user?.tenantId);
        res.json({ status: 'Opportunity mapping started' });
    }
    catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
});
exports.default = router;
