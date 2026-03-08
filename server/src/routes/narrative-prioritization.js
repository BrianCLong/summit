"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const NarrativePrioritizationService_js_1 = require("../services/NarrativePrioritizationService.js");
const comprehensive_telemetry_js_1 = require("../lib/telemetry/comprehensive-telemetry.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const router = express_1.default.Router();
router.post('/prioritize', async (req, res) => {
    const start = Date.now();
    try {
        const { text, entities, source, metadata } = req.body;
        if (!text || !source) {
            return res.status(400).json({ error: 'Missing required fields: text, source' });
        }
        const result = await NarrativePrioritizationService_js_1.narrativePrioritizer.prioritize({
            text,
            entities: entities || [],
            source,
            metadata
        });
        // Record custom metrics for SLO tracking
        const duration = Date.now() - start;
        comprehensive_telemetry_js_1.telemetry.recordRequest(duration, {
            method: 'POST',
            route: '/api/narrative-prioritization/prioritize',
            status: 200
        });
        // We could add a custom histogram metric here if needed specifically for this service
        // e.g. narrative_prioritization_score
        res.json(result);
    }
    catch (error) {
        logger_js_1.default.error('Error in narrative prioritization endpoint:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
