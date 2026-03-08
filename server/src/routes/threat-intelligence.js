"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ThreatIntelligenceFusionService_js_1 = require("../services/ThreatIntelligenceFusionService.js");
const auth_js_1 = require("../middleware/auth.js");
const router = express_1.default.Router();
const fusionService = ThreatIntelligenceFusionService_js_1.ThreatIntelligenceFusionService.getInstance();
/**
 * @route POST /api/threat-intel/ingest
 * @desc Ingest raw intelligence item
 * @access Protected
 */
router.post('/ingest', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const { item, type } = req.body;
        const result = await fusionService.ingestItem(item, type);
        res.json({ success: true, result });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route POST /api/threat-intel/relationship
 * @desc Create a relationship between two entities
 * @access Protected
 */
router.post('/relationship', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const { sourceId, targetId, type, props } = req.body;
        await fusionService.addRelationship(sourceId, targetId, type, props);
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route GET /api/threat-intel/dashboard
 * @desc Get aggregated dashboard data
 * @access Protected
 */
router.get('/dashboard', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const data = await fusionService.getDashboardData();
        res.json({ success: true, data });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route GET /api/threat-intel/briefing
 * @desc Generate and return daily briefing
 * @access Protected
 */
router.get('/briefing', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const briefing = await fusionService.generateBriefing();
        res.json({ success: true, briefing });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
