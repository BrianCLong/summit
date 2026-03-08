"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const PredictiveThreatService_js_1 = require("../services/PredictiveThreatService.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const http_param_js_1 = require("../utils/http-param.js");
const router = express_1.default.Router();
/**
 * GET /forecast/:signal
 * Get a forecast for a specific signal.
 * Query params:
 * - horizon: number of hours to forecast (default: 24)
 */
router.get('/forecast/:signal', async (req, res) => {
    try {
        const signal = (0, http_param_js_1.firstStringOr)(req.params.signal, '');
        const horizon = parseInt((0, http_param_js_1.firstString)(req.query.horizon) || '24') || 24;
        const result = await PredictiveThreatService_js_1.predictiveThreatService.forecastSignal(signal, horizon);
        res.json(result);
    }
    catch (error) {
        logger_js_1.default.error('Error fetching forecast:', error);
        // Handle known errors (like missing signal) with 404 or 400
        if (error instanceof Error && error.message.includes('No historical data')) {
            res.status(404).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});
/**
 * POST /simulate
 * Run a counterfactual simulation.
 * Body:
 * - signal: string
 * - action: string
 * - impactFactor: number (e.g. -0.2 for 20% reduction)
 */
router.post('/simulate', async (req, res) => {
    try {
        const { signal, action, impactFactor } = req.body;
        if (!signal || !action || impactFactor === undefined) {
            return res.status(400).json({ error: 'Missing required parameters: signal, action, impactFactor' });
        }
        const result = await PredictiveThreatService_js_1.predictiveThreatService.simulateCounterfactual(signal, {
            action,
            impactFactor
        });
        res.json(result);
    }
    catch (error) {
        logger_js_1.default.error('Error running simulation:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.default = router;
